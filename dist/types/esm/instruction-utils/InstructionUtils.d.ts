import { web3 } from '@coral-xyz/anchor-31';
/**
 * Transaction building utilities for Switchboard On-Demand
 *
 * The InstructionUtils class provides helper methods for building
 * optimized Solana transactions, particularly versioned transactions
 * (v0) with automatic compute budget management.
 *
 * @class InstructionUtils
 */
export declare class InstructionUtils {
    /**
     *  Disable instantiation of the InstructionUtils class
     */
    private constructor();
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
    static asV0TxWithComputeIxs(params: {
        connection: web3.Connection;
        ixs: web3.TransactionInstruction[];
        payer?: web3.PublicKey;
        computeUnitLimitMultiple?: number;
        computeUnitPrice?: number;
        lookupTables?: web3.AddressLookupTableAccount[];
        signers?: web3.Signer[];
    }): Promise<web3.VersionedTransaction>;
}
//# sourceMappingURL=InstructionUtils.d.ts.map