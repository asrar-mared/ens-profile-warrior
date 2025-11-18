// TODO share with db-utils
export function postfixBigIntReplacer(k, v) {
    if (typeof v === 'bigint') {
        return v.toString() + 'n';
    }
    return v;
}
export function bigIntToStringReplacer(k, v) {
    if (typeof v === 'bigint') {
        return v.toString();
    }
    return v;
}
export function postfixBigIntReviver(k, v) {
    if (typeof v === 'string' &&
        (v.startsWith('-') ? !isNaN(parseInt(v.charAt(1))) : !isNaN(parseInt(v.charAt(0)))) &&
        v.charAt(v.length - 1) === 'n') {
        return BigInt(v.slice(0, -1));
    }
    return v;
}
export function JSONToString(json, space) {
    return JSON.stringify(json, bigIntToStringReplacer, space);
}
export function stringToJSON(str) {
    return JSON.parse(str);
}
//# sourceMappingURL=json.js.map