import { redis } from "../config/redis";

/**
 * Manages the Limit Order Book using Redis Sorted Sets (ZSET).
 * 
 * **Composite Scoring Algorithm for FIFO support**:
 * Redis ZSETs sort by Score (Price), but resolve ties lexicographically by Member ID.
 * To ensure FIFO (Time Priority) for orders at the same price, we construct a composite score:
 * 
 * 1. **Asks (Sell Support)**: 
 *    - Priority: Lower Price, then Earlier Time.
 *    - Score = `Price + (Timestamp / 1e13)`
 * 
 * 2. **Bids (Buy Support)**:
 *    - Priority: Higher Price, then Earlier Time.
 *    - Redis stores Low->High. To support `ZREVRANGE` correctly:
 *    - Score = `Price + ( (MAX_TIMESTAMP - Timestamp) / 1e13 )`
 */

// Constant for Year 3000 to maximize timestamp inversion range
const MAX_TIMESTAMP = 32503680000000;

export class OrderBook {
    private symbol: string;

    constructor(symbol: string) {
        this.symbol = symbol;
    }

    private getAskKey() { return `asks:${this.symbol}`; }
    private getBidKey() { return `bids:${this.symbol}`; }

    /**
     * Add a Limit Sell Order
     * @param orderId 
     * @param priceCents Integer (cents)
     * @param timestamp Date.now()
     */
    async addAsk(orderId: string, priceCents: number, timestamp: number) {
        // Lower price is better -> Low Score.
        // Earlier time is better -> Low decimal.
        const score = priceCents + (timestamp / 1e13);
        await redis.zadd(this.getAskKey(), score, orderId);
        return score;
    }

    /**
     * Add a Limit Buy Order
     * @param orderId 
     * @param priceCents Integer (cents)
     * @param timestamp Date.now()
     */
    async addBid(orderId: string, priceCents: number, timestamp: number) {
        // Higher Price is better -> High Score.
        // Earlier time is better -> High decimal (so it's "larger" in reverse sort).
        const score = priceCents + ((MAX_TIMESTAMP - timestamp) / 1e13);
        await redis.zadd(this.getBidKey(), score, orderId);
        return score;
    }

    /**
     * Remove an order (e.g. after fill)
     */
    async removeOrder(orderId: string) {
        await redis.zrem(this.getAskKey(), orderId);
        await redis.zrem(this.getBidKey(), orderId);
    }

    /**
     * Get Best Ask (Lowest Price)
     * Returns [orderId, score]
     */
    async getBestAsk() {
        // ZRANGE 0 0 WITHSCORES returns the element with lowest score
        const res = await redis.zrange(this.getAskKey(), 0, 0, "WITHSCORES");
        return res.length > 0 ? { orderId: res[0], score: parseFloat(res[1]) } : null;
    }

    /**
     * Get Best Bid (Highest Price).
     * Returns [orderId, score]
     */
    async getBestBid() {
        // ZREVRANGE 0 0 WITHSCORES returns element with highest score
        const res = await redis.zrevrange(this.getBidKey(), 0, 0, "WITHSCORES");
        return res.length > 0 ? { orderId: res[0], score: parseFloat(res[1]) } : null;
    }
}
