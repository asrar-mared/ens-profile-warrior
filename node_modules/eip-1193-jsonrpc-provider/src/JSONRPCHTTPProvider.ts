import {EIP1193ProviderWithoutEvents} from 'eip-1193';
import PromiseThrottle from 'promise-throttle';

export class JSONRPCError extends Error {
	public readonly isInvalidError = true;
	constructor(
		message: string,
		public cause: Error,
	) {
		super(message);
	}
}

let counter = 0;
export async function ethereum_request<U extends any, T>(
	endpoint: string,
	req: {method: string; params?: U},
): Promise<T> {
	const {method, params} = req;
	// NOTE: special case to allow batch request via EIP-1193
	if (method === 'eth_batch') {
		if (params && (params as any[]).length === 0) {
			return [] as unknown as T;
		}
		const requests = [];
		for (const param of params as {method: string; params?: any[]}[]) {
			requests.push({
				id: ++counter,
				jsonrpc: '2.0',
				method: param.method,
				params: param.params || [],
			});
		}

		let response: Response;
		try {
			response = await fetch(endpoint, {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(requests),
			});
		} catch (fetchError) {
			throw new JSONRPCError(`Failed To Batch Fetch at ${endpoint}`, fetchError);
		}

		if (response.status != 200) {
			throw new JSONRPCError(
				`Failed To Batch Fetch (Status = ${response.status}) at ${endpoint}`,
				new Error(`status: ${response.status}`),
			);
		}

		let jsonArray: {result?: T; error?: any}[];
		try {
			jsonArray = await response.json();
		} catch (parsingError) {
			throw new JSONRPCError('Failed To Batch parse response as json', parsingError);
		}

		let hasError = false;
		for (const response of jsonArray) {
			if (response.error || !response.result) {
				hasError = true;
			}
		}

		if (hasError) {
			throw jsonArray;
		}

		return jsonArray.map((v) => v.result) as unknown as T;
	}
	let response: Response;
	try {
		response = await fetch(endpoint, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({
				id: ++counter,
				jsonrpc: '2.0',
				method,
				params: params || [],
			}),
		});
	} catch (fetchError) {
		throw new JSONRPCError(`Failed To Fetch at ${endpoint} (method: ${method})`, fetchError);
	}

	if (response.status != 200) {
		throw new JSONRPCError(
			`Failed To Fetch (status = ${response.status}) at ${endpoint} (method: ${method})`,
			new Error(`status: ${response.status}`),
		);
	}
	let json: {result?: T; error?: any};
	try {
		json = await response.json();
	} catch (parsingError) {
		throw new JSONRPCError('Failed To parse response json', parsingError);
	}

	if (json.error || !json.result) {
		throw json.error || {code: 5000, message: 'No Result'};
	}
	return json.result;
}

export class JSONRPCHTTPProvider implements EIP1193ProviderWithoutEvents {
	supportsETHBatch = true;
	private promiseThrottle: PromiseThrottle | undefined;
	constructor(
		protected endpoint: string,
		options?: {requestsPerSecond?: number},
	) {
		if (options?.requestsPerSecond) {
			this.promiseThrottle = new PromiseThrottle({
				requestsPerSecond: options.requestsPerSecond,
				promiseImplementation: Promise,
			});
		}
	}

	request(args: {method: string; params?: any}): Promise<any>;
	request<T, U extends any = any>(args: {method: string; params: U}): Promise<T> {
		if (this.promiseThrottle) {
			return this.promiseThrottle.add(ethereum_request.bind(null, this.endpoint, args));
		} else {
			return ethereum_request<U, T>(this.endpoint, args);
		}
	}
}
