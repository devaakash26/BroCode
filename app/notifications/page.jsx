'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Bell, Check, X, UserPlus, Trophy, MessageCircle, Info, 
  Loader2, Filter, CheckCheck, Trash2, Clock, AlertCircle,
  Inbox, ChevronLeft, RefreshCw 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import useSocket from '@/app/hooks/useSocket';
import Link from 'next/link';

const NOTIFICATION_TYPES = {
  GROUP_INVITATION: { icon: UserPlus, color: 'blue', label: 'Invitations' },
  CHALLENGE_STARTED: { icon: Trophy, color: 'yellow', label: 'Challenges' },
  CHALLENGE_REMINDER: { icon: Clock, color: 'orange', label: 'Reminders' },
  ACHIEVEMENT: { icon: Trophy, color: 'purple', label: 'Achievements' },
  SYSTEM_ANNOUNCEMENT: { icon: Info, color: 'gray', label: 'Announcements' },
  MENTION: { icon: MessageCircle, color: 'green', label: 'Mentions' },
};

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isConnected, subscribe } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, type
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!session?.user?.id) return;

    try {
      if (!silent) setLoading(true);
      
      const params = new URLSearchParams({
        limit: '100',
        unreadOnly: filter === 'unread' ? 'true' : 'false',
      });

      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error('Failed to fetch notifications');

      const data = await res.json();
      let fetchedNotifications = data.notifications || [];

      // Apply type filter on client side
      if (typeFilter !== 'all') {
        fetchedNotifications = fetchedNotifications.filter(n => n.type === typeFilter);
      }

      // Apply read filter
      if (filter === 'read') {
        fetchedNotifications = fetchedNotifications.filter(n => n.read);
      }

      setNotifications(fetchedNotifications);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('[Notifications] Fetch error:', error);
      toast.error('Failed to load notifications');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id, filter, typeFilter]);

  // Initial fetch
  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
    } else {
      router.push('/auth/signin');
    }
  }, [session?.user?.id, fetchNotifications, router]);

  // Listen for new notifications via socket
  useEffect(() => {
    if (!isConnected || !session?.user?.id) return;

    const unsubscribe = subscribe('newNotification', (notification) => {
      console.log('[Notifications] New notification received:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast
      const { type, metadata, message } = notification;
      if (type === 'GROUP_INVITATION') {
        const inviterName = metadata?.inviterName || 'Someone';
        const groupName = metadata?.groupName || 'a group';
        toast.success(`${inviterName} invited you to join "${groupName}"`, {
          duration: 5000,
          icon: '👥',
        });
      } else {
        toast.success(message || notification.title, {
          duration: 4000,
          icon: '🔔',
        });
      }
    });

    return unsubscribe;
  }, [isConnected, session?.user?.id, subscribe]);

  // Mark as read
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
      console.error('[Notifications] Mark as read error:', error);
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
      console.error('[Notifications] Mark all as read error:', error);
      toast.error('Failed to mark all as read');
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const res = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete notification');

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('[Notifications] Delete error:', error);
      toast.error('Failed to delete notification');
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
        
        setNotifications((prev) => prev.map((n) => 
          n.id === notificationId ? { ...n, read: true } : n
        ));
        setUnreadCount((prev) => Math.max(0, prev - 1));

        toast.success(data.message || 'Invitation accepted!');
        
        if (data.groupId) {
          router.push(`/groups/${data.groupId}`);
        }
      } catch (error) {
        console.error('[Notifications] Accept error:', error);
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

      setNotifications((prev) => prev.map((n) => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      toast.success('Invitation declined');
    } catch (error) {
      console.error('[Notifications] Decline error:', error);
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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
        </div>
      </div>
    );
  }

  const filteredNotificationsByType = typeFilter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === typeFilter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <Bell className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                  Notifications
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  showFilters
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 pb-4 border-t border-gray-200 dark:border-gray-800 pt-4">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    filter === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    filter === 'unread'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    filter === 'read'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Read
                </button>
              </div>

              <div className="flex gap-2 flex-wrap sm:ml-auto">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    typeFilter === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  All Types
                </button>
                {Object.entries(NOTIFICATION_TYPES).map(([key, config]) => {
                  const count = notifications.filter(n => n.type === key).length;
                  if (count === 0) return null;
                  
                  return (
                    <button
                      key={key}
                      onClick={() => setTypeFilter(key)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        typeFilter === key
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {config.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <Inbox className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Total:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{notifications.length}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span className="text-gray-600 dark:text-gray-400">Unread:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{unreadCount}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
              <span className="text-gray-600 dark:text-gray-400">Read:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{notifications.length - unreadCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredNotificationsByType.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
            <Inbox className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No notifications here
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : filter === 'read'
                ? "No read notifications yet."
                : "We'll notify you when something important happens"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotificationsByType.map((notification) => {
              const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT;
              const IconComponent = typeConfig.icon;
              const isProcessing = processingIds.has(notification.id);

              return (
                <div
                  key={notification.id}
                  className={`group bg-white dark:bg-gray-900 rounded-xl shadow-sm border transition-all duration-200 ${
                    !notification.read
                      ? 'border-indigo-200 dark:border-indigo-800 shadow-md hover:shadow-lg'
                      : 'border-gray-200 dark:border-gray-800 hover:shadow-md'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                          !notification.read
                            ? `bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/30`
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        <IconComponent
                          className={`w-6 h-6 ${
                            !notification.read
                              ? `text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400`
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div
                          onClick={() => handleNotificationClick(notification)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatTimeAgo(notification.createdAt)}</span>
                            <span>•</span>
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                              {typeConfig.label}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {notification.type === 'GROUP_INVITATION' && !notification.read && (
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAccept(notification.id, notification.metadata);
                              }}
                              disabled={isProcessing}
                              className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  Accept Invitation
                                </>
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDecline(notification.id);
                              }}
                              disabled={isProcessing}
                              className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-300 dark:border-gray-600 transition-all duration-200 flex items-center justify-center gap-2"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="w-4 h-4" />
                                  <span className="hidden sm:inline">Decline</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Actions Menu */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
