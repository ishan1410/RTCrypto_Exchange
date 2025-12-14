import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { MockDataSource } from "./MockDB";

dotenv.config();

const isMock = process.env.MOCK_MODE === "true";

export const AppDataSource = (isMock ? MockDataSource : new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "crypto_exchange",
    synchronize: true,
    logging: false,
    entities: ["src/persistence/models/*.ts"],
    subscribers: [],
    migrations: [],
})) as any;

export const initializeDB = async () => {
    try {
        await AppDataSource.initialize();
        console.log(`Data Source has been initialized! (Mock: ${isMock})`);
    } catch (err) {
        console.error("Error during Data Source initialization:", err);
    }
};
