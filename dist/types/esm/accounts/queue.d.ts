import type { FeedEvalResponse, FetchSignaturesBatchResponse, FetchSignaturesConsensusResponse, FetchSignaturesMultiResponse } from '../oracle-interfaces/gateway.js';
import type { FeedRequest } from '../oracle-interfaces/gateway.js';
import { Gateway } from '../oracle-interfaces/gateway.js';
import type { SwitchboardPermission } from './permission.js';
import type { Program } from '@coral-xyz/anchor-31';
import { BN, web3 } from '@coral-xyz/anchor-31';
import { CrossbarClient } from '@switchboard-xyz/common';
import { type IOracleJob } from '@switchboard-xyz/common';
import { Buffer } from 'buffer';
/**
 * On-chain queue account data structure
 *
 * The queue account is the core configuration for a set of oracle operators.
 * It defines which oracles are authorized to sign data and various security
 * parameters for the oracle network.
 *
 * @interface QueueAccountData
 */
export interface QueueAccountData {
    /** Authority that can modify the queue configuration */
    authority: web3.PublicKey;
    /** Intel SGX enclave measurements for TEE verification */
    mrEnclaves: Uint8Array[];
    /** Public keys of authorized oracle operators */
    oracleKeys: web3.PublicKey[];
    /** Maximum age for TEE quote verification */
    maxQuoteVerificationAge: BN;
    /** Last heartbeat timestamp from authority */
    lastHeartbeat: BN;
    /** Timeout period for oracle nodes */
    nodeTimeout: BN;
    /** Minimum stake required for oracle operators */
    oracleMinStake: BN;
    /** Time after which authority can override without permission */
    allowAuthorityOverrideAfter: BN;
    /** Number of valid enclave measurements */
    mrEnclavesLen: number;
    /** Number of registered oracle keys */
    oracleKeysLen: number;
    /** Reward amount for oracle operators */
    reward: number;
    /** Current oracle index for round-robin selection */
    currIdx: number;
    /** Garbage collection index */
    gcIdx: number;
    /** Whether authority heartbeat permission is required */
    requireAuthorityHeartbeatPermission: boolean;
    /** Whether authority verify permission is required */
    requireAuthorityVerifyPermission: boolean;
    /** Whether usage permissions are enforced */
    requireUsagePermissions: boolean;
    /** PDA bump for the queue signer account */
    signerBump: number;
    /** Token mint for rewards and fees */
    mint: web3.PublicKey;
    /** Slot when the lookup table was last updated */
    lutSlot: BN;
    /** Whether subsidies are allowed for this queue */
    allowSubsidies: boolean;
    /** Network configuration node (NCN) account */
    ncn: web3.PublicKey;
}
/**
 * Queue account management for Switchboard On-Demand
 *
 * The Queue class is the primary interface for interacting with oracle operators
 * in the Switchboard network. It manages:
 *
 * - Oracle operator authorization and verification
 * - Bundle fetching and signature verification
 * - Address lookup table management
 * - Gateway interactions for data retrieval
 *
 * ## Key Features
 *
 * - **Oracle Management**: Track and verify authorized oracle signers
 * - **Bundle Operations**: Fetch signed data bundles from oracle operators
 * - **LUT Optimization**: Automatic address lookup table management
 * - **Network Detection**: Automatic mainnet/devnet queue selection
 *
 * @example
 * ```typescript
 * // Load the default queue for your network
 * const queue = await Queue.loadDefault(program);
 *
 * // Fetch a bundle for specific feeds
 * const [sigVerifyIx, bundle] = await queue.fetchUpdateBundleIx(
 *   gateway,
 *   crossbar,
 *   ['0x1234...', '0x5678...'] // Feed hashes
 * );
 * ```
 *
 * @class Queue
 */
export declare class Queue {
    readonly program: Program;
    readonly pubkey: web3.PublicKey;
    private data;
    private lookupTable;
    private lookupTableRefreshTime;
    static readonly DEFAULT_DEVNET_KEY: web3.PublicKey;
    static readonly DEFAULT_MAINNET_KEY: web3.PublicKey;
    /**
     * Loads the default queue for the current network
     *
     * Automatically detects whether you're on mainnet or devnet and loads
     * the appropriate default queue. This is the recommended way to get
     * started with Switchboard On-Demand.
     *
     * @param {Program} program - Anchor program instance
     * @returns {Promise<Queue>} The default queue for your network
     *
     * @example
     * ```typescript
     * const queue = await Queue.loadDefault(program);
     * console.log('Using queue:', queue.pubkey.toBase58());
     * ```
     */
    static loadDefault(program: Program): Promise<Queue>;
    /**
     * Fetches a gateway URL from the Crossbar network
     *
     * The gateway is the interface to oracle operators. This method
     * automatically detects your network and returns an appropriate
     * gateway for fetching oracle data.
     *
     * @param {CrossbarClient} crossbar - Crossbar client instance
     * @returns {Promise<Gateway>} Gateway instance for oracle communication
     *
     * @example
     * ```typescript
     * const crossbar = CrossbarClient.default();
     * const gateway = await queue.fetchGatewayFromCrossbar(crossbar);
     * ```
     */
    fetchGatewayFromCrossbar(crossbar: CrossbarClient): Promise<Gateway>;
    /**
     * Creates a new queue account
     *
     * @param {Program} program - Anchor program instance
     * @param {Object} params - Queue configuration parameters
     * @returns {Promise<[Queue, web3.Keypair, web3.TransactionInstruction]>}
     *          Tuple of [Queue instance, keypair, creation instruction]
     */
    static createIx(program: Program, params: {
        allowAuthorityOverrideAfter?: number;
        requireAuthorityHeartbeatPermission?: boolean;
        requireUsagePermission?: boolean;
        maxQuoteVerificationAge?: number;
        reward?: number;
        nodeTimeout?: number;
        lutSlot?: number;
    }): Promise<[Queue, web3.Keypair, web3.TransactionInstruction]>;
    /**
     * Creates a new instance of the `Queue` account with a PDA for SVM (non-solana) chains.
     * @param program The anchor program instance.
     * @param params The initialization parameters for the queue.
     * @returns
     */
    static createIxSVM(program: Program, params: {
        sourceQueueKey: web3.PublicKey;
        allowAuthorityOverrideAfter?: number;
        requireAuthorityHeartbeatPermission?: boolean;
        requireUsagePermission?: boolean;
        maxQuoteVerificationAge?: number;
        reward?: number;
        nodeTimeout?: number;
        lutSlot?: number;
    }): Promise<[Queue, web3.TransactionInstruction]>;
    /**
     * Add an Oracle to a queue and set permissions
     * @param program
     * @param params
     */
    overrideSVM(params: {
        oracle: web3.PublicKey;
        secp256k1Signer: Buffer;
        maxQuoteVerificationAge: number;
        mrEnclave: Buffer;
        slot: number;
    }): Promise<web3.TransactionInstruction>;
    /**
     *  Fetches signatures from a random gateway on the queue.
     *
     *  REST API endpoint: /api/v1/fetch_signatures
     *
     *  @param recentHash The chain metadata to sign with. Blockhash or slothash.
     *  @param jobs The oracle jobs to perform.
     *  @param numSignatures The number of oracles to fetch signatures from.
     *  @returns A promise that resolves to the feed evaluation responses.
     *  @throws if the request fails.
     */
    static fetchSignatures(program: Program, params: {
        gateway?: string;
        queue: web3.PublicKey;
        recentHash?: string;
        jobs: IOracleJob[];
        numSignatures?: number;
        maxVariance?: number;
        minResponses?: number;
    }): Promise<{
        responses: FeedEvalResponse[];
        failures: string[];
    }>;
    static fetchSignaturesMulti(program: Program, params: {
        gateway?: string;
        queue: web3.PublicKey;
        recentHash?: string;
        feedConfigs: FeedRequest[];
        minResponses?: number;
    }): Promise<FetchSignaturesMultiResponse>;
    static fetchSignaturesBatch(program: Program, params: {
        gateway?: string;
        queue: web3.PublicKey;
        recentHash?: string;
        feedConfigs: FeedRequest[];
        minResponses?: number;
    }): Promise<FetchSignaturesBatchResponse>;
    static fetchSignaturesConsensus(program: Program, params: {
        gateway?: string;
        queue: web3.PublicKey;
        feedConfigs: FeedRequest[];
        useTimestamp?: boolean;
        numSignatures?: number;
    }): Promise<FetchSignaturesConsensusResponse>;
    /**
     * @deprecated
     * Deprecated. Use {@linkcode @switchboard-xyz/common#FeedHash.compute} instead.
     */
    static fetchFeedHash(program: Program, params: {
        gateway?: string;
        queue: web3.PublicKey;
        recentHash?: string;
        jobs: IOracleJob[];
        numSignatures?: number;
        maxVariance?: number;
        minResponses?: number;
    }): Promise<Buffer>;
    /**
     *  Constructs a `OnDemandQueue` instance.
     *
     *  @param program The Anchor program instance.
     *  @param pubkey The public key of the queue account.
     */
    constructor(program: Program, pubkey: web3.PublicKey);
    /**
     *  Loads the queue data from on chain and returns the listed oracle keys.
     *
     *  @returns A promise that resolves to an array of oracle public keys.
     */
    fetchOracleKeys(): Promise<web3.PublicKey[]>;
    /**
     *  Loads the queue data from on chain and returns the listed gateways.
     *
     *  @returns A promise that resolves to an array of gateway URIs.
     */
    fetchAllGateways(): Promise<Gateway[]>;
    /**
     * Fetches a gateway interface for interacting with oracle nodes.
     *
     * @param gatewayUrl - Optional URL of a specific gateway to use. If not provided,
     *                     a random gateway will be selected from the queue's available gateways.
     * @returns Gateway - A Gateway instance for making oracle requests
     * @throws {Error} If no gateways are available on the queue when selecting randomly
     */
    fetchGateway(gatewayUrl?: string): Promise<Gateway>;
    /**
     *  Fetches signatures from a random gateway on the queue.
     *
     *  REST API endpoint: /api/v1/fetch_signatures
     *
     *  @param gateway The gateway to fetch signatures from. If not provided, a gateway will be automatically selected.
     *  @param recentHash The chain metadata to sign with. Blockhash or slothash.
     *  @param jobs The oracle jobs to perform.
     *  @param numSignatures The number of oracles to fetch signatures from.
     *  @param maxVariance The maximum variance allowed in the responses.
     *  @param minResponses The minimum number of responses to attempt to fetch.
     *  @returns A promise that resolves to the feed evaluation responses.
     *  @throws if the request fails.
     */
    fetchSignatures(params: {
        gateway?: string;
        recentHash?: string;
        jobs: IOracleJob[];
        numSignatures?: number;
        maxVariance?: number;
        minResponses?: number;
        useTimestamp?: boolean;
    }): Promise<{
        responses: FeedEvalResponse[];
        failures: string[];
    }>;
    fetchSignaturesMulti(params: {
        gateway?: string;
        recentHash?: string;
        feedConfigs: FeedRequest[];
        numSignatures?: number;
        useTimestamp?: boolean;
    }): Promise<FetchSignaturesMultiResponse>;
    fetchSignaturesConsensus(params: {
        gateway?: string;
        feedConfigs: FeedRequest[];
        useTimestamp?: boolean;
        numSignatures?: number;
    }): Promise<FetchSignaturesConsensusResponse>;
    fetchSignaturesBatch(params: {
        gateway?: string;
        recentHash?: string;
        feedConfigs: FeedRequest[];
        numSignatures?: number;
        useTimestamp?: boolean;
    }): Promise<FetchSignaturesBatchResponse>;
    /**
     *  Loads the queue data for this {@linkcode Queue} account from on chain.
     *
     *  @returns A promise that resolves to the queue data.
     *  @throws if the queue account does not exist.
     */
    static loadData(program: Program, pubkey: web3.PublicKey): Promise<QueueAccountData>;
    /**
     *  Loads the queue data for this {@linkcode Queue} account from on chain.
     *
     *  @returns A promise that resolves to the queue data.
     *  @throws if the queue account does not exist.
     */
    loadData(): Promise<QueueAccountData>;
    /**
     *  Adds a new MR enclave to the queue.
     *  This will allow the queue to accept signatures from the given MR enclave.
     *  @param mrEnclave The MR enclave to add.
     *  @returns A promise that resolves to the transaction instruction.
     *  @throws if the request fails.
     *  @throws if the MR enclave is already added.
     *  @throws if the MR enclave is invalid.
     *  @throws if the MR enclave is not a valid length.
     */
    addMrEnclaveIx(params: {
        mrEnclave: Uint8Array;
    }): Promise<web3.TransactionInstruction>;
    /**
     *  Removes an MR enclave from the queue.
     *  This will prevent the queue from accepting signatures from the given MR enclave.
     *  @param mrEnclave The MR enclave to remove.
     *  @returns A promise that resolves to the transaction instruction.
     *  @throws if the request fails.
     *  @throws if the MR enclave is not present.
     */
    rmMrEnclaveIx(params: {
        mrEnclave: Uint8Array;
    }): Promise<web3.TransactionInstruction>;
    /**
     * Sets the queue configurations.
     * @param params.authority The new authority for the queue.
     * @param params.reward The new reward for the queue.
     * @param params.nodeTimeout The new node timeout for the queue.
     * @returns A promise that resolves to the transaction instruction.
     */
    setConfigsIx(params: {
        authority?: web3.PublicKey;
        reward?: number;
        nodeTimeout?: number;
    }): Promise<web3.TransactionInstruction>;
    setNcnIx(params: {
        ncn: web3.PublicKey;
    }): Promise<web3.TransactionInstruction>;
    setVaultIx(params: {
        vault: web3.PublicKey;
        enable: boolean;
    }): Promise<web3.TransactionInstruction>;
    allowSubsidyIx(params: {
        enable: boolean;
    }): Promise<web3.TransactionInstruction>;
    /**
     * Sets the oracle permission on the queue.
     * @param params.oracle The oracle to set the permission for.
     * @param params.permission The permission to set.
     * @param params.enabled Whether the permission is enabled.
     * @returns A promise that resolves to the transaction instruction   */
    setOraclePermissionIx(params: {
        oracle: web3.PublicKey;
        permission: SwitchboardPermission;
        enable: boolean;
    }): Promise<web3.TransactionInstruction>;
    /**
     *  Removes all MR enclaves from the queue.
     *  @returns A promise that resolves to an array of transaction instructions.
     *  @throws if the request fails.
     */
    rmAllMrEnclaveIxs(): Promise<Array<web3.TransactionInstruction>>;
    /**
     *  Fetches most recently added and verified Oracle Key.
     *  @returns A promise that resolves to an oracle public key.
     *  @throws if the request fails.
     */
    fetchFreshOracle(): Promise<web3.PublicKey>;
    /**
     * Get the PDA for the queue (SVM chains that are not solana)
     * @returns Queue PDA Pubkey
     */
    queuePDA(): web3.PublicKey;
    /**
     * Get the PDA for the queue (SVM chains that are not solana)
     * @param program Anchor program
     * @param pubkey Queue pubkey
     * @returns Queue PDA Pubkey
     */
    static queuePDA(program: Program, pubkey: web3.PublicKey): web3.PublicKey;
    loadLookupTable(): Promise<web3.AddressLookupTableAccount>;
    /**
     * Fetches oracle bundle and creates verification instruction
     *
     * This is the primary method for fetching oracle data in the bundle approach.
     * It retrieves signed price data from oracle operators and creates the
     * instruction to verify signatures on-chain.
     *
     * @param {Gateway} gateway - Gateway instance for oracle communication
     * @param {CrossbarClient} crossbar - Crossbar client for data routing
     * @param {string[]} feedHashes - Array of feed hashes to fetch (hex strings)
     * @param {number} numSignatures - Number of oracle signatures required (default: 1)
     * @returns {Promise<[web3.TransactionInstruction, Buffer]>}
     *          Tuple of [signature verification instruction, bundle data]
     *
     * @example
     * ```typescript
     * // Fetch prices for BTC and ETH
     * const [sigVerifyIx, bundle] = await queue.fetchUpdateBundleIx(
     *   gateway,
     *   crossbar,
     *   ['0x1234...', '0x5678...'], // Feed hashes
     *   3 // Require 3 oracle signatures
     * );
     *
     * // Use in your transaction
     * const tx = await asV0Tx({
     *   connection,
     *   ixs: [sigVerifyIx, yourProgramIx],
     *   signers: [payer],
     * });
     * ```
     */
    fetchUpdateBundleIx(gateway: Gateway, crossbar: CrossbarClient, feedHashes: string[], numSignatures?: number): Promise<[web3.TransactionInstruction, Buffer]>;
}
export declare function serializeBundleData(data: {
    slotLower: number;
    feedInfos: {
        value: BN;
        checksum: Buffer;
        numOracles: number;
    }[];
}): Buffer;
//# sourceMappingURL=queue.d.ts.map