/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

class AsyncUtils {
    defaultOptions;
    timeoutIds;
    constructor(options = {}) {
        this.defaultOptions = {
            timeout: 30000,
            retries: 0,
            backoff: 'fixed',
            backoffDelay: 1000,
            onRetry: () => { },
            ...options
        };
        this.timeoutIds = new Set();
    }
    /**
     * Type guard to check if a value is a Promise
     */
    isPromise(value) {
        return Boolean(value &&
            typeof value === 'object' &&
            'then' in value &&
            typeof value.then === 'function');
    }
    /**
     * Creates a timeout promise with cleanup
     */
    createTimeout(ms) {
        return new Promise((_, reject) => {
            const timeoutId = setTimeout(() => {
                this.timeoutIds.delete(timeoutId);
                reject(new Error(`Operation timed out after ${ms}ms`));
            }, ms);
            this.timeoutIds.add(timeoutId);
            timeoutId.unref?.();
        });
    }
    /**
     * Creates a delay promise with cleanup
     */
    delay(ms) {
        return new Promise(resolve => {
            const timeoutId = setTimeout(() => {
                this.timeoutIds.delete(timeoutId);
                resolve();
            }, ms);
            this.timeoutIds.add(timeoutId);
            timeoutId.unref?.();
        });
    }
    /**
     * Calculates backoff delay based on strategy
     */
    calculateBackoff(attempt, options) {
        if (options.backoff === 'exponential') {
            return options.backoffDelay * Math.pow(2, attempt);
        }
        return options.backoffDelay;
    }
    /**
     * Ensures a function returns a Promise
     */
    ensureAsync(fn, options = {}) {
        const mergedOptions = { ...this.defaultOptions, ...options };
        return async (...args) => {
            let lastError;
            for (let attempt = 0; attempt <= mergedOptions.retries; attempt++) {
                try {
                    const timeoutPromise = this.createTimeout(mergedOptions.timeout);
                    const resultPromise = Promise.resolve(fn(...args));
                    const result = await Promise.race([
                        resultPromise,
                        timeoutPromise
                    ]);
                    return result;
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    if (attempt < mergedOptions.retries) {
                        await mergedOptions.onRetry(lastError, attempt + 1);
                        await this.delay(this.calculateBackoff(attempt, mergedOptions));
                        continue;
                    }
                    break;
                }
            }
            throw lastError || new Error('Operation failed');
        };
    }
    /**
     * Executes multiple promises with concurrency limit
     */
    async withConcurrency(tasks, concurrency) {
        const results = [];
        const executing = [];
        try {
            for (const task of tasks) {
                const execution = task().then(result => {
                    results.push(result);
                    executing.splice(executing.indexOf(execution), 1);
                });
                executing.push(execution);
                if (executing.length >= concurrency) {
                    await Promise.race(executing);
                }
            }
            await Promise.all(executing);
            return results;
        }
        catch (error) {
            this.clearTimeouts();
            throw error;
        }
    }
    /**
     * Creates a debounced version of an async function
     */
    debounceAsync(fn, wait) {
        let timeoutId;
        let pendingPromise = null;
        return (...args) => {
            if (pendingPromise) {
                clearTimeout(timeoutId);
                this.timeoutIds.delete(timeoutId);
            }
            return new Promise((resolve, reject) => {
                timeoutId = setTimeout(async () => {
                    this.timeoutIds.delete(timeoutId);
                    try {
                        const result = await fn(...args);
                        pendingPromise = null;
                        resolve(result);
                    }
                    catch (error) {
                        pendingPromise = null;
                        reject(error);
                    }
                }, wait);
                this.timeoutIds.add(timeoutId);
                timeoutId.unref?.();
            });
        };
    }
    /**
     * Cleans up any pending timeouts
     */
    clearTimeouts() {
        for (const timeoutId of this.timeoutIds) {
            clearTimeout(timeoutId);
        }
        this.timeoutIds.clear();
    }
    /**
     * Gets the current default options
     */
    getDefaultOptions() {
        return { ...this.defaultOptions };
    }
    /**
     * Updates the default options
     */
    setDefaultOptions(options) {
        Object.assign(this.defaultOptions, options);
    }
}
// Export singleton instance
const asyncUtils = new AsyncUtils();

exports.AsyncUtils = AsyncUtils;
exports.asyncUtils = asyncUtils;
//# sourceMappingURL=AsyncUtils.js.map
