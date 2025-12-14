import { AppDataSource, initializeDB } from "../src/config/database";
import { Wallet } from "../src/persistence/models/Wallet";

const seed = async () => {
    await initializeDB();
    const repo = AppDataSource.getRepository(Wallet);

    const wallets = [
        // Seller wallet initialized with 10 BTC (1,000,000,000 Satoshis)
        { userId: "user-seller", currency: "BTC-USD", balance: "1000000000" },

        // Buyer wallets initialized with 0 BTC
        { userId: "user-buyer-1", currency: "BTC-USD", balance: "0" },
        { userId: "user-buyer-2", currency: "BTC-USD", balance: "0" },

        // Stress Test Whales
        { userId: "whale-seller", currency: "BTC-USD", balance: "100000000000000" },
        { userId: "whale-buyer", currency: "BTC-USD", balance: "100000000000000" }
    ];

    for (const w of wallets) {
        const existing = await repo.findOne({ where: { userId: w.userId, currency: w.currency } });
        if (!existing) {
            await repo.save(w);
            console.log(`Created wallet for ${w.userId}`);
        } else {
            existing.balance = w.balance;
            await repo.save(existing);
            console.log(`Updated wallet for ${w.userId}`);
        }
    }

    console.log("Seeding Complete");
    process.exit(0);
};

seed();
