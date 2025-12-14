import { OrderBook } from "./OrderBook";
import { executeTradeTransaction } from "../persistence/wallet";
import { pub } from "../config/redis"; // PubSub for WebSocket
import { redis } from "../config/redis";

interface Order {
    id: string;
    userId: string;
    side: 'BUY' | 'SELL';
    price: number; // Integer
    amount: number; // Integer (quantity)
    timestamp: number;
}

// In-memory store for open orders details.
// Note: In a distributed production environment, use a Redis Hash (e.g., `orders:{id}`) for shared state.
const orderCache = new Map<string, Order>();

export const processOrder = async (newOrder: Order, symbol: string) => {
    const ob = new OrderBook(symbol);
    orderCache.set(newOrder.id, newOrder);

    // Loop until order is filled or no suitable match is found
    let remainingAmount = newOrder.amount;

    while (remainingAmount > 0) {
        let match = null;

        if (newOrder.side === 'BUY') {
            // Check Lowest Ask
            const bestAsk = await ob.getBestAsk();
            if (!bestAsk) break; // No sellers

            // Recover price from score (floor to remove timestamp decimal)
            const askPrice = Math.floor(bestAsk.score);

            // If Best Ask > Bid Price, match is impossible
            if (askPrice > newOrder.price) break;

            match = { id: bestAsk.orderId, price: askPrice };

        } else {
            // Sell Side: Check Highest Bid
            const bestBid = await ob.getBestBid();
            if (!bestBid) break; // No buyers

            const bidPrice = Math.floor(bestBid.score);

            // If Best Bid < Sell Price, match is impossible
            if (bidPrice < newOrder.price) break;

            match = { id: bestBid.orderId, price: bidPrice };
        }

        if (match) {
            // Match Found
            const makerOrder = orderCache.get(match.id);
            if (!makerOrder) {
                // Handle inconsistency: Order in ZSET but not in Cache
                await ob.removeOrder(match.id);
                continue;
            }

            // Determine Trade Quantity (Min of Maker vs Taker)
            const tradeQty = Math.min(remainingAmount, makerOrder.amount);
            const tradePrice = makerOrder.price; // Maker sets the price (FIFO)

            console.log(`MATCH EXEC: ${newOrder.side} ${tradeQty} @ ${tradePrice}`);

            // 1. Publish Event via Redis -> Websocket (Latency Optimized)
            const tradeEvent = {
                makerOrderId: makerOrder.id,
                takerOrderId: newOrder.id,
                price: tradePrice,
                qty: tradeQty,
                symbol
            };
            await pub.publish("trade:executed", JSON.stringify(tradeEvent));

            // 2. Persist to DB (Asynchronous)
            // Executes secure fund transfer for the matched trade
            executeTradeTransaction(
                newOrder.side === 'SELL' ? newOrder.userId : makerOrder.userId, // Seller
                newOrder.side === 'BUY' ? newOrder.userId : makerOrder.userId,  // Buyer
                symbol, // Asset
                BigInt(tradeQty)
            ).catch(err => console.error("Async DB persist failed", err));

            // 3. Update State
            remainingAmount -= tradeQty;
            makerOrder.amount -= tradeQty;

            if (makerOrder.amount <= 0) {
                await ob.removeOrder(makerOrder.id);
                orderCache.delete(makerOrder.id); // Cleanup filled order
            }
        }
    }

    // After matching loop, if amount remains, add to book
    if (remainingAmount > 0) {
        newOrder.amount = remainingAmount;
        if (newOrder.side === 'BUY') {
            await ob.addBid(newOrder.id, newOrder.price, newOrder.timestamp);
        } else {
            await ob.addAsk(newOrder.id, newOrder.price, newOrder.timestamp);
        }
        console.log(`Order ${newOrder.id} placed in book with remaining ${remainingAmount}`);
    }
};
