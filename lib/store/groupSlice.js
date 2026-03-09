import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Async thunk to fetch group data
export const fetchGroup = createAsyncThunk(
  "group/fetchGroup",
  async (groupId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/groups/${groupId}`);
      if (!response.ok) {
        const err = await response.json();
        return rejectWithValue(err.message || "Failed to fetch group");
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
  {
    // condition runs BEFORE pending is dispatched — safe to read real status
    condition: (groupId, { getState }) => {
      const { status, lastFetched, failedAt } = getState().group;
      // Block concurrent fetches
      if (status === "loading") return false;
      // Use cached Redux state if same group succeeded
      if (status === "succeeded" && lastFetched === groupId) return false;
      // Retry cooldown: block for 15 s after a failure to stop storm-retries
      if (status === "failed" && failedAt && Date.now() - failedAt < 15_000)
        return false;
      return true;
    },
  },
);

const groupSlice = createSlice({
  name: "group",
  initialState: {
    data: null,
    isAdmin: false,
    isMember: false,
    userRole: null,
    activeMembers: [],
    leaderboard: [],
    typingUsers: {},
    messages: [],
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    lastFetched: null, // groupId that was last fetched
    failedAt: null, // timestamp of last failure, for retry cooldown
  },
  reducers: {
    setActiveMembers(state, action) {
      state.activeMembers = action.payload;
    },
    upsertActiveMember(state, action) {
      const member = action.payload;
      const idx = state.activeMembers.findIndex(
        (m) => m.userId === member.userId,
      );
      if (idx >= 0) {
        state.activeMembers[idx] = { ...state.activeMembers[idx], ...member };
      } else {
        state.activeMembers.push(member);
      }
    },
    pruneStaleMembers(state) {
      const cutoff = Date.now() - 5 * 60 * 1000;
      state.activeMembers = state.activeMembers.filter(
        (m) => new Date(m.timestamp).getTime() > cutoff,
      );
    },
    setLeaderboard(state, action) {
      state.leaderboard = action.payload;
    },
    setTypingUser(state, action) {
      const { userId, name, image, isTyping } = action.payload;
      if (isTyping) {
        state.typingUsers[userId] = {
          userId,
          name,
          image,
          timestamp: Date.now(),
        };
      } else {
        delete state.typingUsers[userId];
      }
    },
    clearTypingUser(state, action) {
      delete state.typingUsers[action.payload];
    },
    addMessage(state, action) {
      state.messages.push(action.payload);
    },
    // Replace the first temp message from same sender with the confirmed real message
    confirmMessage(state, action) {
      const msg = action.payload;
      const tempIdx = state.messages.findIndex(
        (m) => m.isTemp && m.senderId === msg.senderId,
      );
      if (tempIdx >= 0) {
        state.messages[tempIdx] = msg;
      }
      // If no temp found, do nothing — avoids duplicate
    },
    setMessages(state, action) {
      state.messages = action.payload;
    },
    clearGroup(state) {
      state.data = null;
      state.isAdmin = false;
      state.isMember = false;
      state.userRole = null;
      state.activeMembers = [];
      state.leaderboard = [];
      state.typingUsers = {};
      state.messages = [];
      state.status = "idle";
      state.error = null;
      state.lastFetched = null;
      state.failedAt = null;
    },
    updateGroupData(state, action) {
      if (state.data) {
        state.data = { ...state.data, ...action.payload };
      }
    },
    removeMember(state, action) {
      const userId = action.payload;
      if (state.data?.members) {
        state.data.members = state.data.members.filter(
          (m) => m.userId !== userId,
        );
        if (state.data._count) {
          state.data._count.members = Math.max(
            0,
            (state.data._count.members || 1) - 1,
          );
        }
      }
      state.leaderboard = state.leaderboard.filter((m) => m.userId !== userId);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroup.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchGroup.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload.group;
        state.isAdmin = action.payload.isAdmin;
        state.isMember = action.payload.isMember;
        state.userRole = action.payload.userRole;
        state.lastFetched = action.payload.group?.id;

        // Build initial leaderboard from members
        if (action.payload.group?.members) {
          state.leaderboard = [...action.payload.group.members]
            .map((m) => ({
              userId: m.userId,
              userName: m.user.name,
              userImage: m.user.image,
              score: m.score,
              solvedCount: m.solvedCount,
              lastActive: m.lastActive,
            }))
            .sort((a, b) => b.score - a.score);
        }
      })
      .addCase(fetchGroup.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Unknown error";
        state.failedAt = Date.now(); // record failure timestamp for cooldown
      });
  },
});

export const {
  setActiveMembers,
  upsertActiveMember,
  pruneStaleMembers,
  setLeaderboard,
  setTypingUser,
  clearTypingUser,
  addMessage,
  confirmMessage,
  setMessages,
  clearGroup,
  updateGroupData,
  removeMember,
} = groupSlice.actions;

export default groupSlice.reducer;
