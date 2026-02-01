import { Router } from 'express';
import { friendsService } from '../services/friendsService.js';
import { requireAuth, type AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * GET /api/friends - Get list of friends
 */
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const friends = await friendsService.getFriends(req.user!.id);
    res.json({ friends });
  } catch (error) {
    console.error('[Friends API] Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

/**
 * GET /api/friends/requests - Get pending friend requests
 */
router.get('/requests', requireAuth, async (req: AuthRequest, res) => {
  try {
    const requests = await friendsService.getPendingRequests(req.user!.id);
    res.json({ requests });
  } catch (error) {
    console.error('[Friends API] Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/**
 * GET /api/friends/search?username=xxx - Search users by username
 */
router.get('/search', requireAuth, async (req: AuthRequest, res) => {
  const { username } = req.query;

  if (!username || typeof username !== 'string' || username.length < 2) {
    return res.status(400).json({ error: 'Username query must be at least 2 characters' });
  }

  try {
    const users = await friendsService.searchUsers(username, req.user!.id);
    res.json({ users });
  } catch (error) {
    console.error('[Friends API] Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * POST /api/friends/request/:userId - Send friend request
 */
router.post('/request/:userId', requireAuth, async (req: AuthRequest, res) => {
  const { userId } = req.params;

  try {
    const result = await friendsService.sendRequest(req.user!.id, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Friend request sent' });
  } catch (error) {
    console.error('[Friends API] Error sending request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * POST /api/friends/accept/:requestId - Accept friend request
 */
router.post('/accept/:requestId', requireAuth, async (req: AuthRequest, res) => {
  const { requestId } = req.params;

  try {
    const result = await friendsService.acceptRequest(requestId, req.user!.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Friend request accepted' });
  } catch (error) {
    console.error('[Friends API] Error accepting request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

/**
 * DELETE /api/friends/:friendId - Remove friend or decline request
 */
router.delete('/:friendId', requireAuth, async (req: AuthRequest, res) => {
  const { friendId } = req.params;

  try {
    const result = await friendsService.removeFriend(friendId, req.user!.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    console.error('[Friends API] Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

export default router;
