import { Wallet } from "../persistence/models/Wallet";

// In-memory store
const db = new Map<string, Wallet>();

// Mutex for locking rows (simulating "FOR UPDATE")
const locks = new Set<string>();

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class MockQueryRunner {
    manager: any;
    isTransactionActive = false;

    constructor() {
        this.manager = {
            findOne: async (entityClass: any, options: any) => {
                const { where, lock } = options;
                // where: { userId, currency }
                const key = `${where.userId}-${where.currency}`;

                if (lock && lock.mode === "pessimistic_write") {
                    console.log(`🔒 Acquiring Lock on ${key}...`);
                    // Spinlock simulation
                    while (locks.has(key)) {
                        await sleep(50);
                    }
                    if (this.isTransactionActive) {
                        locks.add(key);
                    }
                }

                if (db.has(key)) {
                    return JSON.parse(JSON.stringify(db.get(key))); // Return copy
                }
                return null;
            },
            save: async (entity: Wallet) => {
                const key = `${entity.userId}-${entity.currency}`;
                db.set(key, entity);
                return entity;
            }
        };
    }

    async connect() { }
    async startTransaction() { this.isTransactionActive = true; }
    async commitTransaction() {
        console.log("✅ Mock Transaction Committed");
        this.releaseLocks();
        this.isTransactionActive = false;
    }
    async rollbackTransaction() {
        console.log("❌ Mock Transaction Rolled Back");
        this.releaseLocks();
        this.isTransactionActive = false;
    }
    async release() {
        if (this.isTransactionActive) { // Safety net
            this.releaseLocks();
        }
    }

    private releaseLocks() {
        locks.clear();
    }
}

export const MockDataSource = {
    initialize: async () => console.log("Mock DB Initialized"),
    createQueryRunner: () => new MockQueryRunner(),
    getRepository: (entity: any) => ({
        save: async (data: any) => {
            const key = `${data.userId}-${data.currency}`;
            db.set(key, data);
        }
    })
};
