'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, X, UserPlus, Trophy, MessageCircle, Info, Loader2, ChevronLeft } from 'lucide-react';
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
          
          // Show professional toast for new notification
          const IconComponent = NOTIFICATION_ICONS[type] || Bell;
          const isSuccess = type === 'ACHIEVEMENT';
          
          let iconColorClass = 'text-indigo-600 dark:text-indigo-400';
          let iconBgClass = 'bg-indigo-100 dark:bg-indigo-900/40';
          
          if (isSuccess) {
            iconColorClass = 'text-amber-600 dark:text-amber-400';
            iconBgClass = 'bg-amber-100 dark:bg-amber-900/30';
          } else if (type === 'GROUP_INVITATION') {
            iconColorClass = 'text-blue-600 dark:text-blue-400';
            iconBgClass = 'bg-blue-100 dark:bg-blue-900/30';
          } else if (type === 'CHALLENGE_STARTED') {
            iconColorClass = 'text-emerald-600 dark:text-emerald-400';
            iconBgClass = 'bg-emerald-100 dark:bg-emerald-900/30';
          }

          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out'
              } max-w-sm w-full bg-white dark:bg-gray-900 shadow-lg rounded-xl pointer-events-auto flex border border-gray-100 dark:border-gray-800 overflow-hidden`}
            >
              <div className="flex-1 p-4">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 ${iconBgClass}`}>
                    <IconComponent className={`w-5 h-5 ${iconColorClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {latestNotification.title || (type === 'GROUP_INVITATION' ? 'Group Invitation' : 'New Notification')}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {type === 'GROUP_INVITATION' && metadata?.inviterName && metadata?.groupName
                        ? `${metadata.inviterName} invited you to join "${metadata.groupName}"`
                        : message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full h-full px-3.5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ), { duration: 5000, position: 'top-right' });
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

      // Show professional toast notification
      const { type, metadata, message } = notification;
      
      const IconComponent = NOTIFICATION_ICONS[type] || Bell;
      const isSuccess = type === 'ACHIEVEMENT';
      
      let iconColorClass = 'text-indigo-600 dark:text-indigo-400';
      let iconBgClass = 'bg-indigo-100 dark:bg-indigo-900/40';
      
      if (isSuccess) {
        iconColorClass = 'text-amber-600 dark:text-amber-400';
        iconBgClass = 'bg-amber-100 dark:bg-amber-900/30';
      } else if (type === 'GROUP_INVITATION') {
        iconColorClass = 'text-blue-600 dark:text-blue-400';
        iconBgClass = 'bg-blue-100 dark:bg-blue-900/30';
      } else if (type === 'CHALLENGE_STARTED') {
        iconColorClass = 'text-emerald-600 dark:text-emerald-400';
        iconBgClass = 'bg-emerald-100 dark:bg-emerald-900/30';
      }

      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out'
          } max-w-sm w-full bg-white dark:bg-gray-900 shadow-lg rounded-xl pointer-events-auto flex border border-gray-100 dark:border-gray-800 overflow-hidden`}
        >
          <div className="flex-1 p-4">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5 ${iconBgClass}`}>
                <IconComponent className={`w-5 h-5 ${iconColorClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {notification.title || (type === 'GROUP_INVITATION' ? 'Group Invitation' : 'New Notification')}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {type === 'GROUP_INVITATION' && metadata?.inviterName && metadata?.groupName
                    ? `${metadata.inviterName} invited you to join "${metadata.groupName}"`
                    : message}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-100 dark:border-gray-800">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full h-full px-3.5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ), { duration: 5000, position: 'top-right' });
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
      // Never navigate for GROUP_INVITATION - user must use Accept/Decline buttons
      if (notification.type === 'GROUP_INVITATION') {
        return;
      }

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
      {/* Bell Icon - Simple with green dot indicator */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 ${
          isOpen ? 'bg-gray-100 dark:bg-gray-800 ring-2 ring-indigo-500 dark:ring-indigo-400' : ''
        }`}
        aria-label="Notifications"
      >
        <div className="relative">
          <Bell className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'scale-110' : ''}`} />
          {unreadCount > 0 && (
            <>
              {/* Pulsing ring effect */}
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full animate-ping" />
              {/* Solid green dot */}
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow-lg" />
            </>
          )}
        </div>
      </button>

      {/* Dropdown - Enhanced Design */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div
            ref={dropdownRef}
            className="absolute right-[-60px] sm:right-0 mt-3 w-[calc(100vw-2rem)] sm:w-[420px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-50 max-h-[calc(100vh-100px)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {/* Header - Simple */}
            <div className="relative p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Notifications
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {unreadCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      "You're all caught up!"
                    )}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/80 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

          {/* Notifications List - Enhanced Scrollbar */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-600">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  No notifications yet
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
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
                      className={`group p-4 transition-all duration-200 ${
                        !notification.read
                          ? 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon - Simple */}
                        <div className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                          !notification.read
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}>
                          <IconComponent className="w-4 h-4" />
                          {!notification.read && (
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div
                            onClick={() => handleNotificationClick(notification)}
                            className="cursor-pointer"
                          >
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                                {formatTimeAgo(notification.createdAt)}
                              </p>
                              {!notification.read && (
                                <span className="px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 rounded-full">
                                  NEW
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons for Group Invitations - Simple */}
                          {notification.type === 'GROUP_INVITATION' && !notification.read && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(notification.id, notification.metadata);
                                }}
                                disabled={isProcessing}
                                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
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
                                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-200 dark:border-gray-700 transition-colors flex items-center justify-center gap-2"
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

          {/* Footer - Simple */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  router.push('/notifications');
                  setIsOpen(false);
                }}
                className="w-full py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                View all notifications
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
