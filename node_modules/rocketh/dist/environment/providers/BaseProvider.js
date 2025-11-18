export class BaseProvider {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    request(args) {
        return this._request(args);
    }
}
//# sourceMappingURL=BaseProvider.js.map