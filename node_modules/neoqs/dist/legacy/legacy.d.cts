type Format = 'RFC1738' | 'RFC3986';
type DefaultEncoder = (str: any, defaultEncoder?: any, charset?: string) => string;
type DefaultDecoder = (str: string, decoder?: any, charset?: string) => string;
type StringifyBaseOptions = {
    delimiter?: string;
    allowDots?: boolean;
    encodeDotInKeys?: boolean;
    strictNullHandling?: boolean;
    skipNulls?: boolean;
    encode?: boolean;
    encoder?: (str: any, defaultEncoder: DefaultEncoder, charset: string, type: 'key' | 'value', format?: Format) => string;
    filter?: Array<PropertyKey> | ((prefix: PropertyKey, value: any) => any);
    arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
    indices?: boolean;
    sort?: ((a: PropertyKey, b: PropertyKey) => number) | null;
    serializeDate?: (d: Date) => string;
    format?: 'RFC1738' | 'RFC3986';
    formatter?: (str: PropertyKey) => string;
    encodeValuesOnly?: boolean;
    addQueryPrefix?: boolean;
    charset?: 'utf-8' | 'iso-8859-1';
    charsetSentinel?: boolean;
    allowEmptyArrays?: boolean;
    commaRoundTrip?: boolean;
};
type StringifyOptions = StringifyBaseOptions;
type ParseBaseOptions = {
    comma?: boolean;
    delimiter?: string | RegExp;
    depth?: number | false;
    decoder?: (str: string, defaultDecoder: DefaultDecoder, charset: string, type: 'key' | 'value') => any;
    arrayLimit?: number;
    parseArrays?: boolean;
    plainObjects?: boolean;
    allowPrototypes?: boolean;
    allowSparse?: boolean;
    parameterLimit?: number;
    strictDepth?: boolean;
    strictNullHandling?: boolean;
    ignoreQueryPrefix?: boolean;
    charset?: 'utf-8' | 'iso-8859-1';
    charsetSentinel?: boolean;
    interpretNumericEntities?: boolean;
    allowEmptyArrays?: boolean;
    duplicates?: 'combine' | 'first' | 'last';
    allowDots?: boolean;
    decodeDotInKeys?: boolean;
};
type ParseOptions = ParseBaseOptions;

declare function parse(str: string, opts?: ParseOptions): any;

declare function stringify(object: any, opts?: StringifyOptions): string;

declare const formats: {
    formatters: Record<Format, (str: PropertyKey) => string>;
    RFC1738: string;
    RFC3986: string;
    default: Format;
};

export { type DefaultDecoder, type DefaultEncoder, type Format, type ParseOptions, type StringifyOptions, formats, parse, stringify };
