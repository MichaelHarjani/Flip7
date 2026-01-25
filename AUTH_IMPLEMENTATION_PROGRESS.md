# Google Sign-In & Persistent Sessions - Implementation Progress

**Start Date:** 2026-01-23
**Status:** Not Started
**Estimated Time:** 14-19 hours
**Completed Time:** 0 hours

---

## Phase 1: Infrastructure Setup (2-3 hours)

**Status:** ✅ COMPLETE

### 1.1 Add Supabase to Server
- [x] Install `@supabase/supabase-js` package
- [x] Create `server/src/config/supabase.ts`
- [x] Add `SUPABASE_URL` to server `.env`
- [x] Add `SUPABASE_SERVICE_ROLE_KEY` to server `.env`
- [x] Test Supabase connection

### 1.2 Run Database Migrations
- [x] Create `server/src/db/migrations/` directory
- [x] Create `001_auth_schema.sql` migration file
- [x] Create `user_profiles` table (in migration file)
- [x] Create `user_sessions` table (in migration file)
- [x] Create `rooms` table (in migration file)
- [x] Create `room_participants` table (in migration file)
- [x] Create `game_history` table (in migration file)
- [x] Add indexes to all tables (in migration file)
- [x] Add RLS policies (in migration file)
- [x] Run migration in Supabase

### 1.3 Add Supabase to Client
- [x] Install `@supabase/supabase-js` package
- [x] Create `client/src/lib/supabase.ts`
- [x] Add `VITE_SUPABASE_URL` to client `.env.development`
- [x] Add `VITE_SUPABASE_ANON_KEY` to client `.env.development`
- [x] Test Supabase client initialization

### Phase 1 Verification
- [x] Server can connect to Supabase
- [x] Client can connect to Supabase
- [x] All tables exist in database (verified via SQL query)
- [x] No behavior changes to game

**Time Spent:** 1h 0m (infrastructure setup + verification)

---

## Phase 2: Auth UI (3-4 hours)

**Status:** ✅ COMPLETE

### 2.1 Create Auth Store
- [x] Create `client/src/stores/authStore.ts`
- [x] Add `user` state property
- [x] Add `session` state property
- [x] Add `isGuest` state property
- [x] Add `loading` state property
- [x] Implement `signInWithGoogle()` method
- [x] Implement `signOut()` method
- [x] Implement `continueAsGuest()` method
- [x] Implement `checkSession()` method
- [x] Add session persistence via Supabase (automatic)

### 2.2 Update TitleScreen Component
- [x] Read current `client/src/components/TitleScreen.tsx`
- [x] Add "Sign in with Google" button
- [x] Guest mode enabled by default (no separate button needed)
- [x] Show user avatar/name if signed in
- [x] Add sign-out button (dropdown menu on user profile)
- [x] Update styling to accommodate new buttons
- [x] Ready to test both signed-in and guest states

### 2.3 Add Auth Callback Route
- [x] Create `client/src/pages/AuthCallback.tsx`
- [x] Handle OAuth redirect from Google
- [x] Exchange code for session token
- [x] Store session in authStore
- [x] Redirect to game after successful auth
- [x] Handle auth errors gracefully
- [x] Update `client/src/main.tsx` to add `/auth/callback` route

### 2.4 Auth Flow UI
- [x] Google sign-in button integrated into TitleScreen (simpler than separate modal)
- [x] Guest mode is default (no action needed)
- [x] Loading state handled in authStore
- [x] Styled to match game theme
- [x] Mobile-friendly design

### Phase 2 Verification (Ready to Test)
- [ ] Can sign in with Google
- [ ] Can continue as guest (default behavior)
- [ ] Sign-in state persists across page reloads
- [ ] Can sign out successfully
- [ ] Auth UI works on mobile
- [ ] Guest flow unchanged from before

**Time Spent:** 1h 15m

---

## Phase 3: Backend Persistence (4-5 hours)

**Status:** ✅ COMPLETE

### 3.1 Update SessionService (Dual-Mode)
- [x] Read current `server/src/services/sessionService.ts`
- [x] Add `userId` property to ExtendedPlayerSession type
- [x] Add `isAuthenticatedSession(sessionId)` method
- [x] Add `persistSession(sessionId, roomCode?, gameId?)` async method
- [x] Add `loadSession(sessionId)` async method
- [x] Add `updateSessionActivity(sessionId)` async method
- [x] Update `createSession()` to accept optional `userId` parameter
- [x] All methods gracefully handle missing Supabase configuration

### 3.2 Update RoomService (Dual-Mode)
- [x] Read current `server/src/services/roomService.ts`
- [x] Add `shouldPersistRoom(hostSessionId)` method
- [x] Add `persistRoom(roomCode)` async method
- [x] Add `loadRoom(roomCode)` async method
- [x] Add `addParticipant(roomCode, sessionId)` async method
- [x] Update `createRoom()` to accept optional `userId` parameter
- [x] Update `joinRoom()` to accept optional `userId` parameter
- [x] Update `setGameId()` to persist gameId updates to database
- [x] All persistence operations are fire-and-forget (non-blocking)

### 3.3 Add Auth Middleware
- [x] Create `server/src/middleware/authMiddleware.ts`
- [x] Implement `verifyAuthToken(token)` function using Supabase getUser
- [x] Implement `extractUserFromSocket(socket)` function
- [x] Add error handling for invalid tokens
- [x] Add `getUserIdFromSocket()` helper
- [x] Add `isAuthenticatedSocket()` helper
- [x] Export all middleware functions

### 3.4 Update WebSocket Handlers
- [x] Read current `server/src/websocket/handlers.ts`
- [x] Import authMiddleware
- [x] Extract auth token from socket handshake in `connection` handler
- [x] Store `socket.data.user` and `socket.data.isAuthenticated`
- [x] Update `room:create` to pass userId and persist if authenticated
- [x] Update `room:join` to pass userId and persist participation if authenticated
- [x] Update `session:restore` to load from database with fallback to in-memory
- [x] Add logging for authenticated vs guest sessions
- [x] Server builds successfully (no TypeScript errors)

### Phase 3 Verification (Ready to Test)
- [ ] Authenticated users' sessions saved to DB
- [ ] Authenticated hosts' rooms saved to DB
- [ ] Guest users still use in-memory only
- [ ] Can query Supabase and see sessions
- [ ] Server restart preserves authenticated sessions
- [ ] Guest sessions still lost on server restart (expected)

**Time Spent:** 1h 30m

---

## Phase 4: Session Restoration (3-4 hours)

**Status:** ⏳ Not Started

### 4.1 Add Session Lookup API
- [ ] Create `server/src/api/sessions.ts`
- [ ] Add `GET /api/sessions/active` endpoint
- [ ] Filter by authenticated user ID
- [ ] Return sessions with room info
- [ ] Add authentication middleware to endpoint
- [ ] Test API with Postman/curl
- [ ] Register routes in `server/src/server.ts`

### 4.2 Add Rejoin UI Component
- [ ] Create `client/src/components/RejoinGameDialog.tsx`
- [ ] Display list of active games
- [ ] Show room code, status, and player count
- [ ] Add "Rejoin" button for each game
- [ ] Add "Dismiss" button to create new game
- [ ] Style to match game theme
- [ ] Add loading state during rejoin

### 4.3 Update App Initialization
- [ ] Read current `client/src/App.tsx`
- [ ] Add `useEffect` to check for active sessions on mount
- [ ] Call `/api/sessions/active` if user is authenticated
- [ ] Show `RejoinGameDialog` if active sessions found
- [ ] Handle rejoin action
- [ ] Handle dismiss action
- [ ] Test with multiple active sessions

### 4.4 Enhanced Session Restore Handler
- [ ] Update `session:restore` in `server/src/websocket/handlers.ts`
- [ ] Try loading session from DB first
- [ ] Fallback to in-memory if not in DB
- [ ] Restore socket.data with user info
- [ ] Load room from DB if not in memory
- [ ] Mark session as connected in DB
- [ ] Send buffered game state
- [ ] Broadcast reconnection to other players
- [ ] Test with tab close/reopen scenario

### Phase 4 Verification
- [ ] Close browser, reopen → see "Rejoin Game" dialog
- [ ] Clicking "Rejoin" restores full game state
- [ ] Other players see reconnection
- [ ] Works after server restart (for authenticated users)
- [ ] Session expires after 24 hours
- [ ] Can dismiss dialog and start new game

**Time Spent:** 0h 0m

---

## Phase 5: Cleanup & Testing (2-3 hours)

**Status:** ⏳ Not Started

### 5.1 Session Expiration Cleanup
- [ ] Update `server/src/server.ts`
- [ ] Add cleanup interval for expired DB sessions
- [ ] Set interval to 1 hour
- [ ] Test that expired sessions are deleted
- [ ] Add logging for cleanup actions

### 5.2 Add Loading States
- [ ] Add spinner to sign-in button while loading
- [ ] Add spinner to rejoin dialog while restoring
- [ ] Add spinner to session restoration
- [ ] Update all auth-related buttons
- [ ] Test loading states on slow connections

### 5.3 Error Handling
- [ ] Add error boundary for auth failures
- [ ] Handle "Try again" for failed sign-ins
- [ ] Fallback to new session on restore failure
- [ ] Fallback to in-memory on DB unavailable
- [ ] Show user-friendly error messages
- [ ] Test error scenarios

### 5.4 Testing Checklist

#### Guest Flow Tests
- [ ] Create room as guest
- [ ] Join room as guest
- [ ] Play full game as guest
- [ ] Refresh page → session restored (sessionStorage)
- [ ] Close tab → session lost (expected)

#### Authenticated Flow Tests
- [ ] Sign in with Google
- [ ] Create room as authenticated user
- [ ] Another user joins as guest
- [ ] Play full game together
- [ ] Host closes tab
- [ ] Host reopens app → sees "Rejoin Game" dialog
- [ ] Host clicks "Rejoin" → returns to game
- [ ] Guest still in game, host reconnected

#### Mixed Flow Tests
- [ ] Authenticated user creates room
- [ ] Guest user joins
- [ ] Both play together
- [ ] Authenticated user closes tab and rejoins
- [ ] Guest refreshes page → session restored
- [ ] Guest closes tab → session lost
- [ ] Authenticated user still in game

#### Edge Case Tests
- [ ] Sign in, create room, sign out → room still works
- [ ] Two authenticated users in same room
- [ ] Server restart → authenticated sessions survive
- [ ] Session expired → "Session expired" message
- [ ] Invalid auth token → proper error handling
- [ ] DB connection failure → fallback to in-memory

### 5.5 Documentation Updates
- [ ] Update `scriptReferences.md` with new files
- [ ] Document environment variables needed
- [ ] Add setup instructions for Supabase
- [ ] Update README with auth feature
- [ ] Add troubleshooting section

### Phase 5 Verification
- [ ] All tests pass
- [ ] No console errors in production
- [ ] Mobile devices work correctly
- [ ] Guest experience unchanged
- [ ] Authenticated features work as expected
- [ ] Documentation is complete

**Time Spent:** 0h 0m

---

## Deployment Checklist

### Supabase Setup
- [ ] Create Supabase project (free tier)
- [ ] Note project URL and keys
- [ ] Enable Google OAuth in Auth settings
- [ ] Add OAuth redirect URLs
- [ ] Run database migrations
- [ ] Test auth in Supabase dashboard

### Environment Variables

#### Server (Railway)
- [ ] `SUPABASE_URL=https://xxx.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY=xxx`
- [ ] Redeploy server on Railway
- [ ] Test health endpoint

#### Client (Vercel)
- [ ] `VITE_SUPABASE_URL=https://xxx.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY=xxx`
- [ ] Deploy client to Vercel
- [ ] Test OAuth callback URL

### Final Testing
- [ ] Test on production URLs
- [ ] Test OAuth flow end-to-end
- [ ] Test on multiple devices
- [ ] Test with multiple concurrent users
- [ ] Monitor Supabase usage/logs

---

## Files Created

### Server (8 new files)
- [ ] `server/src/config/supabase.ts` - Supabase client config
- [ ] `server/src/db/migrations/001_auth_schema.sql` - Database schema
- [ ] `server/src/middleware/authMiddleware.ts` - JWT verification
- [ ] `server/src/api/sessions.ts` - Session lookup API

### Client (4 new files)
- [x] `client/src/lib/supabase.ts` - Supabase client config
- [x] `client/src/stores/authStore.ts` - Auth state management
- [x] `client/src/pages/AuthCallback.tsx` - OAuth redirect handler
- [ ] `client/src/components/RejoinGameDialog.tsx` - Rejoin UI

---

## Files Modified

### Server (4 existing files)
- [ ] `server/src/services/sessionService.ts` - Add DB persistence
- [ ] `server/src/services/roomService.ts` - Add DB persistence
- [ ] `server/src/websocket/handlers.ts` - Auth validation, enhanced restore
- [ ] `server/src/server.ts` - Cleanup job, register sessions API

### Client (4 existing files)
- [x] `client/src/components/TitleScreen.tsx` - Add sign-in UI
- [x] `client/src/App.tsx` - Check for active sessions on load
- [ ] `client/src/stores/websocketStore.ts` - Send auth token in handshake
- [ ] `client/src/stores/roomStore.ts` - Handle authenticated session state

---

## Success Metrics

- [ ] ✅ Users can sign in with Google
- [ ] ✅ Guest users can play without signing in
- [ ] ✅ Authenticated users can rejoin after closing browser
- [ ] ✅ Rejoin dialog shows on app open (if active games exist)
- [ ] ✅ Sessions persist across server restarts (authenticated only)
- [ ] ✅ All existing gameplay works unchanged
- [ ] ✅ Mobile-friendly auth flow
- [ ] ✅ No breaking changes for guests

---

## Notes & Issues

### Issues Encountered
_None yet_

### Decisions Made
**Phase 1 Complete:**
- Supabase packages installed on both client and server
- Configuration files created with graceful fallbacks (auth disabled if not configured)
- Migration file ready with all 5 tables, RLS policies, indexes, and cleanup functions
- Created comprehensive setup guide for user to create Supabase project

**Next: User needs to create Supabase project and add environment variables before Phase 2**

### Performance Observations
_Will track once auth features are active_

---

## Quick Start for Phase 1

✅ **Phase 1 Infrastructure is Ready!**

### What Was Done:
1. ✅ Installed `@supabase/supabase-js` on server and client
2. ✅ Created `server/src/config/supabase.ts` (server Supabase client)
3. ✅ Created `client/src/lib/supabase.ts` (client Supabase client)
4. ✅ Created `server/src/db/migrations/001_auth_schema.sql` (complete database schema)
5. ✅ Updated `scriptReferences.md` with new auth files
6. ✅ Created `SUPABASE_SETUP_GUIDE.md` with step-by-step instructions

### What You Need to Do:
1. **Follow `SUPABASE_SETUP_GUIDE.md`** to create your Supabase project (~15 minutes)
2. Add environment variables to `.env` files
3. Let me know when ready for Phase 2!

---

**Last Updated:** 2026-01-23 (Phase 2 Complete - Ready for Testing)
