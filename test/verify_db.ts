import { AppDataSource, initializeDB } from "../src/config/database";
import { Wallet } from "../src/persistence/models/Wallet";

const verify = async () => {
    await initializeDB();
    const repo = AppDataSource.getRepository(Wallet);

    const buyer1 = await repo.findOne({ where: { userId: "user-buyer-1", currency: "BTC-USD" } });
    const buyer2 = await repo.findOne({ where: { userId: "user-buyer-2", currency: "BTC-USD" } });
    const seller = await repo.findOne({ where: { userId: "user-seller", currency: "BTC-USD" } });

    console.log("Buyer 1 Balance:", buyer1?.balance);
    console.log("Buyer 2 Balance:", buyer2?.balance);
    console.log("Seller Balance:", seller?.balance);

    if (buyer1?.balance === "50000000" && buyer2?.balance === "50000000" && seller?.balance === "900000000") {
        console.log("✅ VERIFICATION SUCCESS: DB matches expected state.");
        process.exit(0);
    } else {
        console.error("❌ VERIFICATION FAILED: Balances incorrect.");
        process.exit(1);
    }
};

verify();
