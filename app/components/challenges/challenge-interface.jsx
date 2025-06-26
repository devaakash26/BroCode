'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
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
  Users,
  Maximize,
  Minimize,
  Play,
  User,
  Send,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';
import { LeaderboardSkeleton } from '@/components/ui/card-skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

export default function ChallengeInterface({
  groupId,
  challengeId,
  currentProblem,
  problems,
  user,
  challenge
}) {
  const router = useRouter();
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('problem');
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
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isJoinWindowClosed, setIsJoinWindowClosed] = useState(false);
  const [isChallengeEnded, setIsChallengeEnded] = useState(false);
  const timerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(true);
  const [warningCount, setWarningCount] = useState(0);
  const [lastSubmission, setLastSubmission] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Handle disqualification
  const handleDisqualify = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/challenges/${challengeId}/disqualify`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.error('You have been disqualified from the challenge.');
        router.push(`/groups/${groupId}/challenges`);
      } else {
        console.error('Failed to process disqualification');
      }
    } catch (error) {
      console.error('Error processing disqualification:', error);
    }
  };

  // Exit challenge and fullscreen
  const exitChallenge = async () => {
    try {
      router.push(`/groups/${groupId}/challenges/${challengeId}`);
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  };

  // Calculate initial time states and start timer
  useEffect(() => {
    if (!challenge?.startTime || !challenge?.endTime) {
      console.error('Challenge start or end time not provided');
      return;
    }

    const now = new Date();
    const startTime = new Date(challenge.startTime);
    const endTime = new Date(challenge.endTime);
    const joinWindowEnd = new Date(startTime.getTime() + 10 * 60 * 1000); // 10 minutes after start

    // Check if join window is closed
    if (now > joinWindowEnd) {
      setIsJoinWindowClosed(true);
      if (!hasStarted) {
        router.push(`/groups/${groupId}/challenges`);
        toast.error("Challenge join window has expired (10 minutes after start time)");
        return;
      }
    }

    // Check if challenge has ended
    if (now > endTime) {
      setIsChallengeEnded(true);
      if (hasStarted) {
        exitChallenge();
      }
      return;
    }

    // Start timer
    const updateTimer = () => {
      const currentTime = new Date();
      const timeLeft = endTime - currentTime;
      
      if (timeLeft <= 0) {
        setIsChallengeEnded(true);
        clearInterval(timerRef.current);
        if (hasStarted) {
          exitChallenge();
        }
        return;
      }

      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      setTimeRemaining({ hours, minutes, seconds });
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [challenge?.startTime, challenge?.endTime, hasStarted, exitChallenge, groupId, router]);

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
    if (challenge && challenge.problems && challenge.problems.length > 0) {
      const index = challenge.problems.findIndex(p => p.id === currentProblem.id);
      if (index !== -1) {
        setCurrentProblemIndex(index);
      }
    }
  }, [currentProblem, challenge]);

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
      
      // Subscribe to socket events
      const unsubscribeLeaderboard = subscribe('leaderboardUpdate', (data) => {
        setLeaderboard(data.leaderboard);
        setLastSubmission(data.lastSubmission);
        
        // Show toast for new submissions
        if (data.lastSubmission && data.lastSubmission.userId !== user.id) {
          toast.success(
            `${data.lastSubmission.userName || 'Someone'} just solved a problem! (+${data.lastSubmission.points} points)`,
            { duration: 3000 }
          );
        }
      });
      
      const unsubscribeParticipantCount = subscribe('participantCountUpdate', (data) => {
        if (data.challengeId === challengeId) {
          setParticipantCount(data.count);
        }
      });
      
      const unsubscribeParticipantJoined = subscribe('participantJoined', (data) => {
        toast.success(`${data.userName} joined the challenge!`, { duration: 2000 });
      });

      const unsubscribeChallengeEnded = subscribe('challengeEnded', (data) => {
        if (data.challengeId === challengeId) {
          setIsChallengeEnded(true);
          if (hasStarted) {
            exitChallenge();
          }
        }
      });
      
      return () => {
        unsubscribeLeaderboard();
        unsubscribeParticipantCount();
        unsubscribeParticipantJoined();
        unsubscribeChallengeEnded();
      };
    }
  }, [isConnected, groupId, challengeId, user.id, hasStarted, exitChallenge]);

  // Navigate to the next problem
  const goToNextProblem = () => {
    if (currentProblemIndex < challenge.problems.length - 1) {
      const nextIndex = currentProblemIndex + 1;
      setCurrentProblemIndex(nextIndex);
      setActiveTab('problem');
    }
  };

  // Navigate to the previous problem
  const goToPrevProblem = () => {
    if (currentProblemIndex > 0) {
      const prevIndex = currentProblemIndex - 1;
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

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
      setShowWarning(false);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
      setShowExitWarning(true);
    }
  };

  if (isChallengeEnded) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <Trophy className="w-16 h-16 text-yellow-400 mb-4" />
        <h2 className="text-3xl font-bold mb-2">Challenge Over!</h2>
        <p className="text-lg text-gray-400 mb-8">Great job! The challenge has ended. Hope you enjoyed it!</p>
        <Button onClick={() => router.push(`/groups/${groupId}`)}>Back to Group</Button>
      </div>
    );
  }
  
  if (isJoinWindowClosed) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-3xl font-bold mb-2">Join Window Closed</h2>
        <p className="text-lg text-gray-400 mb-8">The 10-minute window to join this challenge has passed.</p>
        <Button onClick={() => router.push(`/groups/${groupId}`)}>Back to Group</Button>
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className="min-h-screen bg-background">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center space-x-4">
            <button
              onClick={exitChallenge}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Challenge Mode</h1>
            {participantCount > 0 && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="w-4 h-4 mr-1" />
                {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* Timer display */}
            {timeRemaining && (
              <div className={`font-mono text-lg ${timeRemaining.hours === 0 && timeRemaining.minutes < 10 ? 'text-destructive' : ''}`}>
                {String(timeRemaining.hours).padStart(2, '0')}:
                {String(timeRemaining.minutes).padStart(2, '0')}:
                {String(timeRemaining.seconds).padStart(2, '0')}
              </div>
            )}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-lg transition-colors ${
                isFullscreen ? 'bg-accent' : 'hover:bg-accent'
              }`}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setShowExitWarning(true)}
              className={`p-2 rounded-lg transition-colors ${
                showExitWarning ? 'bg-accent' : 'hover:bg-accent'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Problem/Leaderboard section */}
          <div className={`flex-1 ${isChatOpen ? 'mr-80' : ''} transition-all duration-300`}>
            {activeTab === 'problem' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                {/* Problem description */}
                <div className="bg-background overflow-y-auto border-r">
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">{currentProblem?.title}</h2>
                    <div className="prose dark:prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: currentProblem?.description || '' }} />
                    </div>
                    
                    {/* Examples section */}
                    {currentProblem?.examples && currentProblem.examples.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-3">Examples</h3>
                        {currentProblem.examples.map((example, idx) => (
                          <div key={idx} className="mb-4 p-4 bg-accent/50 rounded-lg">
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
                  </div>
                </div>

                {/* Code editor */}
                <div className="bg-background h-full">
                  <CodeEditor 
                    problemId={currentProblem?.id}
                    initialCode={currentProblem?.templateCode?.[language] || ''}
                    testCases={currentProblem?.testCases || []}
                    onSubmit={handleSubmitResult}
                    challengeId={challengeId}
                    isDisabled={isChallengeEnded}
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
                  Leaderboard
                  {isChallengeEnded && <span className="ml-2 text-sm text-muted-foreground">(Final)</span>}
                </h2>
                
                {isLeaderboardLoading ? (
                  <LeaderboardSkeleton />
                ) : leaderboard.length > 0 ? (
                  <div className="space-y-6">
                    {/* Last submission notification */}
                    {lastSubmission && !isChallengeEnded && (
                      <div className="bg-accent/50 p-4 rounded-lg mb-4 animate-fade-in">
                        <p className="text-sm">
                          Last submission: <span className="font-medium">{lastSubmission.userName || 'Someone'}</span> solved a problem for <span className="font-medium">{lastSubmission.points} points</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(lastSubmission.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                    
                    {/* Leaderboard table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Rank</th>
                            <th className="text-left py-3 px-4">Participant</th>
                            <th className="text-left py-3 px-4">Problems Solved</th>
                            <th className="text-left py-3 px-4">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((entry, index) => (
                            <tr 
                              key={entry.userId} 
                              className={`border-b ${
                                entry.userId === user.id ? 'bg-accent/50' : ''
                              } ${
                                !isChallengeEnded && lastSubmission?.userId === entry.userId ? 'animate-highlight' : ''
                              }`}
                            >
                              <td className="py-3 px-4">{index + 1}</td>
                              <td className="py-3 px-4 flex items-center">
                                {entry.user.image ? (
                                  <Image
                                    src={entry.user.image}
                                    alt={entry.user.name}
                                    width={32}
                                    height={32}
                                    className="rounded-full mr-2"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center mr-2">
                                    <User className="w-4 h-4" />
                                  </div>
                                )}
                                <span>{entry.user.name}</span>
                              </td>
                              <td className="py-3 px-4">{entry.problemsSolved}</td>
                              <td className="py-3 px-4">{entry.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No submissions yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat sidebar */}
          {hasStarted && !isChallengeEnded && (
            <div
              className={`fixed right-0 top-0 bottom-0 w-80 bg-background border-l transform transition-transform duration-300 ${
                isChatOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Chat</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-4 flex ${message.userId === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.userId === user.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={sendMessage} className="p-4 border-t">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleInputChange}
                      placeholder="Type a message..."
                      className="flex-1 bg-accent/50 rounded-lg px-3 py-2"
                    />
                    <Button type="submit">Send</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Warning */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <Card className="p-8 text-center max-w-md mx-4">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">Fullscreen Recommended</h3>
              <p className="mb-6 text-gray-400">
                For the best challenge experience, we recommend using fullscreen mode.
                This will help you focus and avoid distractions.
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

        {showExitWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50"
          >
            <Card className="p-4 bg-yellow-500/10 border-yellow-500/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <p className="text-sm">Exiting fullscreen mode may affect your focus</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExitWarning(false)}
                  className="ml-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 
