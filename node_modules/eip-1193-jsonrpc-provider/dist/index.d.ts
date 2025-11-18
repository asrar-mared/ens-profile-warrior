// ------------------------------------------------------------------------------------------------
// TYPES
// ------------------------------------------------------------------------------------------------
type EIP1193DATA = `0x${string}`;
type EIP1193BlockTag = EIP1193QUANTITY | 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized';

type EIP1898BlockTag =
	| EIP1193QUANTITY
	| 'latest'
	| 'earliest'
	| 'pending'
	| 'safe'
	| 'finalized'
	| {blockHash: EIP1193QUANTITY; requireCanonical?: boolean} // EIP-1898
	| {blockNumber: EIP1193QUANTITY}; // EIP-1898

type EIP1193QUANTITY = `0x${string}`;
type EIP1193ChainId = `0x${string}`;
type EIP1193Account = `0x${string}`;
type EIP1193Accounts = EIP1193Account[];

type EIP1193FeeHistory = {
	oldestBlock: string;
	reward: EIP1193QUANTITY[][];
	baseFeePerGas: string[];
	gasUsedRatio: string[];
};

type BaseEIP1193Transaction = {
	blockHash: EIP1193DATA;
	blockNumber: EIP1193QUANTITY | null;
	from: EIP1193Account;
	gas: EIP1193QUANTITY;
	hash: EIP1193DATA;
	input: EIP1193DATA;
	nonce: EIP1193QUANTITY;
	to: EIP1193Account | null;
	transactionIndex: EIP1193QUANTITY | null;
	value: EIP1193QUANTITY;
	v: EIP1193QUANTITY;
	r: EIP1193QUANTITY;
	s: EIP1193QUANTITY;
};

type EIP1193TransactionType0 = BaseEIP1193Transaction & {
	type?: '0x0';
	gasPrice: EIP1193QUANTITY;
};

type EIP1193TransactionType1 = BaseEIP1193Transaction & {
	type: '0x1';
	gasPrice: EIP1193QUANTITY;
	chainId: EIP1193ChainId;
	accessList?: EIP1193AccessList;
};

type EIP1193TransactionType2 = BaseEIP1193Transaction & {
	type: '0x2';
	chainId: EIP1193ChainId;
	accessList?: EIP1193AccessList;
	maxFeePerGas: EIP1193QUANTITY;
	maxPriorityFeePerGas: EIP1193QUANTITY;
};

type EIP1193Transaction = EIP1193TransactionType0 | EIP1193TransactionType1 | EIP1193TransactionType2;

type BaseEIP1193TransactionData = {
	from: EIP1193Account;
	to?: EIP1193Account;
	gas?: EIP1193QUANTITY;
	value?: EIP1193QUANTITY;
	data?: EIP1193DATA;
	nonce?: EIP1193QUANTITY;
};

type EIP1193LegacyTransactionData = BaseEIP1193TransactionData & {
	type?: '0x0';
	gasPrice?: EIP1193QUANTITY;
};

type EIP1193TransactionDataOfType1 = BaseEIP1193TransactionData & {
	type: '0x1';
	chainId?: EIP1193ChainId;
	accessList?: EIP1193AccessList;
	gasPrice?: EIP1193QUANTITY;
};

type EIP1193AccessListEntry = {address: EIP1193Account; storageKeys: EIP1193DATA[]};
type EIP1193AccessList = EIP1193AccessListEntry[];

type EIP1193TransactionDataOfType2 = BaseEIP1193TransactionData & {
	type: '0x2';
	chainId?: EIP1193ChainId;
	accessList?: EIP1193AccessList;
	maxFeePerGas?: EIP1193QUANTITY;
	maxPriorityFeePerGas?: EIP1193QUANTITY;
};

type EIP1193TransactionData =
	| EIP1193LegacyTransactionData
	| EIP1193TransactionDataOfType1
	| EIP1193TransactionDataOfType2;

type EIP1193SyncingStatus = {
	startingBlock: EIP1193QUANTITY;
	currentBlock: EIP1193QUANTITY;
	highestBlock: EIP1193QUANTITY;
};

type EIP1193Block = {
	number: EIP1193QUANTITY;
	hash: EIP1193DATA;
	parentHash: EIP1193DATA;
	nonce: EIP1193DATA;
	sha3Uncles: EIP1193DATA;
	logsBloom: EIP1193DATA;
	transactionsRoot: EIP1193DATA;
	stateRoot: EIP1193DATA;
	receiptsRoot: EIP1193DATA;
	miner: EIP1193Account;
	difficulty: EIP1193QUANTITY;
	totalDifficulty: EIP1193QUANTITY;
	extraData: EIP1193DATA;
	size: EIP1193QUANTITY;
	gasLimit: EIP1193QUANTITY;
	gasUsed: EIP1193QUANTITY;
	timestamp: EIP1193QUANTITY;
	uncles: EIP1193DATA[];
};

type EIP1193Log = {
	removed: boolean;
	logIndex: EIP1193QUANTITY | null;
	transactionIndex: EIP1193QUANTITY | null;
	transactionHash: EIP1193DATA | null;
	blockHash: EIP1193DATA | null;
	blockNumber: EIP1193QUANTITY | null;
	address: EIP1193Account;
	data: EIP1193DATA;
	topics: EIP1193DATA[];
};

type EIP1193TransactionReceipt = {
	transactionHash: EIP1193DATA;
	transactionIndex: EIP1193QUANTITY;
	blockHash: EIP1193DATA;
	blockNumber: EIP1193QUANTITY;
	from: EIP1193Account;
	to: EIP1193Account;
	cumulativeGasUsed: EIP1193QUANTITY;
	effectiveGasPrice: EIP1193QUANTITY;
	gasUsed: EIP1193QUANTITY;
	contractAddress: EIP1193Account;
	logs: EIP1193Log[];
	logsBloom: EIP1193DATA;
	type: EIP1193DATA;
	root: EIP1193DATA;
	status: EIP1193QUANTITY;
};

type EIP1193BlockWithTransactions = EIP1193Block & {
	transactions: EIP1193Transaction[];
};

type EIP1193CallParam = {
	from?: EIP1193Account;
	to: EIP1193Account;
	gas?: EIP1193QUANTITY;
	gasPrice?: EIP1193QUANTITY;
	value?: EIP1193QUANTITY;
	data?: EIP1193DATA;
};

type EIP1193AddChainParam = {
	chainId: EIP1193ChainId;
	rpcUrls?: string[];
	blockExplorerUrls?: string[];
	chainName?: string;
	iconUrls?: string[];
	nativeCurrency?: {
		name: string;
		symbol: string;
		decimals: number;
	};
};

type EIP1193LogsParam = {
	fromBlock?: EIP1193BlockTag;
	toBlock?: EIP1193BlockTag;
	address?: EIP1193Account | EIP1193Accounts;
	topics?: (EIP1193DATA | EIP1193DATA[])[];
	blockhash?: EIP1193DATA;
};

type EIP1193AddChainError = {
	// TODO
};

type EIP1193SwitchChainError = {
	// TODO
};

// ------------------------------------------------------------------------------------------------
// REQUEST TYPES
// ------------------------------------------------------------------------------------------------

type Methods = ReadMethods & NodeOnlyReadMethods & WriteMethods & SignerMethods & WalletOnlyMethods;

type NodeOnlyReadMethods = {
	web3_clientVersion: {result: string};
	web3_sha: {params: [EIP1193DATA]; result: EIP1193DATA};
	net_version: {result: EIP1193ChainId};
	net_listening: {result: boolean};
	net_peerCount: {result: EIP1193QUANTITY};
	eth_protocolVersion: {result: string};
	eth_syncing: {result: EIP1193SyncingStatus | false};
	eth_coinbase: {result: EIP1193Account};
	eth_mining: {result: boolean}; // TODO check
	eth_hashrate: {result: unknown}; // TODO
};

type ReadMethods = {
	eth_gasPrice: {result: EIP1193QUANTITY};

	eth_blockNumber: {result: EIP1193QUANTITY};
	eth_getBalance: {params: [EIP1193Account] | [EIP1193Account, EIP1898BlockTag]; result: EIP1193QUANTITY};
	eth_getStorageAt: {
		params: [EIP1193Account, EIP1193QUANTITY] | [EIP1193Account, EIP1193QUANTITY, EIP1898BlockTag];
		result: EIP1193DATA;
	};
	eth_getTransactionCount: {params: [EIP1193Account] | [EIP1193Account, EIP1898BlockTag]; result: EIP1193QUANTITY};
	eth_getBlockTransactionCountByHash: {params: [EIP1193DATA]; result: EIP1193QUANTITY};
	eth_getBlockTransactionCountByNumber: {params: [EIP1193BlockTag]; result: EIP1193QUANTITY};
	eth_getUncleCountByBlockHash: {params: [EIP1193DATA]; result: EIP1193QUANTITY};
	eth_getUncleCountByBlockNumber: {params: [EIP1193BlockTag]; resu; t: EIP1193QUANTITY};
	eth_getCode: {params: [EIP1193Account] | [EIP1193Account, EIP1898BlockTag]; result: EIP1193DATA};

	eth_call: {params: [EIP1193CallParam] | [EIP1193CallParam, EIP1898BlockTag]; result: EIP1193DATA};
	eth_estimateGas: {params: [EIP1193CallParam] | [EIP1193CallParam, EIP1193BlockTag]; result: EIP1193QUANTITY}; // EIP1898BlockTag ?
	eth_getBlockByHash:
		| {params: [EIP1193DATA, true]; result: EIP1193BlockWithTransactions | null}
		| {params: [EIP1193DATA, false]; result: EIP1193Block | null};
	eth_getBlockByNumber:
		| {params: [EIP1193BlockTag, true]; result: EIP1193BlockWithTransactions | null}
		| {params: [EIP1193BlockTag, false]; result: EIP1193Block | null};
	eth_getTransactionByHash: {params: [EIP1193DATA]; result: EIP1193Transaction | null};
	eth_getTransactionByBlockHashAndIndex: {params: [EIP1193DATA, EIP1193QUANTITY]; result: EIP1193Transaction | null};
	eth_getTransactionByBlockNumberAndIndex: {
		params: [EIP1193BlockTag, EIP1193QUANTITY];
		result: EIP1193Transaction | null;
	};

	eth_getTransactionReceipt: {params: [EIP1193DATA]; result: EIP1193TransactionReceipt | null};
	eth_getUncleByBlockHashAndIndex: {params: [EIP1193DATA, EIP1193QUANTITY]; result: EIP1193Block | null};
	eth_getUncleByBlockNumberAndIndex: {params: [EIP1193BlockTag, EIP1193QUANTITY]; result: EIP1193Block | null};
	eth_getLogs: {params: [EIP1193LogsParam]; result: EIP1193Log[]};
	eth_chainId: {result: EIP1193ChainId};

	eth_subscribe:
		| {params: ['newHeads' | 'newPendingTransactions' | 'syncing']; result: string}
		| {
				params: [
					'logs',
					{
						address: EIP1193Account | EIP1193Account[];
						topics: (EIP1193DATA[] | EIP1193DATA)[];
					}
				];
				result: string;
		  };
	eth_unsubscribe: {params: [EIP1193DATA]; result: boolean};
	eth_getProof: {params: [EIP1193DATA, EIP1193DATA[]] | [EIP1193DATA, EIP1193DATA[], EIP1898BlockTag]; result: unknown}; // TODO

	eth_feeHistory: {params: [EIP1193DATA, EIP1193BlockTag, number[]]; result: EIP1193FeeHistory};
};

type WriteMethods = {
	eth_sendRawTransaction: {params: [EIP1193DATA]; result: EIP1193DATA};
};

type SignerMethods = {
	eth_accounts: {result: EIP1193Accounts};
	eth_sign: {params: [EIP1193Account, EIP1193DATA]; result: EIP1193DATA};
	eth_signTransaction: {params: [EIP1193TransactionData]; result: EIP1193DATA};

	personal_sign: {params: [EIP1193DATA, EIP1193Account]; result: EIP1193DATA};
	eth_signTypedData_v4: {params: [EIP1193Account, EIP1193TypedSignatureParam]; result: EIP1193DATA};
	eth_signTypedData: {params: [EIP1193Account, EIP1193TypedSignatureParam]; result: EIP1193DATA};
};

type WalletOnlyMethods = {
	eth_requestAccounts: {result: EIP1193Accounts};
	wallet_switchEthereumChain: {
		params: [
			{
				chainId: EIP1193ChainId;
			}
		];
		result: EIP1193SwitchChainError | null;
	};
	wallet_addEthereumChain: {params: [EIP1193AddChainParam]; result: EIP1193AddChainError | null};
};

type EIP1193TypedSignatureParam = {[field: string]: any};

// ------------------------------------------------------------------------------------------------
// TOOLS
// ------------------------------------------------------------------------------------------------

// taken from https://dev.to/bwca/deep-readonly-generic-in-typescript-4b04
type DeepReadonly<T> = Readonly<{
	[K in keyof T]: T[K] extends number | string | symbol // Is it a primitive? Then make it readonly
		? Readonly<T[K]>
		: // Is it an array of items? Then make the array readonly and the item as well
		T[K] extends Array<infer A>
		? Readonly<Array<DeepReadonly<A>>>
		: // It is some other object, make it readonly as well
		  DeepReadonly<T[K]>;
}>;

type RPCRequestData = {params?: any; result?: any; errors?: any};

type RPCMethods = Record<string, RPCRequestData>;

type RemoteRequestCallType<
	Method extends string,
	Value,
	Params extends any[] | Record<string, any> | undefined = undefined
> = Params extends undefined
	? {
			request: (req: {method: Method}) => Promise<Value>;
	  }
	: Params extends []
	? {
			request: (req: {method: Method}) => Promise<Value>;
	  }
	: {
			request: (req: {method: Method; params: DeepReadonly<Params>}) => Promise<Value>;
	  };

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type RequestUnion<T extends RPCMethods> = {
	[Property in keyof T]: RemoteRequestCallType<
		Property extends string ? Property : never,
		T[Property] extends {result: any} ? T[Property]['result'] : undefined,
		T[Property] extends {params: any} ? T[Property]['params'] : undefined
	>;
}[keyof T];

// ------------------------------------------------------------------------------------------------
// PROVIDERS
// ------------------------------------------------------------------------------------------------

type RequestRPC<T extends RPCMethods> = UnionToIntersection<RequestUnion<T>> & {
	request<U extends {params?: any; result?: any}>(req: {
		method: string;
		params: DeepReadonly<U['params']>;
	}): Promise<U['result']>;
};

type EIP1193ProviderWithoutEvents = RequestRPC<Methods>;

declare class JSONRPCError extends Error {
    cause: Error;
    readonly isInvalidError = true;
    constructor(message: string, cause: Error);
}
declare function ethereum_request<U extends any, T>(endpoint: string, req: {
    method: string;
    params?: U;
}): Promise<T>;
declare class JSONRPCHTTPProvider implements EIP1193ProviderWithoutEvents {
    protected endpoint: string;
    supportsETHBatch: boolean;
    private promiseThrottle;
    constructor(endpoint: string, options?: {
        requestsPerSecond?: number;
    });
    request(args: {
        method: string;
        params?: any;
    }): Promise<any>;
}

export { JSONRPCError, JSONRPCHTTPProvider, ethereum_request };
