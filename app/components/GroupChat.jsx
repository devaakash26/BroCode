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

  const filteredTypingUsers = Object.values(typingUsers)
    .filter(user => user.isTyping && user.id !== session?.user?.id);

  if (!isChatOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setIsChatOpen(true)} className="rounded-full h-16 w-16 shadow-lg">
          <MessageSquare />
        </Button>
      </div>
    );
  }

  return (
    <div ref={chatContainerRef} className={`fixed bottom-0 right-0 z-40 transition-all duration-300 ${isChatOpen ? 'w-full md:w-96 h-full md:h-[600px]' : 'w-0 h-0'}`}>
      <Card className="h-full w-full flex flex-col rounded-t-lg shadow-xl bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <header className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-indigo-500" />
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Group Chat</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
              {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <GroupChatSkeleton />
          ) : loadError ? (
            <div className="text-center py-10">
              <p className="text-red-500 mb-4">Failed to load messages.</p>
              <Button onClick={fetchMessages}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Typing Indicator */}
        {filteredTypingUsers.length > 0 && (
          <div className="px-4 pb-2">
            <TypingIndicator users={filteredTypingUsers} />
          </div>
        )}

        {/* Message Input */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <Input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Type a message..."
              disabled={isSending || !isConnected}
              className="flex-1"
            />
            <Button type="submit" disabled={isSending || !isConnected}>
              {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
} 
