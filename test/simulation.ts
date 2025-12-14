import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const SYMBOL = "BTC-USD";

socket.on("connect", () => {
    console.log("Connected to server");

    // Scenario:
    // 1. Seller A places Ask: 1 BTC @ $50000
    // 2. Buyer B places Bid: 0.5 BTC @ $50000 -> Should Match Immediately
    // 3. Buyer C places Bid: 0.5 BTC @ $50000 -> Should Match Immediately (clearing order)

    setTimeout(() => {
        console.log("Placing ASK: 1 BTC @ 50000");
        socket.emit("order:create", {
            userId: "user-seller",
            symbol: SYMBOL,
            side: "SELL",
            price: "5000000", // 50000.00
            amount: "100000000", // 1 BTC (sats)
        });
    }, 1000);

    setTimeout(() => {
        console.log("Placing BID: 0.5 BTC @ 50000");
        socket.emit("order:create", {
            userId: "user-buyer-1",
            symbol: SYMBOL,
            side: "BUY",
            price: "5000000",
            amount: "50000000", // 0.5 BTC
        });
    }, 2000);

    setTimeout(() => {
        console.log("Placing BID: 0.5 BTC @ 50000 (Should clear remainder)");
        socket.emit("order:create", {
            userId: "user-buyer-2",
            symbol: SYMBOL,
            side: "BUY",
            price: "5000000",
            amount: "50000000", // 0.5 BTC
        });
    }, 3000);
});

socket.on("order:ack", (data: any) => {
    console.log("Order Ack:", data);
});

socket.on("trade", (trade: any) => {
    console.log(">>> TRADE EXECUTED:", trade);
});

socket.on("error", (err: any) => {
    console.error("Error:", err);
});
