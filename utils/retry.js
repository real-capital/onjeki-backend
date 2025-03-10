// utils/retry.js
import { setTimeout } from 'timers/promises';

class RetryService {
  async exponentialBackoff(
    operation,
    { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = {}
  ) {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        retries++;

        if (retries >= maxRetries) {
          throw error;
        }

        // Calculate exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, retries), maxDelay);

        logger.warn(`Retry attempt ${retries}`, {
          operation: operation.name,
          delay,
          error: error.message,
        });

        await setTimeout(delay);
      }
    }
  }

  // Specific retry for payment operations
  async retryPaymentOperation(operation, bookingId) {
    return this.exponentialBackoff(
      async () => {
        const result = await operation();

        // Log successful retry
        logger.info('Payment operation successful after retry', {
          bookingId,
          operation: operation.name,
        });

        return result;
      },
      {
        maxRetries: 3,
        baseDelay: 2000,
        maxDelay: 15000,
      }
    );
  }
}

export default new RetryService();
