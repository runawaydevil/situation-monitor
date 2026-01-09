// RequestDeduplicator.js - Prevent duplicate in-flight requests

export class RequestDeduplicator {
    constructor() {
        this.inFlight = new Map();
    }

    /**
     * Get an existing in-flight request promise if one exists
     */
    get(key) {
        return this.inFlight.get(key) || null;
    }

    /**
     * Track a new in-flight request
     */
    track(key, promise) {
        this.inFlight.set(key, promise);

        // Clean up when promise resolves or rejects
        promise
            .finally(() => this.inFlight.delete(key))
            .catch(() => {}); // Prevent unhandled rejection

        return promise;
    }

    /**
     * Deduplicate: return existing promise or track new one
     */
    dedupe(key, requestFn) {
        const existing = this.get(key);
        if (existing) {
            console.log(`[Deduplicator] Reusing in-flight request: ${key.substring(0, 50)}...`);
            return existing;
        }
        return this.track(key, requestFn());
    }

    /**
     * Check if a request is currently in-flight
     */
    isInFlight(key) {
        return this.inFlight.has(key);
    }

    /**
     * Get count of in-flight requests
     */
    getCount() {
        return this.inFlight.size;
    }

    /**
     * Get all in-flight keys (for debugging)
     */
    getInFlightKeys() {
        return Array.from(this.inFlight.keys());
    }

    /**
     * Clear all tracked requests (use with caution)
     */
    clear() {
        this.inFlight.clear();
    }
}

// Export singleton instance
export const requestDeduplicator = new RequestDeduplicator();
