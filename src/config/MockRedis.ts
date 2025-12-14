import EventEmitter from "events";

export class MockRedis extends EventEmitter {
    private zsets = new Map<string, Array<{ score: number, member: string }>>();

    constructor(port?: number, host?: string) {
        super();
        console.warn("⚠️  RUNNING IN MOCK REDIS MODE  ⚠️");
        setTimeout(() => this.emit("connect"), 100);
    }

    async zadd(key: string, score: number, member: string) {
        if (!this.zsets.has(key)) {
            this.zsets.set(key, []);
        }
        const set = this.zsets.get(key)!;
        // Remove existing if present (Redis behavior)
        const existingIdx = set.findIndex(i => i.member === member);
        if (existingIdx !== -1) {
            set.splice(existingIdx, 1);
        }
        set.push({ score, member });
        // Sort by score
        set.sort((a, b) => a.score - b.score);
        return 1;
    }

    async zrem(key: string, member: string) {
        const set = this.zsets.get(key);
        if (!set) return 0;
        const idx = set.findIndex(i => i.member === member);
        if (idx !== -1) {
            set.splice(idx, 1);
            return 1;
        }
        return 0;
    }

    async zrange(key: string, start: number, stop: number, withScores?: string) {
        const set = this.zsets.get(key) || [];
        // Handle negative indices equivalent to Python/Redis
        const startIdx = start < 0 ? set.length + start : start;
        const stopIdx = stop < 0 ? set.length + stop : stop;

        const subset = set.slice(0, 1); // For PoC we mainly use 0 0 (get top 1)

        if (withScores === "WITHSCORES") {
            const res: string[] = [];
            subset.forEach(item => {
                res.push(item.member);
                res.push(item.score.toString());
            });
            return res;
        }
        return subset.map(i => i.member);
    }

    async zrevrange(key: string, start: number, stop: number, withScores?: string) {
        const set = this.zsets.get(key) || [];
        const reversed = [...set].reverse();

        const subset = reversed.slice(0, 1);

        if (withScores === "WITHSCORES") {
            const res: string[] = [];
            subset.forEach(item => {
                res.push(item.member);
                res.push(item.score.toString());
            });
            return res;
        }
        return subset.map(i => i.member);
    }

    async publish(channel: string, message: string) {
        MockRedisBus.emit(channel, message);
        return 1;
    }

    async subscribe(channel: string, cb?: (err: any, count: any) => void) {
        MockRedisBus.on(channel, (msg) => {
            this.emit("message", channel, msg);
        });
        if (cb) cb(null, 1);
    }
}

// Global bus for PubSub simulation across instances
const MockRedisBus = new EventEmitter();
