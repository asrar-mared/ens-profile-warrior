// src/formats.ts
function _instanceof(left, right) {
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
function _type_of(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
}
var default_format = "RFC3986";
var formatters = {
    RFC1738: function(v) {
        return String(v).replace(/%20/g, "+");
    },
    RFC3986: function(v) {
        return String(v);
    }
};
var RFC1738 = "RFC1738";
var RFC3986 = "RFC3986";
// src/utils.ts
var has = Object.prototype.hasOwnProperty;
var is_array = Array.isArray;
var hex_table = function() {
    var array = [];
    for(var i = 0; i < 256; ++i){
        array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
    }
    return array;
}();
function compact_queue(queue) {
    while(queue.length > 1){
        var item = queue.pop();
        if (!item) continue;
        var obj = item.obj[item.prop];
        if (is_array(obj)) {
            var compacted = [];
            for(var j = 0; j < obj.length; ++j){
                if (typeof obj[j] !== "undefined") {
                    compacted.push(obj[j]);
                }
            }
            item.obj[item.prop] = compacted;
        }
    }
}
function array_to_object(source, options) {
    var obj = options && options.plainObjects ? /* @__PURE__ */ Object.create(null) : {};
    for(var i = 0; i < source.length; ++i){
        if (typeof source[i] !== "undefined") {
            obj[i] = source[i];
        }
    }
    return obj;
}
function merge(target, source) {
    var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    if (!source) {
        return target;
    }
    if ((typeof source === "undefined" ? "undefined" : _type_of(source)) !== "object") {
        if (is_array(target)) {
            target.push(source);
        } else if (target && (typeof target === "undefined" ? "undefined" : _type_of(target)) === "object") {
            if (options && (options.plainObjects || options.allowPrototypes) || !has.call(Object.prototype, source)) {
                target[source] = true;
            }
        } else {
            return [
                target,
                source
            ];
        }
        return target;
    }
    if (!target || (typeof target === "undefined" ? "undefined" : _type_of(target)) !== "object") {
        return [
            target
        ].concat(source);
    }
    var mergeTarget = target;
    if (is_array(target) && !is_array(source)) {
        mergeTarget = array_to_object(target, options);
    }
    if (is_array(target) && is_array(source)) {
        source.forEach(function(item, i) {
            if (has.call(target, i)) {
                var targetItem = target[i];
                if (targetItem && (typeof targetItem === "undefined" ? "undefined" : _type_of(targetItem)) === "object" && item && (typeof item === "undefined" ? "undefined" : _type_of(item)) === "object") {
                    target[i] = merge(targetItem, item, options);
                } else {
                    target.push(item);
                }
            } else {
                target[i] = item;
            }
        });
        return target;
    }
    return Object.keys(source).reduce(function(acc, key) {
        var value = source[key];
        if (has.call(acc, key)) {
            acc[key] = merge(acc[key], value, options);
        } else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
}
function decode(str, _, charset) {
    var strWithoutPlus = str.replace(/\+/g, " ");
    if (charset === "iso-8859-1") {
        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
    }
    try {
        return decodeURIComponent(strWithoutPlus);
    } catch (e) {
        return strWithoutPlus;
    }
}
var limit = 1024;
var encode = function(str, _defaultEncoder, charset, _kind, format) {
    if (str.length === 0) {
        return str;
    }
    var string = str;
    if ((typeof str === "undefined" ? "undefined" : _type_of(str)) === "symbol") {
        string = Symbol.prototype.toString.call(str);
    } else if (typeof str !== "string") {
        string = String(str);
    }
    if (charset === "iso-8859-1") {
        return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
            return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
        });
    }
    var out = "";
    for(var j = 0; j < string.length; j += limit){
        var segment = string.length >= limit ? string.slice(j, j + limit) : string;
        var arr = [];
        for(var i = 0; i < segment.length; ++i){
            var c = segment.charCodeAt(i);
            if (c === 45 || // -
            c === 46 || // .
            c === 95 || // _
            c === 126 || // ~
            c >= 48 && c <= 57 || // 0-9
            c >= 65 && c <= 90 || // a-z
            c >= 97 && c <= 122 || // A-Z
            format === RFC1738 && (c === 40 || c === 41)) {
                arr[arr.length] = segment.charAt(i);
                continue;
            }
            if (c < 128) {
                arr[arr.length] = hex_table[c];
                continue;
            }
            if (c < 2048) {
                arr[arr.length] = hex_table[192 | c >> 6] + hex_table[128 | c & 63];
                continue;
            }
            if (c < 55296 || c >= 57344) {
                arr[arr.length] = hex_table[224 | c >> 12] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
                continue;
            }
            i += 1;
            c = 65536 + ((c & 1023) << 10 | segment.charCodeAt(i) & 1023);
            arr[arr.length] = hex_table[240 | c >> 18] + hex_table[128 | c >> 12 & 63] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
        }
        out += arr.join("");
    }
    return out;
};
function compact(value) {
    var queue = [
        {
            obj: {
                o: value
            },
            prop: "o"
        }
    ];
    var refs = [];
    for(var i = 0; i < queue.length; ++i){
        var item = queue[i];
        var obj = item.obj[item.prop];
        var keys = Object.keys(obj);
        for(var j = 0; j < keys.length; ++j){
            var key = keys[j];
            var val = obj[key];
            if ((typeof val === "undefined" ? "undefined" : _type_of(val)) === "object" && val !== null && refs.indexOf(val) === -1) {
                queue.push({
                    obj: obj,
                    prop: key
                });
                refs.push(val);
            }
        }
    }
    compact_queue(queue);
    return value;
}
function is_regexp(obj) {
    return Object.prototype.toString.call(obj) === "[object RegExp]";
}
function is_buffer(obj) {
    if (!obj || (typeof obj === "undefined" ? "undefined" : _type_of(obj)) !== "object") {
        return false;
    }
    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
function combine(a, b) {
    return [].concat(a, b);
}
function maybe_map(val, fn) {
    if (is_array(val)) {
        var mapped = [];
        for(var i = 0; i < val.length; i += 1){
            mapped.push(fn(val[i]));
        }
        return mapped;
    }
    return fn(val);
}
// src/parse.ts
var has2 = Object.prototype.hasOwnProperty;
var isArray = Array.isArray;
var defaults = {
    allowDots: false,
    allowEmptyArrays: false,
    allowPrototypes: false,
    allowSparse: false,
    arrayLimit: 20,
    charset: "utf-8",
    charsetSentinel: false,
    comma: false,
    decodeDotInKeys: false,
    decoder: decode,
    delimiter: "&",
    depth: 5,
    duplicates: "combine",
    ignoreQueryPrefix: false,
    interpretNumericEntities: false,
    parameterLimit: 1e3,
    parseArrays: true,
    plainObjects: false,
    strictDepth: false,
    strictNullHandling: false
};
function interpret_numeric_entities(str) {
    return str.replace(/&#(\d+);/g, function(_, numberStr) {
        return String.fromCharCode(parseInt(numberStr, 10));
    });
}
function parse_array_value(val, options) {
    if (val && typeof val === "string" && options.comma && val.indexOf(",") > -1) {
        return val.split(",");
    }
    return val;
}
var iso_sentinel = "utf8=%26%2310003%3B";
var charset_sentinel = "utf8=%E2%9C%93";
function parse_values(str, options) {
    var obj = {
        __proto__: null
    };
    var clean_str = options.ignoreQueryPrefix ? str.replace(/^\?/, "") : str;
    clean_str = clean_str.replace(/%5B/gi, "[").replace(/%5D/gi, "]");
    var limit2 = options.parameterLimit === Infinity ? void 0 : options.parameterLimit;
    var parts = clean_str.split(options.delimiter, limit2);
    var skip_index = -1;
    var i;
    var charset = options.charset;
    if (options.charsetSentinel) {
        for(i = 0; i < parts.length; ++i){
            if (parts[i].indexOf("utf8=") === 0) {
                if (parts[i] === charset_sentinel) {
                    charset = "utf-8";
                } else if (parts[i] === iso_sentinel) {
                    charset = "iso-8859-1";
                }
                skip_index = i;
                i = parts.length;
            }
        }
    }
    for(i = 0; i < parts.length; ++i){
        if (i === skip_index) {
            continue;
        }
        var part = parts[i];
        var bracket_equals_pos = part.indexOf("]=");
        var pos = bracket_equals_pos === -1 ? part.indexOf("=") : bracket_equals_pos + 1;
        var key = void 0, val = void 0;
        if (pos === -1) {
            key = options.decoder(part, defaults.decoder, charset, "key");
            val = options.strictNullHandling ? null : "";
        } else {
            key = options.decoder(part.slice(0, pos), defaults.decoder, charset, "key");
            val = maybe_map(parse_array_value(part.slice(pos + 1), options), function(encodedVal) {
                return options.decoder(encodedVal, defaults.decoder, charset, "value");
            });
        }
        if (val && options.interpretNumericEntities && charset === "iso-8859-1") {
            val = interpret_numeric_entities(val);
        }
        if (part.indexOf("[]=") > -1) {
            val = isArray(val) ? [
                val
            ] : val;
        }
        var existing = has2.call(obj, key);
        if (existing && options.duplicates === "combine") {
            obj[key] = combine(obj[key], val);
        } else if (!existing || options.duplicates === "last") {
            obj[key] = val;
        }
    }
    return obj;
}
function parse_object(chain, val, options, values_parsed) {
    var leaf = values_parsed ? val : parse_array_value(val, options);
    for(var i = chain.length - 1; i >= 0; --i){
        var obj = void 0;
        var root = chain[i];
        if (root === "[]" && options.parseArrays) {
            obj = options.allowEmptyArrays && (leaf === "" || options.strictNullHandling && leaf === null) ? [] : [].concat(leaf);
        } else {
            obj = options.plainObjects ? /* @__PURE__ */ Object.create(null) : {};
            var clean_root = root.charAt(0) === "[" && root.charAt(root.length - 1) === "]" ? root.slice(1, -1) : root;
            var decoded_root = options.decodeDotInKeys ? clean_root.replace(/%2E/g, ".") : clean_root;
            var index = parseInt(decoded_root, 10);
            if (!options.parseArrays && decoded_root === "") {
                obj = {
                    0: leaf
                };
            } else if (!isNaN(index) && root !== decoded_root && String(index) === decoded_root && index >= 0 && options.parseArrays && index <= options.arrayLimit) {
                obj = [];
                obj[index] = leaf;
            } else if (decoded_root !== "__proto__") {
                obj[decoded_root] = leaf;
            }
        }
        leaf = obj;
    }
    return leaf;
}
function parseKeys(given_key, val, options, values_parsed) {
    if (!given_key) {
        return;
    }
    var key = options.allowDots ? given_key.replace(/\.([^.[]+)/g, "[$1]") : given_key;
    var brackets = /(\[[^[\]]*])/;
    var child = /(\[[^[\]]*])/g;
    var segment = +options.depth > 0 && brackets.exec(key);
    var parent = segment ? key.slice(0, segment.index) : key;
    var keys = [];
    if (parent) {
        if (!options.plainObjects && has2.call(Object.prototype, parent)) {
            if (!options.allowPrototypes) {
                return;
            }
        }
        keys.push(parent);
    }
    var i = 0;
    while(+options.depth > 0 && (segment = child.exec(key)) !== null && i < +options.depth){
        i += 1;
        if (!options.plainObjects && has2.call(Object.prototype, segment[1].slice(1, -1))) {
            if (!options.allowPrototypes) {
                return;
            }
        }
        keys.push(segment[1]);
    }
    if (segment) {
        if (options.strictDepth) {
            throw new RangeError("Input depth exceeded depth option of " + options.depth + " and strictDepth is true");
        }
        keys.push("[" + key.slice(segment.index) + "]");
    }
    return parse_object(keys, val, options, values_parsed);
}
function normalize_parse_options(opts) {
    if (!opts) {
        return defaults;
    }
    if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") {
        throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
    }
    if (typeof opts.decodeDotInKeys !== "undefined" && typeof opts.decodeDotInKeys !== "boolean") {
        throw new TypeError("`decodeDotInKeys` option can only be `true` or `false`, when provided");
    }
    if (opts.decoder !== null && typeof opts.decoder !== "undefined" && typeof opts.decoder !== "function") {
        throw new TypeError("Decoder has to be a function.");
    }
    if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") {
        throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
    }
    var charset = typeof opts.charset === "undefined" ? defaults.charset : opts.charset;
    var duplicates = typeof opts.duplicates === "undefined" ? defaults.duplicates : opts.duplicates;
    if (duplicates !== "combine" && duplicates !== "first" && duplicates !== "last") {
        throw new TypeError("The duplicates option must be either combine, first, or last");
    }
    var allow_dots = typeof opts.allowDots === "undefined" ? opts.decodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;
    return {
        allowDots: allow_dots,
        allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
        allowPrototypes: typeof opts.allowPrototypes === "boolean" ? opts.allowPrototypes : defaults.allowPrototypes,
        allowSparse: typeof opts.allowSparse === "boolean" ? opts.allowSparse : defaults.allowSparse,
        arrayLimit: typeof opts.arrayLimit === "number" ? opts.arrayLimit : defaults.arrayLimit,
        charset: charset,
        charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults.charsetSentinel,
        comma: typeof opts.comma === "boolean" ? opts.comma : defaults.comma,
        decodeDotInKeys: typeof opts.decodeDotInKeys === "boolean" ? opts.decodeDotInKeys : defaults.decodeDotInKeys,
        decoder: typeof opts.decoder === "function" ? opts.decoder : defaults.decoder,
        delimiter: typeof opts.delimiter === "string" || is_regexp(opts.delimiter) ? opts.delimiter : defaults.delimiter,
        // eslint-disable-next-line no-implicit-coercion, no-extra-parens
        depth: typeof opts.depth === "number" || opts.depth === false ? +opts.depth : defaults.depth,
        duplicates: duplicates,
        ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
        interpretNumericEntities: typeof opts.interpretNumericEntities === "boolean" ? opts.interpretNumericEntities : defaults.interpretNumericEntities,
        parameterLimit: typeof opts.parameterLimit === "number" ? opts.parameterLimit : defaults.parameterLimit,
        parseArrays: opts.parseArrays !== false,
        plainObjects: typeof opts.plainObjects === "boolean" ? opts.plainObjects : defaults.plainObjects,
        strictDepth: typeof opts.strictDepth === "boolean" ? !!opts.strictDepth : defaults.strictDepth,
        strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults.strictNullHandling
    };
}
function parse(str) {
    var opts = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    var options = normalize_parse_options(opts);
    if (str === "" || str === null || typeof str === "undefined") {
        return options.plainObjects ? /* @__PURE__ */ Object.create(null) : {};
    }
    var temp_obj = typeof str === "string" ? parse_values(str, options) : str;
    var obj = options.plainObjects ? /* @__PURE__ */ Object.create(null) : {};
    var keys = Object.keys(temp_obj);
    for(var i = 0; i < keys.length; ++i){
        var key = keys[i];
        var newObj = parseKeys(key, temp_obj[key], options, typeof str === "string");
        obj = merge(obj, newObj, options);
    }
    if (options.allowSparse === true) {
        return obj;
    }
    return compact(obj);
}
// src/stringify.ts
var has3 = Object.prototype.hasOwnProperty;
var array_prefix_generators = {
    brackets: function brackets(prefix) {
        return String(prefix) + "[]";
    },
    comma: "comma",
    indices: function indices(prefix, key) {
        return String(prefix) + "[" + key + "]";
    },
    repeat: function repeat(prefix) {
        return String(prefix);
    }
};
var is_array2 = Array.isArray;
var push = Array.prototype.push;
var push_to_array = function push_to_array(arr, value_or_array) {
    push.apply(arr, is_array2(value_or_array) ? value_or_array : [
        value_or_array
    ]);
};
var to_ISO = Date.prototype.toISOString;
var defaults2 = {
    addQueryPrefix: false,
    allowDots: false,
    allowEmptyArrays: false,
    arrayFormat: "indices",
    charset: "utf-8",
    charsetSentinel: false,
    delimiter: "&",
    encode: true,
    encodeDotInKeys: false,
    encoder: encode,
    encodeValuesOnly: false,
    format: default_format,
    formatter: formatters[default_format],
    /** @deprecated */ indices: false,
    serializeDate: function serializeDate(date) {
        return to_ISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};
function is_non_nullish_primitive(v) {
    return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || (typeof v === "undefined" ? "undefined" : _type_of(v)) === "symbol" || (typeof v === "undefined" ? "undefined" : _type_of(v)) === "bigint";
}
var sentinel = {};
function inner_stringify(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
    var obj = object;
    var tmp_sc = sideChannel;
    var step = 0;
    var find_flag = false;
    while((tmp_sc = tmp_sc.get(sentinel)) !== void 0 && !find_flag){
        var pos = tmp_sc.get(object);
        step += 1;
        if (typeof pos !== "undefined") {
            if (pos === step) {
                throw new RangeError("Cyclic object value");
            } else {
                find_flag = true;
            }
        }
        if (typeof tmp_sc.get(sentinel) === "undefined") {
            step = 0;
        }
    }
    if (typeof filter === "function") {
        obj = filter(prefix, obj);
    } else if (_instanceof(obj, Date)) {
        obj = serializeDate === null || serializeDate === void 0 ? void 0 : serializeDate(obj);
    } else if (generateArrayPrefix === "comma" && is_array2(obj)) {
        obj = maybe_map(obj, function(value) {
            if (_instanceof(value, Date)) {
                return serializeDate === null || serializeDate === void 0 ? void 0 : serializeDate(value);
            }
            return value;
        });
    }
    if (obj === null) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly ? // @ts-expect-error
            encoder(prefix, defaults2.encoder, charset, "key", format) : prefix;
        }
        obj = "";
    }
    if (is_non_nullish_primitive(obj) || is_buffer(obj)) {
        if (encoder) {
            var key_value = encodeValuesOnly ? prefix : // @ts-expect-error
            encoder(prefix, defaults2.encoder, charset, "key", format);
            return [
                (formatter === null || formatter === void 0 ? void 0 : formatter(key_value)) + "=" + (// @ts-expect-error
                formatter === null || formatter === void 0 ? void 0 : formatter(encoder(obj, defaults2.encoder, charset, "value", format)))
            ];
        }
        return [
            (formatter === null || formatter === void 0 ? void 0 : formatter(prefix)) + "=" + (formatter === null || formatter === void 0 ? void 0 : formatter(String(obj)))
        ];
    }
    var values = [];
    if (typeof obj === "undefined") {
        return values;
    }
    var obj_keys;
    if (generateArrayPrefix === "comma" && is_array2(obj)) {
        if (encodeValuesOnly && encoder) {
            obj = maybe_map(obj, encoder);
        }
        obj_keys = [
            {
                value: obj.length > 0 ? obj.join(",") || null : void 0
            }
        ];
    } else if (is_array2(filter)) {
        obj_keys = filter;
    } else {
        var keys = Object.keys(obj);
        obj_keys = sort ? keys.sort(sort) : keys;
    }
    var encoded_prefix = encodeDotInKeys ? String(prefix).replace(/\./g, "%2E") : String(prefix);
    var adjusted_prefix = commaRoundTrip && is_array2(obj) && obj.length === 1 ? encoded_prefix + "[]" : encoded_prefix;
    if (allowEmptyArrays && is_array2(obj) && obj.length === 0) {
        return adjusted_prefix + "[]";
    }
    for(var j = 0; j < obj_keys.length; ++j){
        var key = obj_keys[j];
        var value = // @ts-expect-error
        (typeof key === "undefined" ? "undefined" : _type_of(key)) === "object" && typeof key.value !== "undefined" ? key.value : obj[key];
        if (skipNulls && value === null) {
            continue;
        }
        var encoded_key = allowDots && encodeDotInKeys ? key.replace(/\./g, "%2E") : key;
        var key_prefix = is_array2(obj) ? typeof generateArrayPrefix === "function" ? generateArrayPrefix(adjusted_prefix, encoded_key) : adjusted_prefix : adjusted_prefix + (allowDots ? "." + encoded_key : "[" + encoded_key + "]");
        sideChannel.set(object, step);
        var valueSideChannel = /* @__PURE__ */ new WeakMap();
        valueSideChannel.set(sentinel, sideChannel);
        push_to_array(values, inner_stringify(value, key_prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, // @ts-expect-error
        generateArrayPrefix === "comma" && encodeValuesOnly && is_array2(obj) ? null : encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, valueSideChannel));
    }
    return values;
}
function normalize_stringify_options() {
    var opts = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : defaults2;
    if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") {
        throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
    }
    if (typeof opts.encodeDotInKeys !== "undefined" && typeof opts.encodeDotInKeys !== "boolean") {
        throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
    }
    if (opts.encoder !== null && typeof opts.encoder !== "undefined" && typeof opts.encoder !== "function") {
        throw new TypeError("Encoder has to be a function.");
    }
    var charset = opts.charset || defaults2.charset;
    if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") {
        throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
    }
    var format = default_format;
    if (typeof opts.format !== "undefined") {
        if (!has3.call(formatters, opts.format)) {
            throw new TypeError("Unknown format option provided.");
        }
        format = opts.format;
    }
    var formatter = formatters[format];
    var filter = defaults2.filter;
    if (typeof opts.filter === "function" || is_array2(opts.filter)) {
        filter = opts.filter;
    }
    var arrayFormat;
    if (opts.arrayFormat && opts.arrayFormat in array_prefix_generators) {
        arrayFormat = opts.arrayFormat;
    } else if ("indices" in opts) {
        arrayFormat = opts.indices ? "indices" : "repeat";
    } else {
        arrayFormat = defaults2.arrayFormat;
    }
    if ("commaRoundTrip" in opts && typeof opts.commaRoundTrip !== "boolean") {
        throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
    }
    var allowDots = typeof opts.allowDots === "undefined" ? !!opts.encodeDotInKeys === true ? true : defaults2.allowDots : !!opts.allowDots;
    return {
        addQueryPrefix: typeof opts.addQueryPrefix === "boolean" ? opts.addQueryPrefix : defaults2.addQueryPrefix,
        // @ts-ignore
        allowDots: allowDots,
        allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults2.allowEmptyArrays,
        arrayFormat: arrayFormat,
        charset: charset,
        charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults2.charsetSentinel,
        commaRoundTrip: !!opts.commaRoundTrip,
        delimiter: typeof opts.delimiter === "undefined" ? defaults2.delimiter : opts.delimiter,
        encode: typeof opts.encode === "boolean" ? opts.encode : defaults2.encode,
        encodeDotInKeys: typeof opts.encodeDotInKeys === "boolean" ? opts.encodeDotInKeys : defaults2.encodeDotInKeys,
        encoder: typeof opts.encoder === "function" ? opts.encoder : defaults2.encoder,
        encodeValuesOnly: typeof opts.encodeValuesOnly === "boolean" ? opts.encodeValuesOnly : defaults2.encodeValuesOnly,
        filter: filter,
        format: format,
        formatter: formatter,
        serializeDate: typeof opts.serializeDate === "function" ? opts.serializeDate : defaults2.serializeDate,
        skipNulls: typeof opts.skipNulls === "boolean" ? opts.skipNulls : defaults2.skipNulls,
        // @ts-expect-error
        sort: typeof opts.sort === "function" ? opts.sort : null,
        strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults2.strictNullHandling
    };
}
function stringify(object) {
    var opts = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    var obj = object;
    var options = normalize_stringify_options(opts);
    var obj_keys;
    var filter;
    if (typeof options.filter === "function") {
        filter = options.filter;
        obj = filter("", obj);
    } else if (is_array2(options.filter)) {
        filter = options.filter;
        obj_keys = filter;
    }
    var keys = [];
    if ((typeof obj === "undefined" ? "undefined" : _type_of(obj)) !== "object" || obj === null) {
        return "";
    }
    var generateArrayPrefix = array_prefix_generators[options.arrayFormat];
    var commaRoundTrip = generateArrayPrefix === "comma" && options.commaRoundTrip;
    if (!obj_keys) {
        obj_keys = Object.keys(obj);
    }
    if (options.sort) {
        obj_keys.sort(options.sort);
    }
    var sideChannel = /* @__PURE__ */ new WeakMap();
    for(var i = 0; i < obj_keys.length; ++i){
        var key = obj_keys[i];
        if (options.skipNulls && obj[key] === null) {
            continue;
        }
        push_to_array(keys, inner_stringify(obj[key], key, // @ts-expect-error
        generateArrayPrefix, commaRoundTrip, options.allowEmptyArrays, options.strictNullHandling, options.skipNulls, options.encodeDotInKeys, options.encode ? options.encoder : null, options.filter, options.sort, options.allowDots, options.serializeDate, options.format, options.formatter, options.encodeValuesOnly, options.charset, sideChannel));
    }
    var joined = keys.join(options.delimiter);
    var prefix = options.addQueryPrefix === true ? "?" : "";
    if (options.charsetSentinel) {
        if (options.charset === "iso-8859-1") {
            prefix += "utf8=%26%2310003%3B&";
        } else {
            prefix += "utf8=%E2%9C%93&";
        }
    }
    return joined.length > 0 ? prefix + joined : "";
}
// src/index.ts
var formats = {
    formatters: formatters,
    RFC1738: RFC1738,
    RFC3986: RFC3986,
    default: default_format
};
export { formats, parse, stringify };
