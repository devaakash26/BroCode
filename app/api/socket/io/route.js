import { Server } from 'socket.io';
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';

// Store socket server instance
let socketIO;

// Server-side socket logic
const ioHandler = async (req) => {
  if (!socketIO) {
    // Get the raw HTTP server instance
    const httpServer = require('http').createServer();
    
    // Create socket server
    const io = new Server(httpServer, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Store socket server in the global variable
    socketIO = io;

    // Start the server on a free port
    httpServer.listen(0);

    // Middleware to authenticate socket connections
    io.use(async (socket, next) => {
      try {
        // Extract auth token from headers
        const token = socket.handshake.headers.cookie
          ?.split(';')
          .find(c => c.trim().startsWith('next-auth.session-token='));

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify the token
        const authToken = await getToken({
          req: {
            headers: {
              cookie: token,
            },
          },
          secret: process.env.NEXTAUTH_SECRET,
        });

        if (!authToken) {
          return next(new Error('Invalid authentication token'));
        }

        // Attach the user data to the socket for future reference
        socket.user = {
          id: authToken.id,
          email: authToken.email,
          name: authToken.name,
        };

        return next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        return next(new Error('Authentication error'));
      }
    });

    // Socket connection handler
    io.on('connection', async (socket) => {
      console.log(`User connected: ${socket.user?.name || 'Unknown'} (${socket.id})`);

      // Join a group room
      socket.on('joinGroup', async (groupId) => {
        try {
          // Check if user is a member of the group
          const membership = await prisma.userGroup.findUnique({
            where: {
              userId_groupId: {
                userId: socket.user.id,
                groupId,
              },
            },
          });

          if (!membership) {
            socket.emit('error', { message: 'Not a member of this group' });
            return;
          }

          // Join the group room
          socket.join(`group:${groupId}`);
          console.log(`${socket.user.name} joined group ${groupId}`);

          // Update last active time
          await prisma.userGroup.update({
            where: {
              userId_groupId: {
                userId: socket.user.id,
                groupId,
              },
            },
            data: {
              lastActive: new Date(),
            },
          });

          // Emit welcome message to the user
          socket.emit('groupJoined', {
            groupId,
            message: 'Successfully joined group room',
          });

          // Notify other group members
          socket.to(`group:${groupId}`).emit('memberActive', {
            userId: socket.user.id,
            userName: socket.user.name,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error('Join group error:', error);
          socket.emit('error', { message: 'Failed to join group', details: error.message });
        }
      });

      // Join a challenge room
      socket.on('joinChallenge', async (challengeId) => {
        try {
          // Get challenge details
          const challenge = await prisma.challenge.findUnique({
            where: { id: challengeId },
            include: {
              group: {
                include: {
                  members: {
                    where: { userId: socket.user.id },
                  },
                },
              },
            },
          });

          if (!challenge) {
            socket.emit('error', { message: 'Challenge not found' });
            return;
          }

          // Check if user is a member of the group
          if (challenge.group.members.length === 0) {
            socket.emit('error', { message: 'Not a member of this challenge group' });
            return;
          }

          // Join the challenge room
          socket.join(`challenge:${challengeId}`);
          console.log(`${socket.user.name} joined challenge ${challengeId}`);

          // Emit welcome message
          socket.emit('challengeJoined', {
            challengeId,
            message: 'Successfully joined challenge room',
          });

          // Get real-time leaderboard if enabled
          if (challenge.realTimeLeaderboard) {
            const leaderboard = await getLeaderboardData(challengeId);
            socket.emit('leaderboard', { challengeId, leaderboard });
          }

          // Notify others
          socket.to(`challenge:${challengeId}`).emit('memberActive', {
            userId: socket.user.id,
            userName: socket.user.name,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error('Join challenge error:', error);
          socket.emit('error', { message: 'Failed to join challenge', details: error.message });
        }
      });

      // Send chat message
      socket.on('sendMessage', async (data) => {
        try {
          const { groupId, challengeId, content, replyToId } = data;

          // Validate group membership
          const membership = await prisma.userGroup.findUnique({
            where: {
              userId_groupId: {
                userId: socket.user.id,
                groupId,
              },
            },
          });

          if (!membership) {
            socket.emit('error', { message: 'Not a member of this group' });
            return;
          }

          // Create message in database
          const message = await prisma.chatMessage.create({
            data: {
              content,
              senderId: socket.user.id,
              groupId,
              challengeId: challengeId || null,
              replyToId: replyToId || null,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          });

          // Broadcast to appropriate room
          const room = challengeId ? `challenge:${challengeId}` : `group:${groupId}`;
          io.to(room).emit('newMessage', message);
        } catch (error) {
          console.error('Send message error:', error);
          socket.emit('error', { message: 'Failed to send message', details: error.message });
        }
      });
      
      // Handle typing indicator
      socket.on('typing', async (data) => {
        try {
          const { groupId, challengeId, isTyping } = data;
          
          // Validate group membership
          const membership = await prisma.userGroup.findUnique({
            where: {
              userId_groupId: {
                userId: socket.user.id,
                groupId,
              },
            },
          });

          if (!membership) {
            socket.emit('error', { message: 'Not a member of this group' });
            return;
          }
          
          // Broadcast typing status to room (except sender)
          const room = challengeId ? `challenge:${challengeId}` : `group:${groupId}`;
          socket.to(room).emit('userTyping', {
            userId: socket.user.id,
            userName: socket.user.name,
            userImage: socket.user.image,
            isTyping,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error('Typing indicator error:', error);
        }
      });

      // Submit solution
      socket.on('submitSolution', async (data) => {
        try {
          const { challengeId, problemId, code, language } = data;

          // Create submission record
          const submission = await prisma.submission.create({
            data: {
              userId: socket.user.id,
              problemId,
              challengeId,
              code,
              language,
              status: 'PENDING',
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
              problem: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          });

          // Emit to user
          socket.emit('submissionCreated', {
            submissionId: submission.id,
            status: 'PENDING',
          });

          // Simulate judging process (in a real app, this would be a background job)
          setTimeout(async () => {
            try {
              // Mock judging result (randomly pass or fail for demo purposes)
              const status = Math.random() > 0.5 ? 'ACCEPTED' : 'WRONG_ANSWER';
              const points = status === 'ACCEPTED' ? 10 : 0;

              // Update submission with results
              const updatedSubmission = await prisma.submission.update({
                where: { id: submission.id },
                data: {
                  status,
                  results: { message: status === 'ACCEPTED' ? 'All test cases passed' : 'Some test cases failed' },
                  pointsEarned: points,
                  executionTime: Math.floor(Math.random() * 500),
                  memoryUsed: Math.floor(Math.random() * 100),
                },
              });

              // If accepted, update user's score
              if (status === 'ACCEPTED') {
                await prisma.userGroup.update({
                  where: {
                    userId_groupId: {
                      userId: socket.user.id,
                      groupId: submission.challenge.groupId,
                    },
                  },
                  data: {
                    score: { increment: points },
                    solvedCount: { increment: 1 },
                  },
                });
              }

              // Emit result to user
              socket.emit('submissionResult', {
                submissionId: submission.id,
                status,
                points,
                results: updatedSubmission.results,
              });

              // Update leaderboard for everyone in the challenge
              const leaderboard = await getLeaderboardData(challengeId);
              io.to(`challenge:${challengeId}`).emit('leaderboard', { challengeId, leaderboard });

              // Notify challenge room about the submission
              io.to(`challenge:${challengeId}`).emit('submissionUpdate', {
                submission: {
                  id: submission.id,
                  user: {
                    id: socket.user.id,
                    name: socket.user.name,
                  },
                  problem: {
                    id: submission.problem.id,
                    title: submission.problem.title,
                  },
                  status,
                  pointsEarned: points,
                  submittedAt: submission.submittedAt,
                },
              });
            } catch (error) {
              console.error('Submission processing error:', error);
            }
          }, 2000 + Math.random() * 3000); // Random delay to simulate processing
        } catch (error) {
          console.error('Submission error:', error);
          socket.emit('error', { message: 'Failed to submit solution', details: error.message });
        }
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user?.name || 'Unknown'} (${socket.id})`);
      });
    });
  }

  // Helper function to get leaderboard data
  async function getLeaderboardData(challengeId) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
        submissions: {
          where: {
            status: 'ACCEPTED',
          },
          select: {
            userId: true,
            problemId: true,
            pointsEarned: true,
          },
        },
      },
    });

    if (!challenge) {
      return [];
    }

    // Aggregate scores by user
    const userScores = {};
    challenge.group.members.forEach(member => {
      userScores[member.userId] = {
        userId: member.userId,
        userName: member.user.name,
        userImage: member.user.image,
        score: 0,
        solvedCount: 0,
        problemsSolved: new Set(),
      };
    });

    // Calculate scores from submissions
    challenge.submissions.forEach(sub => {
      if (userScores[sub.userId]) {
        userScores[sub.userId].score += sub.pointsEarned;
        userScores[sub.userId].problemsSolved.add(sub.problemId);
      }
    });

    // Convert problem sets to counts and prepare leaderboard
    const leaderboard = Object.values(userScores).map(user => ({
      userId: user.userId,
      userName: user.userName,
      userImage: user.userImage,
      score: user.score,
      solvedCount: user.problemsSolved.size,
    }));

    // Sort by score (descending)
    return leaderboard.sort((a, b) => b.score - a.score);
  }
};

export async function GET(req) {
  try {
    await ioHandler(req);
    return new NextResponse("Socket.io server running", { status: 200 });
  } catch (err) {
    console.error('Socket server error:', err);
    return new NextResponse('Socket server error', { status: 500 });
  }
} 