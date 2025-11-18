import { EIP1193GenericRequest, EIP1193ProviderWithoutEvents } from 'eip-1193';
export declare abstract class BaseProvider implements EIP1193ProviderWithoutEvents {
    protected provider: EIP1193ProviderWithoutEvents;
    constructor(provider: EIP1193ProviderWithoutEvents);
    request(args: any): Promise<any>;
    protected abstract _request<T = unknown, V extends EIP1193GenericRequest = EIP1193GenericRequest>(args: V): Promise<T>;
}
//# sourceMappingURL=BaseProvider.d.ts.map