import { BaseProvider } from './BaseProvider.js';
export class TransactionHashTrackerProvider extends BaseProvider {
    transactionHashes = [];
    constructor(provider) {
        super(provider);
    }
    async _request(args) {
        const response = await this.provider.request(args);
        if (args.method === 'eth_sendRawTransaction' || args.method === 'eth_sendTransaction') {
            this.transactionHashes.push(response);
        }
        return response;
    }
}
//# sourceMappingURL=TransactionHashTracker.js.map