import redis from "./redis";

/**
 * Simple Redis-based queue for handling notification tasks
 * This prevents overwhelming the system with simultaneous notification sends
 */

const QUEUE_KEY = "notification:queue";
const PROCESSING_KEY = "notification:processing";
const QUEUE_CONSUMER_ACTIVE = "notification:consumer:active";

class NotificationQueue {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Add notification task to queue
   * @param {Object} task - Notification task details
   * @returns {Promise<boolean>}
   */
  async enqueue(task) {
    try {
      const taskData = JSON.stringify({
        ...task,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        enqueuedAt: new Date().toISOString(),
      });

      await redis.rpush(QUEUE_KEY, taskData);
      console.log("[NotificationQueue] Task enqueued:", task.type);

      // Start processing if not already running
      this.startProcessing();

      return true;
    } catch (error) {
      console.error("[NotificationQueue] Enqueue error:", error);
      return false;
    }
  }

  /**
   * Process next task in queue
   * @returns {Promise<Object|null>}
   */
  async dequeue() {
    try {
      // Atomically move task from queue to processing
      const taskData = await redis.lpop(QUEUE_KEY);

      if (!taskData) {
        return null;
      }

      const task = JSON.parse(taskData);

      // Store in processing set with expiry (in case process crashes)
      await redis.setex(
        `${PROCESSING_KEY}:${task.id}`,
        300, // 5 minutes TTL
        taskData,
      );

      return task;
    } catch (error) {
      console.error("[NotificationQueue] Dequeue error:", error);
      return null;
    }
  }

  /**
   * Mark task as completed and remove from processing
   * @param {string} taskId
   */
  async complete(taskId) {
    try {
      await redis.del(`${PROCESSING_KEY}:${taskId}`);
    } catch (error) {
      console.error("[NotificationQueue] Complete error:", error);
    }
  }

  /**
   * Start processing queue (non-blocking, runs in background)
   */
  async startProcessing() {
    // Check if consumer is already active
    const isActive = await redis.get(QUEUE_CONSUMER_ACTIVE);
    if (isActive) {
      return; // Another consumer is already processing
    }

    // Set consumer as active with 30-second TTL
    await redis.setex(QUEUE_CONSUMER_ACTIVE, 30, "1");

    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processQueue();
  }

  /**
   * Process queue loop (runs until queue is empty)
   */
  async processQueue() {
    try {
      while (true) {
        // Refresh consumer active flag
        await redis.setex(QUEUE_CONSUMER_ACTIVE, 30, "1");

        const task = await this.dequeue();

        if (!task) {
          // Queue is empty
          break;
        }

        console.log("[NotificationQueue] Processing task:", task.type, task.id);

        try {
          // Process the notification task
          await this.processTask(task);
          await this.complete(task.id);
          console.log("[NotificationQueue] Task completed:", task.id);
        } catch (error) {
          console.error("[NotificationQueue] Task processing error:", error);
          // Task remains in processing set and will expire after TTL
        }

        // Small delay to prevent overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("[NotificationQueue] Process queue error:", error);
    } finally {
      this.isProcessing = false;
      await redis.del(QUEUE_CONSUMER_ACTIVE);
      console.log("[NotificationQueue] Processing stopped");
    }
  }

  /**
   * Process individual notification task
   * @param {Object} task
   */
  async processTask(task) {
    // This is a placeholder - the actual notification sending
    // happens in the API routes. This queue just ensures
    // requests are processed serially to avoid overwhelming the DB

    // In a real implementation, you might:
    // 1. Send emails
    // 2. Send push notifications
    // 3. Trigger webhooks
    // 4. Update analytics

    console.log("[NotificationQueue] Task processed:", task);
  }

  /**
   * Get queue length
   * @returns {Promise<number>}
   */
  async getQueueLength() {
    try {
      return await redis.llen(QUEUE_KEY);
    } catch (error) {
      console.error("[NotificationQueue] Get queue length error:", error);
      return 0;
    }
  }

  /**
   * Get processing tasks count
   * @returns {Promise<number>}
   */
  async getProcessingCount() {
    try {
      const keys = await redis.keys(`${PROCESSING_KEY}:*`);
      return keys.length;
    } catch (error) {
      console.error("[NotificationQueue] Get processing count error:", error);
      return 0;
    }
  }

  /**
   * Clear all queues (use with caution)
   */
  async clear() {
    try {
      await redis.del(QUEUE_KEY);
      const processingKeys = await redis.keys(`${PROCESSING_KEY}:*`);
      if (processingKeys.length > 0) {
        await redis.del(...processingKeys);
      }
      await redis.del(QUEUE_CONSUMER_ACTIVE);
      console.log("[NotificationQueue] Queues cleared");
    } catch (error) {
      console.error("[NotificationQueue] Clear error:", error);
    }
  }
}

// Export singleton instance
const notificationQueue = new NotificationQueue();
export default notificationQueue;
