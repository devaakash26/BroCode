'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import CodeEditor from '../problems/code-editor';
import PointsAnimation from '@/components/ui/points-animation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TypingIndicator from '@/app/components/ui/typing-indicator';
import useSocket from '@/app/hooks/useSocket';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trophy, 
  MessageCircle, 
  Code, 
  X,
  Info,
  Users
} from 'lucide-react';

export default function ChallengeInterface({ 
  challengeId, 
  groupId, 
  initialProblem, 
  problems,
  user
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('problem');
  const [currentProblem, setCurrentProblem] = useState(initialProblem);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [language, setLanguage] = useState('javascript');
  const chatEndRef = useRef(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef({});
  const [leaderboardStatus, setLeaderboardStatus] = useState({
    hasStarted: true,
    hasEnded: false
  });
  
  // Socket connection
  const { 
    socket, 
    isConnected, 
    joinChallenge,
    joinGroup,
    sendMessage: socketSendMessage,
    sendTyping,
    subscribe 
  } = useSocket({ disableToasts: true });

  // Determine the current problem index when component loads
  useEffect(() => {
    if (problems && problems.length > 0) {
      const index = problems.findIndex(p => p.id === initialProblem.id);
      if (index !== -1) {
        setCurrentProblemIndex(index);
      }
    }
  }, [initialProblem, problems]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch leaderboard data when tab changes to leaderboard
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    if (!challengeId || !groupId) return;
    
    setIsLeaderboardLoading(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/challenges/${challengeId}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard);
        setLeaderboardStatus(data.status);
      } else {
        console.error('Failed to fetch leaderboard');
        toast.error('Failed to load leaderboard data');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Error loading leaderboard');
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  // Fetch messages when the component mounts
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}/challenges/${challengeId}/messages`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [challengeId, groupId]);

  // Connect to socket when component mounts
  useEffect(() => {
    if (isConnected) {
      // Join both group and challenge rooms
      joinGroup(groupId);
      joinChallenge(challengeId);
    }
  }, [isConnected, groupId, challengeId, joinGroup, joinChallenge]);
  
  // Subscribe to socket events
  useEffect(() => {
    if (!socket) return;
    
    // Listen for new messages
    const unsubscribeNewMessage = subscribe('newMessage', (message) => {
      // Only add if it's for this group and challenge
      if (message.groupId === groupId && message.challengeId === challengeId) {
        setMessages(prev => {
          // Check if message already exists (to prevent duplicates)
          const exists = prev.some(m => m.id === message.id);
          return exists ? prev : [...prev, message];
        });
      }
    });
    
    // Listen for typing indicators
    const unsubscribeTyping = subscribe('userTyping', (data) => {
      if (data.userId === user.id) return; // Ignore own typing
      
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
      unsubscribeNewMessage();
      unsubscribeTyping();
      
      // Clear all typing timeouts
      Object.values(typingTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [socket, subscribe, groupId, challengeId, user.id]);

  // Navigate to the next problem
  const goToNextProblem = () => {
    if (currentProblemIndex < problems.length - 1) {
      const nextIndex = currentProblemIndex + 1;
      setCurrentProblem(problems[nextIndex]);
      setCurrentProblemIndex(nextIndex);
      setActiveTab('problem');
    }
  };

  // Navigate to the previous problem
  const goToPrevProblem = () => {
    if (currentProblemIndex > 0) {
      const prevIndex = currentProblemIndex - 1;
      setCurrentProblem(problems[prevIndex]);
      setCurrentProblemIndex(prevIndex);
      setActiveTab('problem');
    }
  };

  // Handle code submission result
  const handleSubmitResult = (result) => {
    if (result.status === 'ACCEPTED') {
      // Determine points based on difficulty
      let points = 0;
      switch (currentProblem.difficulty) {
        case 'EASY':
          points = 20;
          break;
        case 'MEDIUM':
          points = 50;
          break;
        case 'HARD':
          points = 100;
          break;
        default:
          points = 10;
      }
      
      setPointsEarned(points);
      setShowPointsAnimation(true);
      
      // Refresh leaderboard in the background
      fetchLeaderboard();
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Send typing indicator
    sendTyping({
      groupId,
      challengeId,
      isTyping: value.length > 0
    });
  };

  // Send a new chat message
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    // Create message data
    const messageData = {
      content: newMessage,
      groupId,
      challengeId
    };
    
    // Create temp message for immediate display
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage,
      sender: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
      sentAt: new Date().toISOString(),
      isSystem: false,
      groupId,
      challengeId
    };
    
    // Add to messages immediately
    setMessages(prev => [...prev, tempMessage]);
    
    // Clear input and send "stopped typing" indicator
    setNewMessage('');
    sendTyping({
      groupId,
      challengeId,
      isTyping: false
    });
    
    // Try socket first
    let socketSent = false;
    if (isConnected) {
      socketSent = socketSendMessage(messageData);
    }
    
    // If socket failed, use REST API as fallback
    if (!socketSent) {
      try {
        const response = await fetch(`/api/groups/${groupId}/challenges/${challengeId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: newMessage }),
        });
        
        if (response.ok) {
          // Get the actual message from the server
          const data = await response.json();
          
          // Replace temp message with real one
          setMessages(prev => 
            prev.map(msg => msg.id === tempMessage.id ? data.message : msg)
          );
        } else {
          toast.error('Failed to send message');
          // Mark message as failed
          setMessages(prev => 
            prev.map(msg => msg.id === tempMessage.id ? {...msg, sendFailed: true} : msg)
          );
        }
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Error sending message');
        // Mark message as failed
        setMessages(prev => 
          prev.map(msg => msg.id === tempMessage.id ? {...msg, sendFailed: true} : msg)
        );
      }
    }
  };

  // Exit the challenge view
  const exitChallenge = () => {
    router.push(`/groups/${groupId}/challenges/${challengeId}`);
  };

  // Calculate difficulty badge style
  const getDifficultyBadgeStyle = (difficulty) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'HARD':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex flex-col z-50">
      <Toaster position="top-center" />
      
      {/* Points animation overlay */}
      <PointsAnimation 
        points={pointsEarned} 
        difficulty={currentProblem?.difficulty} 
        isVisible={showPointsAnimation}
        onComplete={() => setShowPointsAnimation(false)}
      />
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={exitChallenge}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-semibold text-lg truncate max-w-xs">{currentProblem?.title}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyBadgeStyle(currentProblem?.difficulty)}`}>
                {currentProblem?.difficulty}
              </span>
              <span>Problem {currentProblemIndex + 1} of {problems?.length}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`p-2 rounded-full ${activeTab === 'leaderboard' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
          >
            <Trophy className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-2 rounded-full ${isChatOpen ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          
          <button
            onClick={goToPrevProblem}
            disabled={currentProblemIndex === 0}
            className={`p-2 rounded-full ${currentProblemIndex === 0 ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button
            onClick={goToNextProblem}
            disabled={currentProblemIndex === problems?.length - 1}
            className={`p-2 rounded-full ${currentProblemIndex === problems?.length - 1 ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-grow flex relative">
        {/* Main area - Problem or Leaderboard */}
        <div className={`flex-grow flex ${isChatOpen ? 'mr-80' : ''} transition-all duration-300`}>
          {activeTab === 'problem' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 w-full">
              {/* Problem Description */}
              <div className="bg-white dark:bg-gray-800 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold mb-4">{currentProblem?.title}</h2>
                
                <div className="prose dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: currentProblem?.description || '' }} />
                </div>
                
                {currentProblem?.examples && currentProblem.examples.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Examples</h3>
                    {currentProblem.examples.map((example, idx) => (
                      <div key={idx} className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="mb-2">
                          <span className="font-medium">Input:</span> {example.input}
                        </div>
                        <div className="mb-2">
                          <span className="font-medium">Output:</span> {example.output}
                        </div>
                        {example.explanation && (
                          <div>
                            <span className="font-medium">Explanation:</span> {example.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {currentProblem?.constraints && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Constraints</h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div dangerouslySetInnerHTML={{ __html: currentProblem.constraints || '' }} />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Code Editor */}
              <div className="bg-white dark:bg-gray-900 h-full">
                <CodeEditor 
                  problemId={currentProblem?.id}
                  initialCode={currentProblem?.templateCode?.[language] || ''}
                  testCases={currentProblem?.testCases || []}
                  onSubmit={handleSubmitResult}
                  challengeId={challengeId}
                />
              </div>
            </div>
          ) : activeTab === 'leaderboard' && (
            <div className="w-full p-6 overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                Challenge Leaderboard
              </h2>
              
              {isLeaderboardLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : leaderboard && leaderboard.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problems Solved</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {leaderboard.map((entry) => (
                        <tr key={entry.user.id} className={entry.user.id === user?.id ? 'bg-blue-50 dark:bg-blue-900/10' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium">{entry.rank}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {entry.user.image ? (
                                <Image
                                  src={entry.user.image}
                                  alt={entry.user.name}
                                  width={28}
                                  height={28}
                                  className="rounded-full mr-2"
                                />
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                                  <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                </div>
                              )}
                              <span className="font-medium">{entry.user.name}</span>
                              {entry.user.id === user?.id && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {entry.problemsSolved}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-indigo-600 dark:text-indigo-400">
                            {entry.score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Trophy className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {!leaderboardStatus.hasStarted 
                      ? 'Leaderboard will be available once the challenge begins.' 
                      : leaderboardStatus.hasEnded && leaderboard.length === 0
                        ? 'Challenge has ended. No submissions were made.'
                        : 'No submissions yet. Be the first to submit!'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Chat panel */}
        <div 
          className={`absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 ${
            isChatOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Challenge Chat</h3>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                  <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Be the first to send a message!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender.id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-lg p-3 ${
                          message.isSystem 
                            ? 'bg-gray-100 dark:bg-gray-700 text-center w-full'
                            : message.sender.id === user?.id
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {!message.isSystem && message.sender.id !== user?.id && (
                          <div className="flex items-center gap-2 mb-1">
                            {message.sender.image ? (
                              <Image
                                src={message.sender.image}
                                alt={message.sender.name}
                                width={18}
                                height={18}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600" />
                            )}
                            <span className="text-xs font-medium">{message.sender.name}</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words">{message.content}</div>
                        <div className="text-xs mt-1 opacity-70 text-right">
                          {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {Object.values(typingUsers)
                    .filter(user => user.isTyping)
                    .map(user => (
                      <TypingIndicator key={user.id} user={user} />
                    ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleInputChange(e)}
                  placeholder="Type a message..."
                  className="flex-grow p-2 bg-gray-100 dark:bg-gray-700 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className={`p-2 rounded-md ${
                    newMessage.trim()
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 