'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, X, UserPlus, Trophy, MessageCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSocket from '@/app/hooks/useSocket';

const NOTIFICATION_ICONS = {
  GROUP_INVITATION: UserPlus,
  CHALLENGE_STARTED: Trophy,
  CHALLENGE_REMINDER: Trophy,
  ACHIEVEMENT: Trophy,
  SYSTEM_ANNOUNCEMENT: Info,
  MENTION: MessageCircle,
};

export default function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isConnected, subscribe } = useSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  const dropdownRef = useRef(null);
  const bellRef = useRef(null);
  const lastNotificationIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (showToast = false) => {
    if (!session?.user?.id) return;

    try {
      if (!showToast) setLoading(true);
      
      const res = await fetch('/api/notifications?limit=20');
      if (!res.ok) throw new Error('Failed to fetch notifications');

      const data = await res.json();
      const newNotifications = data.notifications || [];
      const newUnreadCount = data.unreadCount || 0;

      // Check for new notifications (only if we have a reference point)
      if (showToast && lastNotificationIdRef.current && newNotifications.length > 0) {
        const latestNotification = newNotifications[0];
        
        // If the latest notification is different from last known, it's new
        if (latestNotification.id !== lastNotificationIdRef.current) {
          const { type, metadata, message } = latestNotification;
          
          // Show toast for new notification
          if (type === 'GROUP_INVITATION') {
            const inviterName = metadata?.inviterName || 'Someone';
            const groupName = metadata?.groupName || 'a group';
            toast.success(
              `${inviterName} invited you to join "${groupName}"`,
              {
                duration: 5000,
                icon: '👥',
                style: {
                  borderRadius: '8px',
                  background: '#333',
                  color: '#fff',
                },
              }
            );
          } else {
            toast.success(message || latestNotification.title, {
              duration: 4000,
              icon: '🔔',
            });
          }
        }
      }

      // Update last seen notification ID
      if (newNotifications.length > 0) {
        lastNotificationIdRef.current = newNotifications[0].id;
      }

      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
    } catch (error) {
      console.error('[NotificationBell] Fetch error:', error);
    } finally {
      if (!showToast) setLoading(false);
    }
  }, [session?.user?.id]);

  // Initial fetch
  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications(false);
    }
  }, [session?.user?.id, fetchNotifications]);

  // Start polling for new notifications (15 seconds interval)
  useEffect(() => {
    if (!session?.user?.id) return;

    // Poll every 15 seconds for better responsiveness
    const POLL_INTERVAL = 15000;
    
    pollingIntervalRef.current = setInterval(() => {
      // Only poll if tab is visible (browser optimization)
      if (document.visibilityState === 'visible') {
        console.log('[NotificationBell] 🔄 Polling for new notifications...');
        fetchNotifications(true);
      }
    }, POLL_INTERVAL);

    // Also poll when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[NotificationBell] Tab visible, checking for notifications...');
        fetchNotifications(true);
      }
    };
    
    // Listen for manual refresh trigger (from invite modal, etc.)
    const handleManualRefresh = () => {
      console.log('[NotificationBell] Manual refresh triggered');
      fetchNotifications(true);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('refreshNotifications', handleManualRefresh);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('refreshNotifications', handleManualRefresh);
    };
  }, [session?.user?.id, fetchNotifications]);

  // Listen for new notifications via socket
  useEffect(() => {
    if (!isConnected || !session?.user?.id) return;

    const unsubscribe = subscribe('newNotification', (notification) => {
      console.log('[NotificationBell] New notification received:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast for new notification with custom message
      const { type, metadata, message } = notification;
      
      if (type === 'GROUP_INVITATION') {
        const inviterName = metadata?.inviterName || 'Someone';
        const groupName = metadata?.groupName || 'a group';
        toast.success(
          `${inviterName} invited you to join "${groupName}"`,
          {
            duration: 5000,
            icon: '👥',
            style: {
              borderRadius: '8px',
              background: '#333',
              color: '#fff',
            },
          }
        );
      } else {
        toast.success(message || notification.title, {
          duration: 4000,
          icon: '🔔',
        });
      }
    });

    return unsubscribe;
  }, [isConnected, session?.user?.id, subscribe]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        bellRef.current &&
        !bellRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });

      if (!res.ok) throw new Error('Failed to mark as read');

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[NotificationBell] Mark as read error:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (!res.ok) throw new Error('Failed to mark all as read');

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('[NotificationBell] Mark all as read error:', error);
      toast.error('Failed to mark all as read');
    }
  }, []);

  // Accept invitation
  const handleAccept = useCallback(
    async (notificationId, metadata) => {
      setProcessingIds((prev) => new Set(prev).add(notificationId));

      try {
        const res = await fetch(`/api/notifications/${notificationId}/accept`, {
          method: 'POST',
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to accept invitation');
        }

        const data = await res.json();
        
        // Mark as read locally
        setNotifications((prev) => prev.map((n) => 
          n.id === notificationId ? { ...n, read: true } : n
        ));
        setUnreadCount((prev) => Math.max(0, prev - 1));

        toast.success(data.message || 'Invitation accepted!');
        
        // Navigate to group
        if (data.groupId) {
          router.push(`/groups/${data.groupId}`);
          setIsOpen(false);
        }
      } catch (error) {
        console.error('[NotificationBell] Accept error:', error);
        toast.error(error.message);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });
      }
    },
    [router]
  );

  // Decline invitation
  const handleDecline = useCallback(async (notificationId) => {
    setProcessingIds((prev) => new Set(prev).add(notificationId));

    try {
      const res = await fetch(`/api/notifications/${notificationId}/decline`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to decline invitation');

      // Mark as read locally
      setNotifications((prev) => prev.map((n) => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      toast.success('Invitation declined');
    } catch (error) {
      console.error('[NotificationBell] Decline error:', error);
      toast.error('Failed to decline invitation');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback(
    (notification) => {
      if (!notification.read) {
        markAsRead(notification.id);
      }

      if (notification.actionUrl) {
        router.push(notification.actionUrl);
        setIsOpen(false);
      }
    },
    [markAsRead, router]
  );

  // Format time ago
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (!session?.user?.id) return null;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-[calc(100vh-120px)] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </h3>
              {/* <span className="text-xs text-gray-400 dark:text-gray-500" title="Auto-refreshes every 15 seconds">
                🔄
              </span> */}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  We'll notify you when something important happens
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map((notification) => {
                  const IconComponent = NOTIFICATION_ICONS[notification.type] || Bell;
                  const isProcessing = processingIds.has(notification.id);

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 transition-colors ${
                        !notification.read
                          ? 'bg-blue-50 dark:bg-blue-900/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          !notification.read
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text- blue-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}>
                          <IconComponent className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div
                            onClick={() => handleNotificationClick(notification)}
                            className="cursor-pointer"
                          >
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>

                          {/* Action Buttons for Group Invitations */}
                          {notification.type === 'GROUP_INVITATION' && !notification.read && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(notification.id, notification.metadata);
                                }}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                              >
                                {isProcessing ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    <span>Accept</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDecline(notification.id);
                                }}
                                disabled={isProcessing}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-300 dark:border-gray-600 transition-all duration-200 flex items-center justify-center gap-2"
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <X className="w-4 h-4" />
                                    <span>Decline</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
              <button
                onClick={() => {
                  router.push('/notifications');
                  setIsOpen(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
