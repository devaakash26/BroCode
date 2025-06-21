'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Send, RefreshCw, Clock, Maximize2, MessageSquare, Users, X } from 'lucide-react';
import Image from 'next/image';
import useSocket from '@/app/hooks/useSocket';
import { format } from 'date-fns';
import TypingIndicator from '@/app/components/ui/typing-indicator';
import { GroupChatSkeleton } from '@/components/ui/card-skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

// Safe format function to handle invalid dates
const safeFormat = (timestamp, formatStr) => {
  try {
    // Check if timestamp is a valid date string or number
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '';
    }
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export default function GroupChat({ groupId }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef({});
  const messagesEndRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  // Socket connection
  const { 
    socket, 
    isConnected, 
    joinGroup, 
    sendMessage, 
    sendTyping,
    subscribe, 
    reconnect,
    sendHeartbeat 
  } = useSocket({ disableToasts: true });

  // Load initial messages
  useEffect(() => {
    fetchMessages();
    
    // Set a safety timeout to prevent infinite loading state
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 5000);
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [groupId]);

  // Join socket room when connected
  useEffect(() => {
    if (isConnected && groupId) {
      console.log('Joining group socket room:', groupId);
      joinGroup(groupId);
      // Also send an initial heartbeat when joining
      sendHeartbeat({ groupId });
    }
  }, [isConnected, groupId, joinGroup, sendHeartbeat]);

  // Reconnect socket if disconnected
  useEffect(() => {
    const checkConnectionInterval = setInterval(() => {
      if (!isConnected && groupId && session?.user) {
        console.log('Socket disconnected, attempting to reconnect...');
        reconnect();
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(checkConnectionInterval);
  }, [isConnected, reconnect, groupId, session]);

  // Add heartbeat to maintain presence
  useEffect(() => {
    if (!isConnected || !groupId) return;
    
    // Send initial heartbeat
    sendHeartbeat({ groupId });
    
    // Send heartbeat every 30 seconds to maintain online presence
    const heartbeatInterval = setInterval(() => {
      if (isConnected) {
        sendHeartbeat({ groupId });
      }
    }, 30000);
    
    return () => clearInterval(heartbeatInterval);
  }, [isConnected, groupId, sendHeartbeat]);

  // Subscribe to new messages
  useEffect(() => {
    if (!socket) return;
    
    const unsubscribe = subscribe('newMessage', (message) => {
      if (message.groupId === groupId) {
        setMessages(prev => [...prev, message]);
      }
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [socket, groupId, subscribe]);

  // Subscribe to socket events
  useEffect(() => {
    if (!socket) return;
    
    // Listen for typing indicators
    const unsubscribeTyping = subscribe('userTyping', (data) => {
      if (!session?.user?.id || data.userId === session.user.id) return; // Ignore own typing
      
      // Set typing status
      setTypingUsers(prev => ({ 
        ...prev, 
        [data.userId]: {
          id: data.userId,
          name: data.userName,
          image: data.userImage,
          isTyping: data.isTyping,
          timestamp: data.timestamp
        }
      }));
      
      // Clear typing status after 3 seconds of inactivity
      if (data.isTyping) {
        // Clear previous timeout for this user if exists
        if (typingTimeoutRef.current[data.userId]) {
          clearTimeout(typingTimeoutRef.current[data.userId]);
        }
        
        // Set new timeout
        typingTimeoutRef.current[data.userId] = setTimeout(() => {
          setTypingUsers(prev => {
            const newState = { ...prev };
            if (newState[data.userId]) {
              newState[data.userId].isTyping = false;
            }
            return newState;
          });
        }, 3000);
      }
    });
    
    // Cleanup
    return () => {
      unsubscribeTyping();
      
      // Clear all typing timeouts
      Object.values(typingTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [socket, subscribe, session?.user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch messages from API
  const fetchMessages = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(`/api/groups/${groupId}/messages`);
      
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
      // Clear the safety timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (!isConnected || !session?.user?.id) return;
    
    // Send typing indicator
    sendTyping({
      groupId,
      isTyping: value.length > 0
    });
  };

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isSending) return;
    
    setIsSending(true);
    
    // Create message object
    const messageData = {
      groupId,
      content: inputValue.trim()
    };
    
    // Create temporary message for immediate display
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: inputValue.trim(),
      groupId,
      senderId: session?.user?.id,
      senderName: session?.user?.name || 'You',
      senderImage: session?.user?.image || null,
      sentAt: new Date().toISOString(),
      isTemp: true
    };
    
    // Add temporary message immediately
    setMessages(prev => [...prev, tempMessage]);
    
    // Clear input right away for better UX
    setInputValue('');
    
    // Send "stopped typing" indicator
    if (isConnected) {
      sendTyping({
        groupId,
        isTyping: false
      });
    }
    
    // Try to send via socket first
    let socketSent = false;
    if (isConnected) {
      socketSent = sendMessage(messageData);
    }
    
    // If socket send failed, use REST API as fallback
    if (!socketSent) {
      try {
        const response = await fetch(`/api/groups/${groupId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        });
        
        if (!response.ok) {
          throw new Error('Failed to send message');
        }
        
        const data = await response.json();
        
        // Replace temp message with real one
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id ? {...data, isTemp: false} : msg
          )
        );
      } catch (error) {
        console.error('Error sending message:', error);
        // Mark temp message as failed
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id ? {...msg, sendFailed: true} : msg
          )
        );
      }
    }
    
    // Reset sending state
    setIsSending(false);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (chatContainerRef.current.requestFullscreen) {
        chatContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
    setShowWarning(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const renderMessage = (message) => {
    const isOwnMessage = message.userId === session?.user?.id;
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`flex items-start space-x-2 mb-4 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}
      >
        <div className="flex-shrink-0">
          {message.userImage ? (
            <Image
              src={message.userImage}
              alt={message.username}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold">
              {message.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {message.username}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {safeFormat(message.timestamp || message.sentAt || new Date(), 'HH:mm')}
            </span>
          </div>
          <motion.div
            className={`rounded-lg px-4 py-2 ${
              isOwnMessage
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.02 }}
          >
            {message.content}
          </motion.div>
        </div>
      </motion.div>
    );
  };

  return (
    <div ref={chatContainerRef} className="relative h-full w-full">
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <Card className="p-8 text-center max-w-md mx-4">
              <h3 className="text-2xl font-bold mb-4">⚠️ Fullscreen Recommended</h3>
              <p className="mb-6 text-gray-400">
                For the best chat experience, we recommend using fullscreen mode.
                This will help you focus on the conversation and avoid distractions.
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={toggleFullscreen} className="flex items-center gap-2">
                  <Maximize2 className="w-4 h-4" />
                  Enter Fullscreen
                </Button>
                <Button variant="ghost" onClick={() => setShowWarning(false)}>
                  Continue Anyway
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{
          width: isChatOpen ? '100%' : 'auto',
          height: isChatOpen ? '100%' : 'auto',
        }}
        className={`fixed bottom-4 right-4 z-40 ${
          isFullscreen ? 'inset-0 bottom-0 right-0' : ''
        }`}
      >
        {!isChatOpen ? (
          <Button
            onClick={() => setIsChatOpen(true)}
            size="lg"
            className="rounded-full p-4 shadow-lg"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="ml-2">Open Chat</span>
          </Button>
        ) : (
          <Card className="flex flex-col h-[600px] w-full max-w-2xl mx-auto shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Group Chat</h2>
                {isConnected && (
                  <span className="flex items-center text-xs text-green-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                    Live
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="hover:bg-muted"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsChatOpen(false)}
                  className="hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <GroupChatSkeleton />
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-red-500 mb-2">Failed to load messages</p>
                  <Button onClick={fetchMessages} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try again
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {messages.map(renderMessage)}
                  {Object.values(typingUsers)
                    .filter(user => user.isTyping)
                    .map(user => (
                      <TypingIndicator key={user.id} user={user} />
                    ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button type="submit" disabled={!inputValue.trim() || isSending}>
                  {isSending ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </motion.div>
    </div>
  );
} 
