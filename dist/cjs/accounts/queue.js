"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
exports.serializeBundleData = serializeBundleData;
const constants_js_1 = require("../constants.js");
const Secp256k1InstructionUtils_js_1 = require("../instruction-utils/Secp256k1InstructionUtils.js");
const gateway_js_1 = require("../oracle-interfaces/gateway.js");
const index_js_1 = require("../utils/index.js");
const lookupTable_js_1 = require("../utils/lookupTable.js");
const oracle_js_1 = require("./oracle.js");
const permission_js_1 = require("./permission.js");
const state_js_1 = require("./state.js");
const anchor_31_1 = require("@coral-xyz/anchor-31");
const common_1 = require("@switchboard-xyz/common");
const buffer_1 = require("buffer");
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
class Queue {
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
    static loadDefault(program) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const queue = new Queue(program, Queue.DEFAULT_MAINNET_KEY);
                yield queue.loadData();
                return queue;
            }
            catch (_a) {
                // do nothing
            }
            const queue = new Queue(program, Queue.DEFAULT_DEVNET_KEY);
            return queue;
        });
    }
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
    fetchGatewayFromCrossbar(crossbar) {
        return __awaiter(this, void 0, void 0, function* () {
            let network = 'mainnet';
            try {
                const queue = new Queue(this.program, Queue.DEFAULT_MAINNET_KEY);
                yield queue.loadData();
            }
            catch (_a) {
                network = 'devnet';
            }
            const gatewayUrl = (yield crossbar.fetchGateways(network))[0];
            const gateway = new gateway_js_1.Gateway(this.program, gatewayUrl);
            return gateway;
        });
    }
    /**
     * Creates a new queue account
     *
     * @param {Program} program - Anchor program instance
     * @param {Object} params - Queue configuration parameters
     * @returns {Promise<[Queue, web3.Keypair, web3.TransactionInstruction]>}
     *          Tuple of [Queue instance, keypair, creation instruction]
     */
    static createIx(program, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const queue = anchor_31_1.web3.Keypair.generate();
            const allowAuthorityOverrideAfter = (_a = params.allowAuthorityOverrideAfter) !== null && _a !== void 0 ? _a : 60 * 60;
            const requireAuthorityHeartbeatPermission = (_b = params.requireAuthorityHeartbeatPermission) !== null && _b !== void 0 ? _b : true;
            const requireUsagePermission = (_c = params.requireUsagePermission) !== null && _c !== void 0 ? _c : false;
            const maxQuoteVerificationAge = (_d = params.maxQuoteVerificationAge) !== null && _d !== void 0 ? _d : 60 * 60 * 24 * 7;
            const reward = (_e = params.reward) !== null && _e !== void 0 ? _e : 1000000;
            const nodeTimeout = (_f = params.nodeTimeout) !== null && _f !== void 0 ? _f : 300;
            const payer = (0, index_js_1.getNodePayer)(program);
            // Prepare accounts for the transaction
            const lutSigner = (0, lookupTable_js_1.getLutSigner)(program.programId, queue.publicKey);
            const recentSlot = (_g = params.lutSlot) !== null && _g !== void 0 ? _g : (yield program.provider.connection.getSlot('finalized'));
            const lutKey = (0, lookupTable_js_1.getLutKey)(lutSigner, recentSlot);
            const ix = yield program.instruction.queueInit({
                allowAuthorityOverrideAfter,
                requireAuthorityHeartbeatPermission,
                requireUsagePermission,
                maxQuoteVerificationAge,
                reward,
                nodeTimeout,
                recentSlot: new anchor_31_1.BN(recentSlot),
            }, {
                accounts: {
                    queue: queue.publicKey,
                    queueEscrow: yield (0, index_js_1.getAssociatedTokenAddress)(constants_js_1.SOL_NATIVE_MINT, queue.publicKey),
                    authority: payer.publicKey,
                    payer: payer.publicKey,
                    systemProgram: anchor_31_1.web3.SystemProgram.programId,
                    tokenProgram: constants_js_1.SPL_TOKEN_PROGRAM_ID,
                    nativeMint: constants_js_1.SOL_NATIVE_MINT,
                    programState: state_js_1.State.keyFromSeed(program),
                    lutSigner: lutSigner,
                    lut: lutKey,
                    addressLookupTableProgram: anchor_31_1.web3.AddressLookupTableProgram.programId,
                    associatedTokenProgram: constants_js_1.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
                },
                signers: [payer, queue],
            });
            return [new Queue(program, queue.publicKey), queue, ix];
        });
    }
    /**
     * Creates a new instance of the `Queue` account with a PDA for SVM (non-solana) chains.
     * @param program The anchor program instance.
     * @param params The initialization parameters for the queue.
     * @returns
     */
    static createIxSVM(program, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            // Generate the queue PDA for the given source queue key
            const [queue] = anchor_31_1.web3.PublicKey.findProgramAddressSync([buffer_1.Buffer.from('Queue'), params.sourceQueueKey.toBuffer()], program.programId);
            const allowAuthorityOverrideAfter = (_a = params.allowAuthorityOverrideAfter) !== null && _a !== void 0 ? _a : 60 * 60;
            const requireAuthorityHeartbeatPermission = (_b = params.requireAuthorityHeartbeatPermission) !== null && _b !== void 0 ? _b : true;
            const requireUsagePermission = (_c = params.requireUsagePermission) !== null && _c !== void 0 ? _c : false;
            const maxQuoteVerificationAge = (_d = params.maxQuoteVerificationAge) !== null && _d !== void 0 ? _d : 60 * 60 * 24 * 7;
            const reward = (_e = params.reward) !== null && _e !== void 0 ? _e : 1000000;
            const nodeTimeout = (_f = params.nodeTimeout) !== null && _f !== void 0 ? _f : 300;
            const payer = (0, index_js_1.getNodePayer)(program);
            // Prepare accounts for the transaction
            const lutSigner = (0, lookupTable_js_1.getLutSigner)(program.programId, queue);
            const recentSlot = (_g = params.lutSlot) !== null && _g !== void 0 ? _g : (yield program.provider.connection.getSlot('finalized'));
            const lutKey = (0, lookupTable_js_1.getLutKey)(lutSigner, recentSlot);
            const ix = program.instruction.queueInitSvm({
                allowAuthorityOverrideAfter,
                requireAuthorityHeartbeatPermission,
                requireUsagePermission,
                maxQuoteVerificationAge,
                reward,
                nodeTimeout,
                recentSlot: new anchor_31_1.BN(recentSlot),
                sourceQueueKey: params.sourceQueueKey,
            }, {
                accounts: {
                    queue: queue,
                    queueEscrow: yield (0, index_js_1.getAssociatedTokenAddress)(constants_js_1.SOL_NATIVE_MINT, queue, true),
                    authority: payer.publicKey,
                    payer: payer.publicKey,
                    systemProgram: anchor_31_1.web3.SystemProgram.programId,
                    tokenProgram: constants_js_1.SPL_TOKEN_PROGRAM_ID,
                    nativeMint: constants_js_1.SOL_NATIVE_MINT,
                    programState: state_js_1.State.keyFromSeed(program),
                    lutSigner: lutSigner,
                    lut: lutKey,
                    addressLookupTableProgram: anchor_31_1.web3.AddressLookupTableProgram.programId,
                    associatedTokenProgram: constants_js_1.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
                },
                signers: [payer],
            });
            return [new Queue(program, queue), ix];
        });
    }
    /**
     * Add an Oracle to a queue and set permissions
     * @param program
     * @param params
     */
    overrideSVM(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const stateKey = state_js_1.State.keyFromSeed(this.program);
            const { authority } = yield this.loadData();
            const ix = this.program.instruction.queueOverrideSvm({
                secp256K1Signer: Array.from(params.secp256k1Signer),
                maxQuoteVerificationAge: new anchor_31_1.BN(params.maxQuoteVerificationAge),
                mrEnclave: params.mrEnclave,
                slot: new anchor_31_1.BN(params.slot),
            }, {
                accounts: {
                    queue: this.pubkey,
                    oracle: params.oracle,
                    authority,
                    state: stateKey,
                },
            });
            return ix;
        });
    }
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
    static fetchSignatures(program, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const queueAccount = new Queue(program, params.queue);
            return queueAccount.fetchSignatures(params);
        });
    }
    static fetchSignaturesMulti(program, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const queueAccount = new Queue(program, params.queue);
            return queueAccount.fetchSignaturesMulti(params);
        });
    }
    static fetchSignaturesBatch(program, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const queueAccount = new Queue(program, params.queue);
            return queueAccount.fetchSignaturesBatch(params);
        });
    }
    static fetchSignaturesConsensus(program, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const queueAccount = new Queue(program, params.queue);
            return queueAccount.fetchSignaturesConsensus({
                gateway: params.gateway,
                feedConfigs: params.feedConfigs,
                useTimestamp: params.useTimestamp,
                numSignatures: params.numSignatures,
            });
        });
    }
    /**
     * @deprecated
     * Deprecated. Use {@linkcode @switchboard-xyz/common#FeedHash.compute} instead.
     */
    static fetchFeedHash(program, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const queueAccount = new Queue(program, params.queue);
            const oracleSigs = yield queueAccount.fetchSignatures(params);
            return buffer_1.Buffer.from(oracleSigs[0].feed_hash, 'hex');
        });
    }
    /**
     *  Constructs a `OnDemandQueue` instance.
     *
     *  @param program The Anchor program instance.
     *  @param pubkey The public key of the queue account.
     */
    constructor(program, pubkey) {
        this.program = program;
        this.pubkey = pubkey;
        this.data = null;
        this.lookupTable = null;
        this.lookupTableRefreshTime = 0;
        if (this.pubkey === undefined) {
            throw new Error('NoPubkeyProvided');
        }
    }
    /**
     *  Loads the queue data from on chain and returns the listed oracle keys.
     *
     *  @returns A promise that resolves to an array of oracle public keys.
     */
    fetchOracleKeys() {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.loadData();
            const oracles = data.oracleKeys.slice(0, data.oracleKeysLen);
            return oracles;
        });
    }
    /**
     *  Loads the queue data from on chain and returns the listed gateways.
     *
     *  @returns A promise that resolves to an array of gateway URIs.
     */
    fetchAllGateways() {
        return __awaiter(this, void 0, void 0, function* () {
            const program = this.program;
            const oracles = yield this.fetchOracleKeys();
            const oracleAccounts = yield oracle_js_1.Oracle.loadMany(program, oracles);
            const gatewayUris = oracleAccounts
                .map(oracleAccount => oracleAccount ? (0, common_1.toUtf8)(oracleAccount.gatewayUri) : '')
                .filter(gatewayUri => gatewayUri.length > 0)
                .filter(gatewayUri => !gatewayUri.includes('infstones'));
            const tests = [];
            for (const i in gatewayUris) {
                const gw = new gateway_js_1.Gateway(program, gatewayUris[i], oracles[i]);
                tests.push({ gateway: gw, promise: gw.test() });
            }
            let gateways = [];
            for (const test of tests) {
                try {
                    const { gateway, promise } = test;
                    // Test gateways to see if they are good. Timeout after 2 seconds.
                    const isGood = yield common_1.AsyncUtils.promiseWithTimeout(2000, promise);
                    if (!isGood)
                        continue;
                    // If the gateway is good, add it to the list
                    gateways.push(gateway);
                }
                catch (e) {
                    console.log('Timeout', e);
                }
            }
            gateways = gateways.sort(() => Math.random() - 0.5);
            return gateways;
        });
    }
    /**
     * Fetches a gateway interface for interacting with oracle nodes.
     *
     * @param gatewayUrl - Optional URL of a specific gateway to use. If not provided,
     *                     a random gateway will be selected from the queue's available gateways.
     * @returns Gateway - A Gateway instance for making oracle requests
     * @throws {Error} If no gateways are available on the queue when selecting randomly
     */
    fetchGateway(gatewayUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (gatewayUrl)
                return new gateway_js_1.Gateway(this.program, gatewayUrl);
            const gateways = yield this.fetchAllGateways();
            if (gateways.length === 0)
                throw new Error('NoGatewayAvailable');
            return gateways[Math.floor(Math.random() * gateways.length)];
        });
    }
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
    fetchSignatures(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const gateway = yield this.fetchGateway(params.gateway);
            return yield gateway.fetchSignatures({
                recentHash: params.recentHash,
                jobs: params.jobs,
                numSignatures: params.numSignatures,
                maxVariance: params.maxVariance,
                minResponses: params.minResponses,
                useTimestamp: params.useTimestamp,
            });
        });
    }
    fetchSignaturesMulti(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const gateway = yield this.fetchGateway(params.gateway);
            return yield gateway.fetchSignaturesMulti({
                recentHash: params.recentHash,
                feedConfigs: params.feedConfigs,
                numSignatures: params.numSignatures,
                useTimestamp: params.useTimestamp,
            });
        });
    }
    fetchSignaturesConsensus(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const gateway = yield this.fetchGateway(params.gateway);
            return yield gateway.fetchSignaturesConsensus({
                feedConfigs: params.feedConfigs,
                useTimestamp: params.useTimestamp,
                numSignatures: params.numSignatures,
            });
        });
    }
    fetchSignaturesBatch(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const gateway = yield this.fetchGateway(params.gateway);
            return yield gateway.fetchSignaturesBatch({
                recentHash: params.recentHash,
                feedConfigs: params.feedConfigs,
                numSignatures: params.numSignatures,
                useTimestamp: params.useTimestamp,
            });
        });
    }
    /**
     *  Loads the queue data for this {@linkcode Queue} account from on chain.
     *
     *  @returns A promise that resolves to the queue data.
     *  @throws if the queue account does not exist.
     */
    static loadData(program, pubkey) {
        return program.account['queueAccountData'].fetch(pubkey);
    }
    /**
     *  Loads the queue data for this {@linkcode Queue} account from on chain.
     *
     *  @returns A promise that resolves to the queue data.
     *  @throws if the queue account does not exist.
     */
    loadData() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.data === null || this.data === undefined) {
                this.data = yield Queue.loadData(this.program, this.pubkey);
            }
            return this.data;
        });
    }
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
    addMrEnclaveIx(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const stateKey = state_js_1.State.keyFromSeed(this.program);
            const state = yield state_js_1.State.loadData(this.program);
            const programAuthority = state.authority;
            const { authority } = yield this.loadData();
            const ix = yield this.program.instruction.queueAddMrEnclave({ mrEnclave: params.mrEnclave }, {
                accounts: {
                    queue: this.pubkey,
                    authority,
                    programAuthority,
                    state: stateKey,
                },
            });
            return ix;
        });
    }
    /**
     *  Removes an MR enclave from the queue.
     *  This will prevent the queue from accepting signatures from the given MR enclave.
     *  @param mrEnclave The MR enclave to remove.
     *  @returns A promise that resolves to the transaction instruction.
     *  @throws if the request fails.
     *  @throws if the MR enclave is not present.
     */
    rmMrEnclaveIx(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const stateKey = state_js_1.State.keyFromSeed(this.program);
            const state = yield state_js_1.State.loadData(this.program);
            const programAuthority = state.authority;
            const { authority } = yield this.loadData();
            const ix = yield this.program.instruction.queueRemoveMrEnclave({ mrEnclave: params.mrEnclave }, {
                accounts: {
                    queue: this.pubkey,
                    authority,
                    programAuthority,
                    state: stateKey,
                },
            });
            return ix;
        });
    }
    /**
     * Sets the queue configurations.
     * @param params.authority The new authority for the queue.
     * @param params.reward The new reward for the queue.
     * @param params.nodeTimeout The new node timeout for the queue.
     * @returns A promise that resolves to the transaction instruction.
     */
    setConfigsIx(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const data = yield this.loadData();
            const stateKey = state_js_1.State.keyFromSeed(this.program);
            const nodeTimeout = params.nodeTimeout ? new anchor_31_1.BN(params.nodeTimeout) : null;
            const ix = yield this.program.instruction.queueSetConfigs({
                authority: (_a = params.authority) !== null && _a !== void 0 ? _a : null,
                reward: (_b = params.reward) !== null && _b !== void 0 ? _b : null,
                nodeTimeout: nodeTimeout,
            }, {
                accounts: {
                    queue: this.pubkey,
                    authority: data.authority,
                    state: stateKey,
                },
            });
            return ix;
        });
    }
    setNcnIx(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.loadData();
            const authority = data.authority;
            const state = state_js_1.State.keyFromSeed(this.program);
            return this.program.instruction.queueSetNcn({}, {
                accounts: {
                    queue: this.pubkey,
                    authority,
                    state,
                    ncn: params.ncn,
                },
            });
        });
    }
    setVaultIx(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.loadData();
            const authority = data.authority;
            const state = state_js_1.State.keyFromSeed(this.program);
            const ncn = data.ncn;
            return this.program.instruction.queueSetVault({
                enable: params.enable,
            }, {
                accounts: {
                    queue: this.pubkey,
                    authority,
                    state,
                    ncn,
                    vault: params.vault,
                },
            });
        });
    }
    allowSubsidyIx(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.loadData();
            const authority = data.authority;
            const state = state_js_1.State.keyFromSeed(this.program);
            return this.program.instruction.queueAllowSubsidies({
                allowSubsidies: params.enable,
            }, {
                accounts: {
                    queue: this.pubkey,
                    authority,
                    state,
                },
            });
        });
    }
    /**
     * Sets the oracle permission on the queue.
     * @param params.oracle The oracle to set the permission for.
     * @param params.permission The permission to set.
     * @param params.enabled Whether the permission is enabled.
     * @returns A promise that resolves to the transaction instruction   */
    setOraclePermissionIx(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.loadData();
            return permission_js_1.Permission.setIx(this.program, {
                authority: data.authority,
                grantee: params.oracle,
                granter: this.pubkey,
                permission: params.permission,
                enable: params.enable,
            });
        });
    }
    /**
     *  Removes all MR enclaves from the queue.
     *  @returns A promise that resolves to an array of transaction instructions.
     *  @throws if the request fails.
     */
    rmAllMrEnclaveIxs() {
        return __awaiter(this, void 0, void 0, function* () {
            const { mrEnclaves, mrEnclavesLen } = yield this.loadData();
            const activeEnclaves = mrEnclaves.slice(0, mrEnclavesLen);
            const ixs = [];
            for (const mrEnclave of activeEnclaves) {
                ixs.push(yield this.rmMrEnclaveIx({ mrEnclave }));
            }
            return ixs;
        });
    }
    /**
     *  Fetches most recently added and verified Oracle Key.
     *  @returns A promise that resolves to an oracle public key.
     *  @throws if the request fails.
     */
    fetchFreshOracle() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Math.floor(+new Date() / 1000);
            const oracles = yield this.fetchOracleKeys();
            const oracleAccounts = yield oracle_js_1.Oracle.loadMany(this.program, oracles);
            const oracleUris = oracleAccounts
                .map(data => (0, common_1.toUtf8)(data.gatewayUri))
                .filter(gatewayUri => gatewayUri.length);
            const tests = [];
            for (const i in oracleUris) {
                const gw = new gateway_js_1.Gateway(this.program, oracleUris[i], oracles[i]);
                tests.push(gw.test());
            }
            const zip = [];
            for (let i = 0; i < oracles.length; i++) {
                try {
                    // Test gateways to see if they are good. Timeout after 2 seconds.
                    const isGood = common_1.AsyncUtils.promiseWithTimeout(2000, tests[i]);
                    if (!isGood)
                        continue;
                }
                catch (e) {
                    console.log('Gateway Timeout', e);
                }
                zip.push({ data: oracleAccounts[i], key: oracles[i] });
            }
            const validOracles = zip
                .filter(x => x.data.enclave.verificationStatus === 4) // value 4 is for verified
                .filter(x => x.data.enclave.validUntil.gt(new anchor_31_1.BN(now + 3600))); // valid for 1 hour at least
            if (validOracles.length === 0)
                throw new Error('NoValidOracles');
            const chosen = validOracles[Math.floor(Math.random() * validOracles.length)];
            return chosen.key;
        });
    }
    /**
     * Get the PDA for the queue (SVM chains that are not solana)
     * @returns Queue PDA Pubkey
     */
    queuePDA() {
        return Queue.queuePDA(this.program, this.pubkey);
    }
    /**
     * Get the PDA for the queue (SVM chains that are not solana)
     * @param program Anchor program
     * @param pubkey Queue pubkey
     * @returns Queue PDA Pubkey
     */
    static queuePDA(program, pubkey) {
        const [queuePDA] = anchor_31_1.web3.PublicKey.findProgramAddressSync([buffer_1.Buffer.from('Queue'), pubkey.toBuffer()], program.programId);
        return queuePDA;
    }
    // auto refresh lookup table if it is older than 5 minutes
    loadLookupTable() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            if (this.lookupTable && now - this.lookupTableRefreshTime < 5 * 60 * 1000) {
                return this.lookupTable;
            }
            const data = yield this.loadData();
            const lutSigner = (0, lookupTable_js_1.getLutSigner)(this.program.programId, this.pubkey);
            const lutKey = (0, lookupTable_js_1.getLutKey)(lutSigner, data.lutSlot);
            const accnt = yield this.program.provider.connection.getAddressLookupTable(lutKey);
            this.lookupTable = accnt.value;
            return accnt.value;
        });
    }
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
    fetchUpdateBundleIx(gateway_1, crossbar_1, feedHashes_1) {
        return __awaiter(this, arguments, void 0, function* (gateway, crossbar, feedHashes, numSignatures = 1) {
            const response = yield gateway.fetchUpdateBundle(crossbar, feedHashes, numSignatures);
            // Check if oracle_responses is empty
            if (!response.oracle_responses || response.oracle_responses.length === 0) {
                throw new Error('No oracle responses available for creating secp256k1 signatures');
            }
            const secpSignatures = response.oracle_responses.map(oracleResponse => {
                return {
                    ethAddress: buffer_1.Buffer.from(oracleResponse.eth_address, 'hex'),
                    signature: buffer_1.Buffer.from(oracleResponse.signature, 'base64'),
                    message: buffer_1.Buffer.from(oracleResponse.checksum, 'base64'),
                    recoveryId: oracleResponse.recovery_id,
                };
            });
            const secpInstruction = Secp256k1InstructionUtils_js_1.Secp256k1InstructionUtils.buildSecp256k1Instruction(secpSignatures, 0);
            // Prepare the instruction data for the `pullFeedSubmitResponseManySecp` instruction.
            const data = {
                slotLower: Number(response.slot) & 0xff,
                feedInfos: response.median_responses.map(({ value, feed_hash, num_oracles }) => {
                    return {
                        value: new anchor_31_1.BN(value),
                        checksum: buffer_1.Buffer.from(feed_hash, 'hex'),
                        numOracles: num_oracles,
                    };
                }),
            };
            // // Prepare the accounts for the `pullFeedSubmitResponseManySecp` instruction.
            // const accounts = {
            // queue: queue!,
            // recentSlothashes: SPL_SYSVAR_SLOT_HASHES_ID,
            // ixSysvar: SPL_SYSVAR_INSTRUCTIONS_ID,
            // };
            //
            // const verifyIx = this.program.instruction.pullFeedVerifyResponse(
            // instructionData,
            // {
            // accounts,
            // }
            // );
            // Load the lookup tables for the feeds and oracles.
            return [secpInstruction, serializeBundleData(data)];
        });
    }
}
exports.Queue = Queue;
Queue.DEFAULT_DEVNET_KEY = new anchor_31_1.web3.PublicKey('EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7');
Queue.DEFAULT_MAINNET_KEY = new anchor_31_1.web3.PublicKey('A43DyUGA7s8eXPxqEjJY6EBu1KKbNgfxF8h17VAHn13w');
function serializeBundleData(data) {
    const buffers = [];
    // slotLower: 1 byte
    const slotBuffer = buffer_1.Buffer.alloc(1);
    slotBuffer.writeUInt8(data.slotLower);
    buffers.push(slotBuffer);
    for (const feed of data.feedInfos) {
        // checksum: 32 bytes
        if (feed.checksum.length !== 32) {
            throw new Error('Checksum must be 32 bytes');
        }
        buffers.push(feed.checksum);
        // value: 16-byte little-endian i128
        const valueBuf = feed.value.toTwos(128).toArrayLike(buffer_1.Buffer, 'le', 16);
        buffers.push(valueBuf);
        buffers.push(buffer_1.Buffer.from([feed.numOracles]));
    }
    return buffer_1.Buffer.concat(buffers);
}
//# sourceMappingURL=queue.js.map