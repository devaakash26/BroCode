'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Send, RefreshCw, Clock } from 'lucide-react';
import Image from 'next/image';
import useSocket from '@/app/hooks/useSocket';
import { format } from 'date-fns';
import TypingIndicator from '@/app/components/ui/typing-indicator';

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

  // Format timestamp
  const formatMessageTime = (timestamp) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch (error) {
      return '';
    }
  };
  
  // Render message
  const renderMessage = (message) => {
    const isOwnMessage = message.senderId === session?.user?.id;
    const isTempMessage = message.isTemp;
    const hasFailedToSend = message.sendFailed;
    
    return (
      <div 
        key={message.id} 
        className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      >
        {!isOwnMessage && (
          <div className="flex-shrink-0 mr-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
              {message.senderImage ? (
                <Image 
                  src={message.senderImage} 
                  alt={message.senderName} 
                  width={32} 
                  height={32}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium">
                  {message.senderName?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div 
          className={`max-w-[75%] ${
            isOwnMessage 
              ? isTempMessage 
                ? hasFailedToSend 
                  ? 'bg-red-100 dark:bg-red-900/30 text-gray-800 dark:text-gray-200' 
                  : 'bg-indigo-200 dark:bg-indigo-900/50 text-gray-800 dark:text-gray-200'
                : 'bg-indigo-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700'
          } ${
            isOwnMessage ? 'rounded-tl-lg rounded-tr-none' : 'rounded-tr-lg rounded-tl-none'
          } rounded-bl-lg rounded-br-lg px-4 py-2`}
        >
          {!isOwnMessage && (
            <div className="font-medium text-xs text-gray-600 dark:text-gray-300 mb-1">
              {message.senderName}
            </div>
          )}
          <div className="break-words">{message.content}</div>
          <div className="text-xs mt-1 opacity-70 text-right flex justify-end items-center">
            {hasFailedToSend && (
              <span className="text-red-500 text-xs mr-2">Failed to send</span>
            )}
            {isTempMessage && !hasFailedToSend && (
              <span className="text-gray-500 text-xs mr-2">Sending...</span>
            )}
            {formatMessageTime(message.sentAt)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-medium">Group Chat</h3>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></div>
              <span>Live</span>
            </div>
          ) : (
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-3.5 w-3.5 mr-1" />
              <span>Offline</span>
            </div>
          )}
          <button 
            onClick={fetchMessages}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-md"
            aria-label="Refresh messages"
            title="Refresh messages"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p className="mb-2">Failed to load messages</p>
            <button 
              onClick={fetchMessages}
              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Try again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            No messages yet. Be the first to say hello!
          </div>
        ) : (
          <div>
            {messages.map(renderMessage)}
            {Object.values(typingUsers)
              .filter(user => user.isTyping)
              .map(user => (
                <TypingIndicator key={user.id} user={user} />
              ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 