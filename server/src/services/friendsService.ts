import { supabase, isSupabaseAvailable } from '../config/supabase.js';

export interface Friend {
  id: string;
  friendUserId: string;
  friendUsername: string;
  friendAvatarUrl?: string;
  friendAvatarId?: string;
  isOnline: boolean;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatarUrl?: string;
  fromAvatarId?: string;
  createdAt: Date;
}

class FriendsService {
  /**
   * Get list of accepted friends for a user
   */
  async getFriends(userId: string): Promise<Friend[]> {
    if (!isSupabaseAvailable() || !supabase) {
      return [];
    }

    // Get friends where user is either user_id or friend_user_id
    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_user_id,
        status,
        created_at,
        user_profiles!friends_friend_user_id_fkey (
          id,
          username,
          avatar_url,
          avatar_id,
          is_online
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) {
      console.error('[FriendsService] Error fetching friends:', error);
      return [];
    }

    // Also get friends where user is the friend_user_id
    const { data: data2, error: error2 } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_user_id,
        status,
        created_at,
        user_profiles!friends_user_id_fkey (
          id,
          username,
          avatar_url,
          avatar_id,
          is_online
        )
      `)
      .eq('friend_user_id', userId)
      .eq('status', 'accepted');

    if (error2) {
      console.error('[FriendsService] Error fetching friends (reverse):', error2);
    }

    const friends: Friend[] = [];

    // Process first query results
    if (data) {
      for (const row of data) {
        const profile = row.user_profiles as any;
        if (profile) {
          friends.push({
            id: row.id,
            friendUserId: row.friend_user_id,
            friendUsername: profile.username,
            friendAvatarUrl: profile.avatar_url,
            friendAvatarId: profile.avatar_id,
            isOnline: profile.is_online || false,
            status: row.status as 'accepted',
            createdAt: new Date(row.created_at),
          });
        }
      }
    }

    // Process second query results
    if (data2) {
      for (const row of data2) {
        const profile = row.user_profiles as any;
        if (profile) {
          friends.push({
            id: row.id,
            friendUserId: row.user_id,
            friendUsername: profile.username,
            friendAvatarUrl: profile.avatar_url,
            friendAvatarId: profile.avatar_id,
            isOnline: profile.is_online || false,
            status: row.status as 'accepted',
            createdAt: new Date(row.created_at),
          });
        }
      }
    }

    return friends;
  }

  /**
   * Get pending friend requests for a user (requests they've received)
   */
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    if (!isSupabaseAvailable() || !supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        created_at,
        user_profiles!friends_user_id_fkey (
          id,
          username,
          avatar_url,
          avatar_id
        )
      `)
      .eq('friend_user_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('[FriendsService] Error fetching requests:', error);
      return [];
    }

    return (data || []).map(row => {
      const profile = row.user_profiles as any;
      return {
        id: row.id,
        fromUserId: row.user_id,
        fromUsername: profile?.username || 'Unknown',
        fromAvatarUrl: profile?.avatar_url,
        fromAvatarId: profile?.avatar_id,
        createdAt: new Date(row.created_at),
      };
    });
  }

  /**
   * Send a friend request
   */
  async sendRequest(fromUserId: string, toUserId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseAvailable() || !supabase) {
      return { success: false, error: 'Database not available' };
    }

    if (fromUserId === toUserId) {
      return { success: false, error: 'Cannot send friend request to yourself' };
    }

    // Check if a relationship already exists
    const { data: existing } = await supabase
      .from('friends')
      .select('id, status')
      .or(`and(user_id.eq.${fromUserId},friend_user_id.eq.${toUserId}),and(user_id.eq.${toUserId},friend_user_id.eq.${fromUserId})`)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return { success: false, error: 'Already friends' };
      }
      if (existing.status === 'pending') {
        return { success: false, error: 'Friend request already pending' };
      }
      if (existing.status === 'blocked') {
        return { success: false, error: 'Cannot send request' };
      }
    }

    // Create friend request
    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: fromUserId,
        friend_user_id: toUserId,
        status: 'pending',
      });

    if (error) {
      console.error('[FriendsService] Error sending request:', error);
      return { success: false, error: 'Failed to send request' };
    }

    return { success: true };
  }

  /**
   * Accept a friend request
   */
  async acceptRequest(requestId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseAvailable() || !supabase) {
      return { success: false, error: 'Database not available' };
    }

    // Verify the request exists and is for this user
    const { data: request, error: fetchError } = await supabase
      .from('friends')
      .select('*')
      .eq('id', requestId)
      .eq('friend_user_id', userId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Request not found' };
    }

    // Update to accepted
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) {
      console.error('[FriendsService] Error accepting request:', error);
      return { success: false, error: 'Failed to accept request' };
    }

    return { success: true };
  }

  /**
   * Decline or remove a friend
   */
  async removeFriend(friendshipId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseAvailable() || !supabase) {
      return { success: false, error: 'Database not available' };
    }

    // Verify the friendship exists and involves this user
    const { data: friendship, error: fetchError } = await supabase
      .from('friends')
      .select('*')
      .eq('id', friendshipId)
      .or(`user_id.eq.${userId},friend_user_id.eq.${userId}`)
      .single();

    if (fetchError || !friendship) {
      return { success: false, error: 'Friendship not found' };
    }

    // Delete the friendship
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      console.error('[FriendsService] Error removing friend:', error);
      return { success: false, error: 'Failed to remove friend' };
    }

    return { success: true };
  }

  /**
   * Update user online status
   */
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    if (!isSupabaseAvailable() || !supabase) {
      return;
    }

    await supabase
      .from('user_profiles')
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  /**
   * Search users by username
   */
  async searchUsers(query: string, excludeUserId?: string): Promise<Array<{
    id: string;
    username: string;
    avatarUrl?: string;
    avatarId?: string;
  }>> {
    if (!isSupabaseAvailable() || !supabase) {
      return [];
    }

    let queryBuilder = supabase
      .from('user_profiles')
      .select('id, username, avatar_url, avatar_id')
      .ilike('username', `%${query}%`)
      .limit(10);

    if (excludeUserId) {
      queryBuilder = queryBuilder.neq('id', excludeUserId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('[FriendsService] Error searching users:', error);
      return [];
    }

    return (data || []).map(user => ({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
      avatarId: user.avatar_id,
    }));
  }
}

export const friendsService = new FriendsService();
