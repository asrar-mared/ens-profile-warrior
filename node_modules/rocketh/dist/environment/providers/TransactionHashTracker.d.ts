import { EIP1193GenericRequest, EIP1193ProviderWithoutEvents } from 'eip-1193';
import { BaseProvider } from './BaseProvider.js';
export declare class TransactionHashTrackerProvider extends BaseProvider implements EIP1193ProviderWithoutEvents {
    transactionHashes: `0x${string}`[];
    constructor(provider: EIP1193ProviderWithoutEvents);
    protected _request<T = unknown, V extends EIP1193GenericRequest = EIP1193GenericRequest>(args: V): Promise<T>;
}
export type TransactionHashTracker = EIP1193ProviderWithoutEvents & {
    transactionHashes: `0x${string}`[];
};
//# sourceMappingURL=TransactionHashTracker.d.ts.map