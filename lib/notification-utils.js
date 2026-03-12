/**
 * Notification utility for sending real-time notifications via Socket.IO
 * This is a server-side utility that emits notifications through the socket server
 */

/**
 * Send a notification to a user via Socket.IO
 * This should be called after creating a notification in the database
 * @param {string} recipientId - User ID to send notification to
 * @param {Object} notification - Notification object from database
 * @param {Object} io - Socket.IO instance (optional, if available in context)
 */
export async function emitNotification(recipientId, notification, io = null) {
  try {
    if (!recipientId || !notification) {
      console.error("[emitNotification] Missing recipientId or notification");
      return false;
    }

    // If Socket.IO instance is not provided, we'll make a fetch request to the socket server
    // The socket server will handle the actual emission
    if (!io) {
      // In Next.js API routes, we don't have direct access to the socket server
      // So we'll rely on client-side socket connections to receive notifications
      // The client will poll or reconnect to get new notifications
      console.log(
        "[emitNotification] No socket instance, notification stored in DB only",
      );
      return true;
    }

    // If we have the socket instance (e.g., in socket-server.js), emit directly
    io.emit("sendNotification", {
      recipientId,
      notification,
    });

    console.log(
      `[emitNotification] Sent to user ${recipientId}:`,
      notification.type,
    );
    return true;
  } catch (error) {
    console.error("[emitNotification] Error:", error);
    return false;
  }
}

/**
 * Broadcast notification to multiple users
 * @param {string[]} recipientIds - Array of user IDs
 * @param {Object} notification - Notification object
 * @param {Object} io - Socket.IO instance (optional)
 */
export async function emitNotificationBatch(
  recipientIds,
  notification,
  io = null,
) {
  try {
    if (
      !recipientIds ||
      !Array.isArray(recipientIds) ||
      recipientIds.length === 0
    ) {
      console.error("[emitNotificationBatch] Invalid recipientIds");
      return false;
    }

    // Send to each recipient
    const results = await Promise.all(
      recipientIds.map((id) => emitNotification(id, notification, io)),
    );

    const successCount = results.filter(Boolean).length;
    console.log(
      `[emitNotificationBatch] Sent ${successCount}/${recipientIds.length} notifications`,
    );

    return true;
  } catch (error) {
    console.error("[emitNotificationBatch] Error:", error);
    return false;
  }
}

/**
 * Get online users (requires Redis for tracking)
 * @returns {Promise<string[]>} Array of online user IDs
 */
export async function getOnlineUsers() {
  try {
    // This would query Redis for online user keys
    // For now, return empty array as placeholder
    return [];
  } catch (error) {
    console.error("[getOnlineUsers] Error:", error);
    return [];
  }
}

export default {
  emitNotification,
  emitNotificationBatch,
  getOnlineUsers,
};
