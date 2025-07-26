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
exports.InstructionUtils = void 0;
const anchor_31_1 = require("@coral-xyz/anchor-31");
/**
 * Transaction building utilities for Switchboard On-Demand
 *
 * The InstructionUtils class provides helper methods for building
 * optimized Solana transactions, particularly versioned transactions
 * (v0) with automatic compute budget management.
 *
 * @class InstructionUtils
 */
class InstructionUtils {
    /**
     *  Disable instantiation of the InstructionUtils class
     */
    constructor() { }
    /**
     * Builds a versioned transaction with automatic compute budget optimization
     *
     * This method simplifies transaction creation by:
     * - Automatically simulating to determine compute requirements
     * - Adding appropriate compute budget instructions
     * - Using address lookup tables for smaller transactions
     * - Handling transaction size limits gracefully
     *
     * The method performs two key optimizations:
     * 1. **Compute Budget**: Simulates first to determine actual compute usage,
     *    then sets the limit based on actual needs (with optional buffer)
     * 2. **Transaction Size**: Uses v0 transactions with lookup tables to
     *    minimize transaction size
     *
     * @param {Object} params - Transaction building parameters
     * @param {web3.Connection} params.connection - Solana RPC connection
     * @param {web3.TransactionInstruction[]} params.ixs - Instructions to include
     * @param {web3.PublicKey} params.payer - Transaction fee payer (defaults to first signer)
     * @param {number} params.computeUnitLimitMultiple - Multiplier for compute limit (e.g., 1.3 = 30% buffer)
     * @param {number} params.computeUnitPrice - Priority fee in microlamports per compute unit
     * @param {web3.AddressLookupTableAccount[]} params.lookupTables - Address lookup tables to use
     * @param {web3.Signer[]} params.signers - Transaction signers
     * @returns {Promise<web3.VersionedTransaction>} Signed versioned transaction ready to send
     *
     * @throws {Error} If transaction is too large or payer not provided
     *
     * @example
     * ```typescript
     * const tx = await InstructionUtils.asV0TxWithComputeIxs({
     *   connection,
     *   ixs: [updateIx, userIx],
     *   signers: [payer],
     *   computeUnitPrice: 10_000, // 0.01 lamports per compute unit
     *   computeUnitLimitMultiple: 1.3, // 30% safety buffer
     *   lookupTables: [lut],
     * });
     *
     * const signature = await connection.sendTransaction(tx);
     * ```
     */
    static asV0TxWithComputeIxs(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            let payer = params.payer;
            if (!payer) {
                if (!((_a = params.signers) === null || _a === void 0 ? void 0 : _a.length)) {
                    throw new Error('Payer not provided');
                }
                payer = params.signers[0].publicKey;
            }
            const priorityFeeIx = anchor_31_1.web3.ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: (_b = params.computeUnitPrice) !== null && _b !== void 0 ? _b : 0,
            });
            const simulationComputeLimitIx = anchor_31_1.web3.ComputeBudgetProgram.setComputeUnitLimit({
                units: 1400000, // 1.4M compute units
            });
            const recentBlockhash = (yield params.connection.getLatestBlockhash())
                .blockhash;
            const simulateMessageV0 = new anchor_31_1.web3.TransactionMessage({
                recentBlockhash,
                instructions: [...params.ixs, priorityFeeIx, simulationComputeLimitIx],
                payerKey: payer,
            }).compileToV0Message((_c = params.lookupTables) !== null && _c !== void 0 ? _c : []);
            const simulateTx = new anchor_31_1.web3.VersionedTransaction(simulateMessageV0);
            try {
                simulateTx.serialize();
            }
            catch (e) {
                if (e instanceof RangeError) {
                    throw new Error('Transaction failed to serialize: Transaction too large');
                }
                throw e;
            }
            const simulationResult = yield params.connection.simulateTransaction(simulateTx, { commitment: 'processed', sigVerify: false });
            const simulationUnitsConsumed = simulationResult.value.unitsConsumed;
            const computeLimitIx = anchor_31_1.web3.ComputeBudgetProgram.setComputeUnitLimit({
                units: Math.floor(simulationUnitsConsumed * ((_d = params.computeUnitLimitMultiple) !== null && _d !== void 0 ? _d : 1)),
            });
            const messageV0 = new anchor_31_1.web3.TransactionMessage({
                recentBlockhash,
                instructions: [...params.ixs, priorityFeeIx, computeLimitIx],
                payerKey: payer,
            }).compileToV0Message((_e = params.lookupTables) !== null && _e !== void 0 ? _e : []);
            const tx = new anchor_31_1.web3.VersionedTransaction(messageV0);
            tx.sign((_f = params.signers) !== null && _f !== void 0 ? _f : []);
            return tx;
        });
    }
}
exports.InstructionUtils = InstructionUtils;
//# sourceMappingURL=InstructionUtils.js.map