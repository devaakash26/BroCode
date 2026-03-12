# Online User Tracking System

## Overview

The BroCode application has a comprehensive, fault-proof online user tracking system that uses multiple layers of redundancy to ensure accurate real-time user presence.

## Architecture

### 1. **Socket Server (Primary Source of Truth)**

- Location: `socket-server.js` (production) or `server-dev.js` (development)
- Tracks users via WebSocket connections
- Stores tracking data in:
  - **Redis** (persistent, shared across instances)
  - **In-Memory Map** (fast fallback when Redis is unavailable)
- Exposes API endpoints:
  - `GET /api/online-users` - Returns all online users
  - `GET /api/online-count` - Returns count of online users
  - `GET /health` - Health check endpoint

### 2. **Client-Side Tracking**

- Location: `app/hooks/useSocket.js`
- Automatically identifies user on socket connection
- Sends heartbeat ping every 2 minutes to maintain presence
- Auto-reconnects and re-identifies on disconnect

### 3. **API Route (Multi-Fallback Query)**

- Location: `app/api/groups/[id]/online-users/route.js`
- Tries multiple sources in order:
  1.  **Socket Server** (queries active connections) - Most accurate
  2.  **Redis** (direct query) - Fast fallback
  3.  **Database** (recent activity) - Final fallback for users active in last 10 minutes

### 4. **Debug Endpoint**

- Location: `app/api/debug/online-status/route.js`
- Check current user's online status across all sources
- Provides recommendations for troubleshooting

## How It Works

### User Identification Flow

```
1. User visits site → Session established
2. Socket connects → useSocket hook initialized
3. Socket emits "identify" with user data
4. Server tracks user in:
   - socketConnections Map (userId → socket info)
   - inMemoryOnlineUsers Map (userId → user data)
   - Redis (key: user:online:{userId}, TTL: 30 min)
5. Server confirms with "identified" event
```

### Heartbeat Mechanism

**Client-Side (every 2 minutes):**

```javascript
socket.emit("ping") → Server responds with "pong"
```

**Server-Side (every 5 minutes):**

- Refreshes Redis TTL for all online users
- Updates timestamps in memory
- Verifies active socket connections

### Cleanup Mechanisms

1. **Stale Entry Cleanup** (every 5 minutes)
   - Removes users inactive for > 35 minutes from memory

2. **Disconnect Handler**
   - Removes user from all tracking stores immediately
   - Cleans up group/challenge room memberships

3. **TTL Expiration** (Redis)
   - Keys auto-expire after 30 minutes
   - Refreshed on heartbeat

## Configuration

### Environment Variables

```bash
# Socket Server URL (required for production)
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.railway.app

# Alternative socket server URL (internal)
SOCKET_SERVER_URL=https://your-socket-server.railway.app

# Redis Configuration (Railway)
RAILWAY_REDIS_URL=redis://default:password@host:port
REDIS_PROVIDER=railway

# OR Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
REDIS_PROVIDER=upstash
```

### Socket.io Configuration

**Production (socket-server.js):**

- Transports: websocket, polling
- Ping timeout: 60 seconds
- Ping interval: 25 seconds
- Auto-reconnect: Yes (infinite attempts)

**Client (useSocket.js):**

- Reconnection attempts: Infinite
- Reconnection delay: 1-10 seconds (exponential backoff)
- Timeout: 20 seconds

## Debugging

### Check If System Is Working

1. **Visit Debug Endpoint**

   ```
   GET /api/debug/online-status
   ```

   This will show:
   - Current user's online status in all sources
   - Socket server connection status
   - Redis connection status
   - Recommendations for issues

2. **Check Browser Console**

   ```
   [socket] connected <socket-id>
   [socket] ✓ User <user-id> identified on socket <socket-id>
   [socket] Sent online presence ping
   ```

3. **Check Server Logs**
   ```
   [socket-server] ✓ User <user-id> identified on socket <socket-id>
   [socket-server] 💓 Heartbeat: Refreshing TTL for X online users...
   [socket-server] /api/online-users - Returning X users
   ```

### Common Issues

#### Issue: Users not appearing as online

**Symptoms:** Online users list is empty or missing users

**Debugging Steps:**

1. Check if socket server is running and accessible

   ```bash
   curl https://your-socket-server.railway.app/health
   ```

2. Check environment variables:
   - `NEXT_PUBLIC_SOCKET_URL` must be set to socket server URL
   - Verify URL doesn't have trailing slash

3. Check browser console for socket connection errors

4. Use debug endpoint to verify tracking:
   ```
   GET /api/debug/online-status
   ```

**Solutions:**

- Ensure socket server is deployed and running
- Verify CORS is configured correctly in socket server
- Check Redis connection if using Railway/Upstash
- Restart socket server to clear stale connections

#### Issue: Lag in online user updates

**Symptoms:** User appears offline even though they're connected

**Causes:**

- Heartbeat not running (check client console)
- Socket disconnected but not detected
- Redis sync delay

**Solutions:**

- Verify heartbeat is being sent (check console logs)
- Check socket connection status in browser DevTools
- Restart socket server to sync Redis

#### Issue: Online users list includes offline users

**Symptoms:** Users who disconnected still appear online

**Causes:**

- Stale Redis entries
- Disconnect event not processed
- Server restart without cleanup

**Solutions:**

- Wait for TTL expiration (30 minutes max)
- Restart socket server to clear in-memory cache
- Check if cleanup interval is running in server logs

### Production Checklist

Before deploying to production, verify:

- [ ] `NEXT_PUBLIC_SOCKET_URL` environment variable is set
- [ ] Socket server is deployed and accessible
- [ ] Redis is configured and connected
- [ ] CORS origins include your domain
- [ ] Socket server health check returns 200 OK
- [ ] Test user identification (check `/api/debug/online-status`)
- [ ] Verify heartbeat mechanism is running
- [ ] Check server logs for tracking confirmations

## API Reference

### GET /api/groups/[id]/online-users

Returns users who are online and not members of the specified group.

**Response:**

```json
{
  "users": [
    {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "image": "https://...",
      "lastSeen": "2024-01-01T00:00:00.000Z"
    }
  ],
  "source": "socket-server",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Sources:**

- `socket-server` - From active socket connections (most accurate)
- `redis` - From Redis cache
- `database-recent` - From database (last 10 minutes)
- `none` - No source available

### GET /api/debug/online-status

Debug endpoint showing comprehensive online status information.

**Response:**

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "currentUser": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "sources": {
    "socketServer": {
      "available": true,
      "userCount": 5,
      "connectedSockets": 5,
      "currentUserOnline": true
    },
    "redis": {
      "available": true,
      "userCount": 5,
      "currentUserOnline": true
    }
  },
  "summary": {
    "socketServerAvailable": true,
    "redisAvailable": true,
    "totalOnlineUsers": 5
  },
  "recommendations": [
    "Current user is properly tracked as online in all available sources."
  ]
}
```

### Socket Events

#### Client → Server

- **`identify`** - Identify user on connection

  ```javascript
  socket.emit("identify", {
    id: userId,
    name: userName,
    image: userImage,
    email: userEmail,
  });
  ```

- **`ping`** - Heartbeat to maintain online presence

  ```javascript
  socket.emit("ping");
  ```

- **`heartbeat`** - Group-specific heartbeat
  ```javascript
  socket.emit("heartbeat", { groupId: "group-uuid" });
  ```

#### Server → Client

- **`identified`** - Confirmation of user identification

  ```javascript
  socket.on("identified", (data) => {
    // data: { success, userId, trackedInRedis, socketId, timestamp }
  });
  ```

- **`pong`** - Heartbeat acknowledgment

  ```javascript
  socket.on("pong", (data) => {
    // data: { timestamp }
  });
  ```

- **`heartbeatAck`** - Group heartbeat acknowledgment
  ```javascript
  socket.on("heartbeatAck", (data) => {
    // data: { success, timestamp }
  });
  ```

## Maintenance

### Monitoring

Monitor these metrics for health:

1. **Connection Count**
   - Check `/health` endpoint for `connections` count
   - Should match expected online users

2. **Redis Keys**
   - Query `user:online:*` pattern
   - Count should match or be close to connection count

3. **Heartbeat Logs**
   - Every 5 minutes: "Heartbeat complete: X active, Y refreshed"
   - Active count should equal connected sockets

4. **Error Rates**
   - Watch for Redis connection errors
   - Watch for identify failures

### Scaling Considerations

The system supports horizontal scaling with:

- **Redis** as shared state store
- **Socket.io Redis Adapter** for cross-instance communication
- **In-memory fallback** for resilience

For multiple socket server instances:

1. Ensure all connect to same Redis instance
2. Socket.io adapter handles cross-instance events
3. Each instance maintains its own socketConnections map

### Performance Tips

1. **Reduce heartbeat frequency** if needed (currently 2 min client, 5 min server)
2. **Adjust TTL** based on expected session duration (currently 30 min)
3. **Limit query results** in `/online-users` endpoint (currently 50 users max)
4. **Use WebSocket transport** for lower latency (fallback to polling)

## Future Enhancements

Potential improvements:

1. **Presence Channels** - Broadcast presence to specific rooms/channels
2. **Activity Status** - Track "active", "idle", "away" states
3. **Last Seen Precision** - Show "online now", "5 min ago", etc.
4. **Typing Indicators** - Global typing awareness
5. **Device Tracking** - Track multiple devices per user
6. **Analytics** - Track peak online times, session durations

## Support

If issues persist after following this guide:

1. Check all environment variables are set
2. Verify socket server is running and accessible
3. Review server logs for errors
4. Test with `/api/debug/online-status` endpoint
5. Check Redis connection and memory usage
6. Restart socket server and clear Redis cache

For production issues, enable debug logging:

```bash
DEBUG=socket.io* node socket-server.js
```
