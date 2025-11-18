import { EIP1193BlockTag, EIP1193ProviderWithoutEvents } from 'eip-1193';
export type EstimateGasPriceOptions = {
    blockCount: number;
    newestBlock: EIP1193BlockTag;
    rewardPercentiles: number[];
};
export type RoughEstimateGasPriceOptions = {
    blockCount: number;
    newestBlock: EIP1193BlockTag;
    rewardPercentiles: [number, number, number];
};
export type GasPrice = {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
};
export type EstimateGasPriceResult = GasPrice[];
export type RoughEstimateGasPriceResult = {
    slow: GasPrice;
    average: GasPrice;
    fast: GasPrice;
};
export declare function getGasPriceEstimate(provider: EIP1193ProviderWithoutEvents, options?: Partial<EstimateGasPriceOptions>): Promise<EstimateGasPriceResult>;
export declare function getRoughGasPriceEstimate(provider: EIP1193ProviderWithoutEvents, options?: Partial<RoughEstimateGasPriceOptions>): Promise<RoughEstimateGasPriceResult>;
//# sourceMappingURL=eth.d.ts.map