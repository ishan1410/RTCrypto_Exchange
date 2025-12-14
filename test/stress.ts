import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

// Constants
const TOTAL_ORDERS = 1000;
const BATCH_SIZE = 50; // Pause every N orders to prevent overflowing local socket buffer instantly
const SYMBOL = "BTC-USD";

let ordersSent = 0;
let acksReceived = 0;
let tradesReceived = 0;

const startTime = Date.now();

socket.on("connect", async () => {
    console.log(`Connected. Starting Stress Test: ${TOTAL_ORDERS} orders...`);

    for (let i = 0; i < TOTAL_ORDERS; i++) {
        const isBuy = i % 2 === 0;
        const userId = isBuy ? "whale-buyer" : "whale-seller";
        const price = 5000000 + (Math.floor(Math.random() * 100)); // Random price around 50k

        socket.emit("order:create", {
            userId,
            symbol: SYMBOL,
            side: isBuy ? "BUY" : "SELL",
            price: price.toString(),
            amount: "1000", // Small amount
        });

        ordersSent++;

        if (ordersSent % BATCH_SIZE === 0) {
            // Small yield to let event loop breathe
            await new Promise(r => setTimeout(r, 10));
        }
    }

    console.log(`All ${TOTAL_ORDERS} orders sent. Waiting for responses...`);
});

socket.on("order:ack", (data: any) => {
    acksReceived++;
    checkCompletion();
});

socket.on("trade", (trade: any) => {
    tradesReceived++;
});

// Calculate results when things settle
const checkCompletion = () => {
    if (acksReceived >= TOTAL_ORDERS) {
        const endTime = Date.now();
        const durationSeconds = (endTime - startTime) / 1000;
        const throughput = TOTAL_ORDERS / durationSeconds;

        console.log("\n--- STRESS TEST RESULTS ---");
        console.log(`Total Orders: ${TOTAL_ORDERS}`);
        console.log(`Time Taken:   ${durationSeconds.toFixed(2)}s`);
        console.log(`Throughput:   ${throughput.toFixed(2)} orders/sec`);
        console.log(`Trades Exec:  ${tradesReceived}`);
        console.log("---------------------------\n");
        process.exit(0);
    }
};

// Timeout safety
setTimeout(() => {
    console.log("\nTest Timeout! Results so far:");
    checkCompletion();
    process.exit(1);
}, 30000);
