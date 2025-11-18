import PromiseThrottle from 'promise-throttle';

var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
class JSONRPCError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.isInvalidError = true;
  }
}
let counter = 0;
function ethereum_request(endpoint, req) {
  return __async(this, null, function* () {
    const { method, params } = req;
    if (method === "eth_batch") {
      if (params && params.length === 0) {
        return [];
      }
      const requests = [];
      for (const param of params) {
        requests.push({
          id: ++counter,
          jsonrpc: "2.0",
          method: param.method,
          params: param.params || []
        });
      }
      let response2;
      try {
        response2 = yield fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requests)
        });
      } catch (fetchError) {
        throw new JSONRPCError(`Failed To Batch Fetch at ${endpoint}`, fetchError);
      }
      if (response2.status != 200) {
        throw new JSONRPCError(
          `Failed To Batch Fetch (Status = ${response2.status}) at ${endpoint}`,
          new Error(`status: ${response2.status}`)
        );
      }
      let jsonArray;
      try {
        jsonArray = yield response2.json();
      } catch (parsingError) {
        throw new JSONRPCError("Failed To Batch parse response as json", parsingError);
      }
      let hasError = false;
      for (const response3 of jsonArray) {
        if (response3.error || !response3.result) {
          hasError = true;
        }
      }
      if (hasError) {
        throw jsonArray;
      }
      return jsonArray.map((v) => v.result);
    }
    let response;
    try {
      response = yield fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ++counter,
          jsonrpc: "2.0",
          method,
          params: params || []
        })
      });
    } catch (fetchError) {
      throw new JSONRPCError(`Failed To Fetch at ${endpoint} (method: ${method})`, fetchError);
    }
    if (response.status != 200) {
      throw new JSONRPCError(
        `Failed To Fetch (status = ${response.status}) at ${endpoint} (method: ${method})`,
        new Error(`status: ${response.status}`)
      );
    }
    let json;
    try {
      json = yield response.json();
    } catch (parsingError) {
      throw new JSONRPCError("Failed To parse response json", parsingError);
    }
    if (json.error || !json.result) {
      throw json.error || { code: 5e3, message: "No Result" };
    }
    return json.result;
  });
}
class JSONRPCHTTPProvider {
  constructor(endpoint, options) {
    this.endpoint = endpoint;
    this.supportsETHBatch = true;
    if (options == null ? void 0 : options.requestsPerSecond) {
      this.promiseThrottle = new PromiseThrottle({
        requestsPerSecond: options.requestsPerSecond,
        promiseImplementation: Promise
      });
    }
  }
  request(args) {
    if (this.promiseThrottle) {
      return this.promiseThrottle.add(ethereum_request.bind(null, this.endpoint, args));
    } else {
      return ethereum_request(this.endpoint, args);
    }
  }
}

export { JSONRPCError, JSONRPCHTTPProvider, ethereum_request };
