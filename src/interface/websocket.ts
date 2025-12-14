import { Server, Socket } from "socket.io";
import { processOrder } from "../engine/Matcher";
import { sub } from "../config/redis";

export const setupWebSockets = (io: Server) => {

    // Subscribe to trade execution events from Redis PubSub (Engine output)
    sub.subscribe("trade:executed", (err, count) => {
        if (err) console.error("Failed to subscribe: %s", err.message);
    });

    sub.on("message", (channel, message) => {
        if (channel === "trade:executed") {
            const trade = JSON.parse(message);
            // Low Latency: Broadcast immediately to specific rooms or all
            io.emit("trade", trade);
            console.log("Broadcasting Trade:", trade);
        }
    });

    io.on("connection", (socket: Socket) => {
        console.log(`Client Connected: ${socket.id}`);

        socket.on("order:create", async (data: any) => {
            // Data Validation
            const { userId, symbol, side, price, amount } = data;

            if (!userId || !symbol || !side || !price || !amount) {
                return socket.emit("error", "Invalid Order Data");
            }

            const orderId = `${userId}-${Date.now()}`;
            const timestamp = Date.now();

            console.log(`Received Order: ${side} ${amount} ${symbol} @ ${price}`);

            // Acknowledge Receipt ASAP
            socket.emit("order:ack", { orderId, status: "processing" });

            // Send to Matching Engine
            try {
                await processOrder({
                    id: orderId, // In prod, generate UUID
                    userId,
                    side,
                    price: parseInt(price), // Integer Cents
                    amount: parseInt(amount),
                    timestamp
                }, symbol);
            } catch (err: any) {
                console.error("Matching Error", err);
                socket.emit("error", err.message);
            }
        });

        socket.on("disconnect", () => {
            console.log(`Client Disconnected`);
        });
    });
};
