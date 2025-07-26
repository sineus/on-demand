import type { FeedEvalResponse, FetchSignaturesConsensusResponse, FetchSignaturesMultiResponse } from '../oracle-interfaces/gateway.js';
import { Oracle } from './oracle.js';
import { Queue } from './queue.js';
import type { Program } from '@coral-xyz/anchor-31';
import * as anchor from '@coral-xyz/anchor-31';
import { BN, web3 } from '@coral-xyz/anchor-31';
import type { IOracleJob } from '@switchboard-xyz/common';
import { Big, CrossbarClient } from '@switchboard-xyz/common';
import { Buffer } from 'buffer';
declare const PublicKey: typeof anchor.web3.PublicKey, TransactionInstruction: typeof anchor.web3.TransactionInstruction;
type PublicKey = web3.PublicKey;
type TransactionInstruction = web3.TransactionInstruction;
type AddressLookupTableAccount = web3.AddressLookupTableAccount;
export interface CurrentResult {
    value: BN;
    stdDev: BN;
    mean: BN;
    range: BN;
    minValue: BN;
    maxValue: BN;
    slot: BN;
    minSlot: BN;
    maxSlot: BN;
}
export interface CompactResult {
    stdDev: number;
    mean: number;
    slot: BN;
}
export interface OracleSubmission {
    oracle: web3.PublicKey;
    slot: BN;
    value: BN;
}
export interface PullFeedAccountData {
    submissions: OracleSubmission[];
    authority: web3.PublicKey;
    queue: web3.PublicKey;
    feedHash: Uint8Array;
    initializedAt: BN;
    permissions: BN;
    maxVariance: BN;
    minResponses: number;
    name: Uint8Array;
    sampleSize: number;
    lastUpdateTimestamp: BN;
    lutSlot: BN;
    result: CurrentResult;
    maxStaleness: number;
    minSampleSize: number;
    historicalResultIdx: number;
    historicalResults: CompactResult[];
}
export type MultiSubmission = {
    values: BN[];
    signature: Buffer;
    recoveryId: number;
};
export declare class OracleResponse {
    readonly oracle: Oracle;
    readonly value: Big | null;
    readonly error: string;
    constructor(oracle: Oracle, value: Big | null, error: string);
    shortError(): string | undefined;
}
export type FeedSubmission = {
    value: Big;
    slot: BN;
    oracle: web3.PublicKey;
};
export declare function toFeedValue(submissions: FeedSubmission[], onlyAfter: BN): FeedSubmission | null;
/**
 * PullFeed account management for persistent price feeds
 *
 * The PullFeed class manages on-chain feed accounts that store price
 * history and configuration. While the bundle approach is more efficient
 * for most use cases, feeds are useful when you need:
 *
 * - Persistent price history on-chain
 * - Standardized addresses for multiple consumers
 * - Price archives and analytics
 * - Compatibility with programs expecting traditional feeds
 *
 * ## Key Features
 *
 * - **Price History**: Stores historical price data on-chain
 * - **Job Management**: Configure data sources via IPFS-stored jobs
 * - **Update Control**: Fine-grained control over update parameters
 * - **LUT Integration**: Automatic lookup table management
 *
 * @example
 * ```typescript
 * // Create a new feed
 * const [pullFeed, feedKp] = PullFeed.generate(program);
 * await pullFeed.initIx({
 *   name: "BTC/USD",
 *   queue: queuePubkey,
 *   maxVariance: 1.0,
 *   minResponses: 3,
 *   feedHash: jobHash,
 * });
 *
 * // Update the feed
 * const [updateIx, responses] = await pullFeed.fetchUpdateIx();
 * ```
 *
 * @class PullFeed
 */
export declare class PullFeed {
    readonly program: Program;
    gatewayUrl: string;
    pubkey: web3.PublicKey;
    configs: {
        queue: web3.PublicKey;
        maxVariance: number;
        minResponses: number;
        feedHash: Buffer;
        minSampleSize: number;
    } | null;
    data: PullFeedAccountData | null;
    jobs: IOracleJob[] | null;
    lut: web3.AddressLookupTableAccount | null;
    /**
     * Constructs a `PullFeed` instance.
     *
     * @param program - The Anchor program instance.
     * @param pubkey - The public key of the pull feed account.
     */
    constructor(program: Program, pubkey: web3.PublicKey | string);
    static generate(program: Program): [PullFeed, web3.Keypair];
    lookupTableKey(data?: PullFeedAccountData): Promise<web3.PublicKey>;
    /**
     * Prefetch all lookup tables needed for the feed and queue.
     * @returns A promise that resolves to an array of lookup tables.
     * @throws if the lookup tables cannot be loaded.
     */
    preHeatLuts(): Promise<web3.AddressLookupTableAccount[]>;
    static initTx(program: Program, params: {
        name: string;
        queue: web3.PublicKey;
        maxVariance: number;
        minResponses: number;
        minSampleSize: number;
        maxStaleness: number;
        permitWriteByAuthority?: boolean;
        payer?: web3.PublicKey;
    } & ({
        feedHash: Buffer;
    } | {
        jobs: IOracleJob[];
    })): Promise<[PullFeed, web3.VersionedTransaction]>;
    private static getPayer;
    private getPayer;
    /**
     *  Calls to initialize a pull feed account and to update the configuration account need to
     *  compute the feed hash for the account (if one is not specified).
     */
    private static feedHashFromParams;
    fetchQueue(): Promise<Queue>;
    fetchGatewayUrl(crossbarClient_?: CrossbarClient): Promise<string>;
    preHeatFeed(crossbarClient?: CrossbarClient): Promise<void>;
    loadJobs(crossbarClient?: CrossbarClient): Promise<IOracleJob[]>;
    /**
     * Initializes a pull feed account.
     *
     * @param {Program} program - The Anchor program instance.
     * @param {PublicKey} queue - The queue account public key.
     * @param {Array<IOracleJob>} jobs - The oracle jobs to execute.
     * @param {number} maxVariance - The maximum variance allowed for the feed.
     * @param {number} minResponses - The minimum number of job responses required.
     * @param {number} minSampleSize - The minimum number of samples required for setting feed value.
     * @param {number} maxStaleness - The maximum number of slots that can pass before a feed value is considered stale.
     * @returns {Promise<web3.TransactionInstruction>} A promise that resolves to the transaction instruction.
     */
    initIx(params: {
        name: string;
        queue: web3.PublicKey;
        maxVariance: number;
        minResponses: number;
        payer?: web3.PublicKey;
        minSampleSize: number;
        maxStaleness: number;
        permitWriteByAuthority?: boolean;
    } & ({
        feedHash: Buffer;
    } | {
        jobs: IOracleJob[];
    })): Promise<web3.TransactionInstruction>;
    closeIx(params: {
        payer?: web3.PublicKey;
    }): Promise<web3.TransactionInstruction>;
    /**
     * Set configurations for the feed.
     *
     * @param params
     * @param params.feedHash - The hash of the feed as a `Uint8Array` or hexadecimal `string`. Only results signed with this hash will be accepted.
     * @param params.authority - The authority of the feed.
     * @param params.maxVariance - The maximum variance allowed for the feed.
     * @param params.minResponses - The minimum number of responses required.
     * @param params.minSampleSize - The minimum number of samples required for setting feed value.
     * @param params.maxStaleness - The maximum number of slots that can pass before a feed value is considered stale.
     * @returns A promise that resolves to the transaction instruction to set feed configs.
     */
    setConfigsIx(params: {
        name?: string;
        authority?: web3.PublicKey;
        maxVariance?: number;
        minResponses?: number;
        feedHash?: Buffer;
        jobs?: IOracleJob[];
        minSampleSize?: number;
        maxStaleness?: number;
        permitWriteByAuthority?: boolean;
    }): Promise<web3.TransactionInstruction>;
    /**
     * Fetch updates for the feed.
     *
     * @param {object} params_ - The parameters object.
     * @param {string} [params_.gateway] - Optionally specify the gateway to use. If not specified, the gateway is automatically fetched.
     * @param {number} [params_.numSignatures] - Number of signatures to fetch.
     * @param {FeedRequest} [params_.feedConfigs] - Optionally specify the feed configs. If not specified, the feed configs are automatically fetched.
     * @param {IOracleJob[]} [params_.jobs] - An array of `IOracleJob` representing the jobs to be executed.
     * @param {CrossbarClient} [params_.crossbarClient] - Optionally specify the CrossbarClient to use.
     * @param {Array<[BN, string]>} [recentSlothashes] - An optional array of recent slothashes as `[BN, string]` tuples.
     * @param {FeedEvalResponse[]} [priceSignatures] - An optional array of `FeedEvalResponse` representing the price signatures.
     * @param {boolean} [debug=false] - A boolean flag to enable or disable debug mode. Defaults to `false`.
     * @returns {Promise<[TransactionInstruction | undefined, OracleResponse[], number, any[]]>} A promise that resolves to a tuple containing:
     * - The transaction instruction to fetch updates, or `undefined` if not applicable.
     * - An array of `OracleResponse` objects.
     * - A number representing the successful responses.
     * - An array containing usable lookup tables.
     */
    /**
     * Fetches update instructions for this feed
     *
     * Retrieves fresh oracle data and creates the instructions to update
     * the on-chain feed account. This method handles all the complexity
     * of oracle communication and signature verification.
     *
     * @param {Object} params - Update parameters
     * @param {string} params.gateway - Gateway URL for oracle communication
     * @param {number} params.numSignatures - Number of oracle signatures (defaults to minSampleSize + 33%)
     * @param {IOracleJob[]} params.jobs - Optional job overrides
     * @param {CrossbarClient} params.crossbarClient - Optional Crossbar client
     * @param {number} params.retries - Number of retry attempts
     * @param {string} params.chain - Chain identifier
     * @param {string} params.network - Network (mainnet/devnet)
     * @param {string} params.solanaRpcUrl - Optional RPC URL override
     * @param {boolean} debug - Enable debug logging
     * @param {web3.PublicKey} payer - Optional payer override
     * @returns {Promise<[instructions, responses, success, luts, logs]>} Update transaction components
     *
     * @example
     * ```typescript
     * const [pullIx, responses, success, luts] = await pullFeed.fetchUpdateIx({
     *   gateway: 'https://gateway.switchboard.xyz',
     *   numSignatures: 3,
     * });
     *
     * if (pullIx) {
     *   const tx = await asV0Tx({
     *     connection,
     *     ixs: pullIx,
     *     signers: [payer],
     *     lookupTables: luts,
     *   });
     * }
     * ```
     */
    fetchUpdateIx(params: {
        gateway: string;
        numSignatures?: number;
        jobs?: IOracleJob[];
        crossbarClient?: CrossbarClient;
        retries?: number;
        chain?: string;
        network?: 'mainnet' | 'mainnet-beta' | 'testnet' | 'devnet';
        solanaRpcUrl?: string;
    }, debug?: boolean, payer?: web3.PublicKey): Promise<[
        web3.TransactionInstruction[] | undefined,
        OracleResponse[],
        number,
        web3.AddressLookupTableAccount[],
        string[]
    ]>;
    /**
     * Loads the feed configurations (if not already cached) for this {@linkcode PullFeed} account from on chain.
     * @returns A promise that resolves to the feed configurations.
     * @throws if the feed account does not exist.
     */
    loadConfigs(force?: boolean): Promise<{
        queue: web3.PublicKey;
        maxVariance: number;
        minResponses: number;
        feedHash: Buffer;
        minSampleSize: number;
    }>;
    /**
     * Fetches updates for a feed, returning instructions that must be executed in order at the front
     * of the transaction.
     *
     * @param program - The Anchor program instance
     * @param params - The parameters object
     * @param params.feed - PullFeed address to fetch updates for
     * @param params.gateway - gateway URL to use for fetching updates
     * @param params.chain - Optional chain identifier (defaults to "solana")
     * @param params.network - Optional network identifier ("mainnet", "mainnet-beta", "testnet", "devnet")
     * @param params.numSignatures - Number of signatures to fetch
     * @param params.crossbarClient - Optional CrossbarClient instance to use
     * @param recentSlothashes - Optional array of recent slothashes as [BN, string] tuples
     * @param debug - Enable debug logging (default: false)
     * @param payer - Optional transaction payer public key
     * @returns Promise resolving to:
     * - instructions: Array of instructions that must be executed in order:
     *   [0] = secp256k1 program verification instruction
     *   [1] = feed update instruction
     * - oracleResponses: Array of responses from oracles
     * - numSuccesses: Number of successful responses
     * - luts: Array of AddressLookupTableAccount to include
     * - failures: Array of errors that occurred during the fetch
     */
    static fetchUpdateIx(params: {
        pullFeed: PullFeed;
        gateway: string;
        chain?: string;
        network?: 'mainnet' | 'mainnet-beta' | 'testnet' | 'devnet';
        numSignatures: number;
        crossbarClient?: CrossbarClient;
        solanaRpcUrl?: string;
    }, debug?: boolean, payer?: web3.PublicKey): Promise<[
        web3.TransactionInstruction[] | undefined,
        OracleResponse[],
        number,
        web3.AddressLookupTableAccount[],
        string[]
    ]>;
    static fetchUpdateIxSvm(params: {
        pullFeed: PullFeed;
        gateway: string;
        chain?: string;
        network?: 'mainnet' | 'mainnet-beta' | 'testnet' | 'devnet';
        numSignatures: number;
        crossbarClient?: CrossbarClient;
        solanaRpcUrl?: string;
        recentSlothashes?: Array<[BN, string]>;
    }, debug?: boolean, payer?: web3.PublicKey): Promise<[
        web3.TransactionInstruction[] | undefined,
        OracleResponse[],
        number,
        web3.AddressLookupTableAccount[],
        string[]
    ]>;
    /**
     * Fetches updates for multiple feeds at once into a SINGLE tightly packed instruction.
     * Returns instructions that must be executed in order, with the secp256k1 verification
     * instruction placed at the front of the transaction.
     *
     * @param program - The Anchor program instance.
     * @param params_ - The parameters object.
     * @param params_.feeds - An array of PullFeed account public keys.
     * @param params_.gateway - The gateway URL to use
     * @param params_.recentSlothashes - The recent slothashes to use. If not provided, the latest 30 slothashes are fetched.
     * @param params_.numSignatures - The number of signatures to fetch.
     * @param params_.crossbarClient - Optionally specify the CrossbarClient to use.
     * @param params_.payer - The payer of the transaction. If not provided, the payer is automatically fetched.
     * @param debug - A boolean flag to enable or disable debug mode. Defaults to `false`.
     * @returns A promise that resolves to a tuple containing:
     * - An array of transaction instructions that must be executed in order:
     *   [0] = secp256k1 program verification instruction
     *   [1] = feed update instruction
     * - An array of `AddressLookupTableAccount` to use.
     * - The raw response data.
     */
    static fetchUpdateManyIx(program: Program, params: {
        feeds: PullFeed[];
        chain?: string;
        network?: 'mainnet' | 'mainnet-beta' | 'testnet' | 'devnet';
        gateway: string;
        numSignatures: number;
        crossbarClient?: CrossbarClient;
        payer?: web3.PublicKey;
    }, debug?: boolean): Promise<[
        web3.TransactionInstruction[],
        web3.AddressLookupTableAccount[],
        FetchSignaturesConsensusResponse
    ]>;
    static fetchUpdateManyLightIx(program: Program, params: {
        feeds: PullFeed[];
        chain?: string;
        network?: 'mainnet' | 'mainnet-beta' | 'testnet' | 'devnet';
        gateway: string;
        recentSlothashes?: Array<[BN, string]>;
        numSignatures: number;
        crossbarClient?: CrossbarClient;
        payer?: web3.PublicKey;
    }, debug?: boolean): Promise<[
        web3.TransactionInstruction[],
        web3.AddressLookupTableAccount[],
        FetchSignaturesConsensusResponse
    ]>;
    /**
     *  Compiles a transaction instruction to submit oracle signatures for a given feed.
     *
     *  @param resps The oracle responses. This may be obtained from the `Gateway` class.
     *  @param slot The slot at which the oracles signed the feed with the current slothash.
     *  @returns A promise that resolves to the transaction instruction.
     */
    getSolanaSubmitSignaturesIx(params: {
        resps: FeedEvalResponse[];
        offsets: number[];
        slot: BN;
        payer?: web3.PublicKey;
        chain?: string;
    }): web3.TransactionInstruction;
    /**
     *  Checks if the pull feed account has been initialized.
     *
     *  @returns A promise that resolves to a boolean indicating if the account has been initialized.
     */
    isInitializedAsync(): Promise<boolean>;
    /**
     *  Loads the feed data for this {@linkcode PullFeed} account from on chain.
     *
     *  @returns A promise that resolves to the feed data.
     *  @throws if the feed account does not exist.
     */
    loadData(): Promise<PullFeedAccountData>;
    /**
     *  Loads the feed data for multiple feeds at once.
     *
     *  @param program The program instance.
     *  @param pubkeys The public keys of the feeds to load.
     *  @returns A promise that resolves to an array of feed data (or null if the feed account does not exist)
     */
    static loadMany(program: Program, feeds: PullFeed[]): Promise<(PullFeedAccountData | null)[]>;
    /**
     *  Loads the feed data for this {@linkcode PullFeed} account from on chain.
     *
     *  @returns A promise that resolves to the values currently stored in the feed.
     *  @throws if the feed account does not exist.
     */
    loadValues(): Promise<FeedSubmission[]>;
    /**
     *  Loads the feed data for this {@linkcode PullFeed} account from on chain.
     *
     *  @param onlyAfter Call will ignore data signed before this slot.
     *  @returns A promise that resolves to the observed value as it would be
     *           seen on-chain.
     */
    loadObservedValue(onlyAfter: BN): Promise<{
        value: Big;
        slot: BN;
        oracle: web3.PublicKey;
    } | null>;
    /**
     * Watches for any on-chain updates to the feed data.
     *
     * @param callback The callback to call when the feed data is updated.
     * @returns A promise that resolves to a subscription ID.
     */
    subscribeToValueChanges(callback: (feed: FeedSubmission[]) => Promise<unknown>): Promise<number>;
    static mapFeedSubmissions(data: PullFeedAccountData): FeedSubmission[];
    /**
     * Watches for any on-chain updates to any data feed.
     *
     * @param program The Anchor program instance.
     * @param callback The callback to call when the feed data is updated.
     * @returns A promise that resolves to a subscription ID.
     */
    static subscribeToAllUpdates(program: Program, callback: (event: [number, {
        pubkey: web3.PublicKey;
        submissions: FeedSubmission[];
    }]) => Promise<void>): Promise<number>;
    loadLookupTable(): Promise<web3.AddressLookupTableAccount>;
    loadHistoricalValuesCompact(data_?: PullFeedAccountData): Promise<CompactResult[]>;
    /**
     * @hidden
     *
     * Fetches updates for multiple feeds at once into SEPARATE intructions (one for each)
     *
     * @param program - The Anchor program instance.
     * @param params_ - The parameters object.
     * @param params_.gateway - The gateway URL to use. If not provided, the gateway is automatically fetched.
     * @param params_.feeds - An array of feed account public keys.
     * @param params_.numSignatures - The number of signatures to fetch.
     * @param params_.crossbarClient - Optionally specify the CrossbarClient to use.
     * @param recentSlothashes - An optional array of recent slothashes as `[anchor.BN, string]` tuples.
     * @param debug - A boolean flag to enable or disable debug mode. Defaults to `false`.
     * @param payer - Optionally specify the payer public key.
     * @returns A promise that resolves to a tuple containing:
     * - The transaction instruction for fetching updates.
     * - An array of `AddressLookupTableAccount` to use.
     * - The raw response data.
     */
    static _obsoleteFetchUpdateManyIxs(program: Program, params_: {
        gateway?: string;
        feeds: PublicKey[];
        numSignatures: number;
        crossbarClient?: CrossbarClient;
        payer?: PublicKey;
    }, recentSlothashes?: Array<[anchor.BN, string]>, debug?: boolean): Promise<{
        successes: {
            submitSignaturesIx: TransactionInstruction;
            oracleResponses: {
                value: Big.Big | null;
                error: string;
                oracle: Oracle;
            }[];
            numSuccesses: number;
            luts: AddressLookupTableAccount[];
            failures: string[];
        }[];
        failures: {
            feed: PublicKey;
            error: string;
        }[];
    }>;
    /**
     * @hidden
     * Fetches updates for multiple feeds at once into a SINGLE tightly packed intruction
     *
     * @param program - The Anchor program instance.
     * @param params_ - The parameters object.
     * @param params_.gateway - The gateway URL to use. If not provided, the gateway is automatically fetched.
     * @param params_.feeds - An array of feed account public keys.
     * @param params_.numSignatures - The number of signatures to fetch.
     * @param params_.crossbarClient - Optionally specify the CrossbarClient to use.
     * @param recentSlothashes - An optional array of recent slothashes as `[anchor.BN, string]` tuples.
     * @param debug - A boolean flag to enable or disable debug mode. Defaults to `false`.
     * @returns A promise that resolves to a tuple containing:
     * - The transaction instruction for fetching updates.
     * - An array of `AddressLookupTableAccount` to use.
     * - The raw response data.
     */
    static _obsoleteFetchUpdateManyIx(program: Program, params_: {
        gateway?: string;
        feeds: PublicKey[];
        numSignatures: number;
        crossbarClient?: CrossbarClient;
        payer?: PublicKey;
    }, recentSlothashes?: Array<[anchor.BN, string]>): Promise<[
        TransactionInstruction,
        AddressLookupTableAccount[],
        FetchSignaturesMultiResponse
    ]>;
}
export {};
//# sourceMappingURL=pullFeed.d.ts.map