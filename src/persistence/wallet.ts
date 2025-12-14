import { AppDataSource } from "../config/database";
import { Wallet } from "./models/Wallet";

/**
 * Executes a secure fund transfer between two wallets using pessimistic locking.
 * Ensures ACID compliance and prevents race conditions during balance updates.
 */
export const executeTradeTransaction = async (
    sellerUserId: string,
    buyerUserId: string,
    currency: string,
    amount: bigint
) => {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // Enforce consistent locking order to prevent deadlocks (e.g., sort by userId)
        const [firstUser, secondUser] = [sellerUserId, buyerUserId].sort();

        // 1. Lock rows!
        // We select the rows FOR UPDATE. This halts any other transaction trying to read/write 
        // these specific rows until this transaction commits or rolls back.

        // Note: In real setup, we'd fetch both currencies for both users. Simplification: Just one currency transfer here.
        const firstWallet = await queryRunner.manager.findOne(Wallet, {
            where: { userId: firstUser, currency },
            lock: { mode: "pessimistic_write" } // SELECT ... FOR UPDATE
        });

        const secondWallet = await queryRunner.manager.findOne(Wallet, {
            where: { userId: secondUser, currency },
            lock: { mode: "pessimistic_write" }
        });

        if (!firstWallet || !secondWallet) {
            throw new Error("One or both wallets not found");
        }

        // Identify which wallet is seller (sender) vs buyer (receiver)
        const sellerWallet = firstUser === sellerUserId ? firstWallet : secondWallet;
        const buyerWallet = firstUser === buyerUserId ? firstWallet : secondWallet;

        const currentSellerBalance = BigInt(sellerWallet.balance);
        const currentBuyerBalance = BigInt(buyerWallet.balance);

        if (currentSellerBalance < amount) {
            throw new Error("Insufficient funds");
        }

        // 2. Update Balances (in Memory)
        sellerWallet.balance = (currentSellerBalance - amount).toString();
        buyerWallet.balance = (currentBuyerBalance + amount).toString();

        // 3. Persist Changes
        await queryRunner.manager.save(sellerWallet);
        await queryRunner.manager.save(buyerWallet);

        // 4. Commit Transaction
        await queryRunner.commitTransaction();
        console.log(`Transaction Committed: Transferred ${amount} ${currency} from ${sellerUserId} to ${buyerUserId}`);

    } catch (err) {
        // 5. Rollback on any error
        await queryRunner.rollbackTransaction();
        console.error("Transaction Failed:", err);
        throw err;
    } finally {
        // 6. Release connection
        await queryRunner.release();
    }
};

/**
 * Initializes a wallet for testing.
 */
export const createWallet = async (userId: string, currency: string, initialBalance: bigint) => {
    const wallet = new Wallet();
    wallet.userId = userId;
    wallet.currency = currency;
    wallet.balance = initialBalance.toString();
    await AppDataSource.getRepository(Wallet).save(wallet);
    return wallet;
};
