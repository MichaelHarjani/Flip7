import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface Friend {
  id: string;
  friendUserId: string;
  friendUsername: string;
  friendAvatarUrl?: string;
  friendAvatarId?: string;
  isOnline: boolean;
  status: 'accepted';
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

export interface SearchUser {
  id: string;
  username: string;
  avatarUrl?: string;
  avatarId?: string;
}

interface FriendsStore {
  friends: Friend[];
  requests: FriendRequest[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<SearchUser[]>;
  sendRequest: (userId: string) => Promise<{ success: boolean; error?: string }>;
  acceptRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  declineRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  removeFriend: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

const getApiUrl = () => import.meta.env.VITE_WS_URL || 'http://localhost:5001';

export const useFriendsStore = create<FriendsStore>((set, get) => ({
  friends: [],
  requests: [],
  loading: false,
  error: null,

  fetchFriends: async () => {
    const { session } = useAuthStore.getState();
    if (!session?.access_token) return;

    set({ loading: true, error: null });

    try {
      const response = await fetch(`${getApiUrl()}/api/friends`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch friends');
      }

      const data = await response.json();
      set({
        friends: (data.friends || []).map((f: any) => ({
          ...f,
          createdAt: new Date(f.createdAt),
        })),
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch friends',
        loading: false,
      });
    }
  },

  fetchRequests: async () => {
    const { session } = useAuthStore.getState();
    if (!session?.access_token) return;

    try {
      const response = await fetch(`${getApiUrl()}/api/friends/requests`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      set({
        requests: (data.requests || []).map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
        })),
      });
    } catch (error) {
      console.error('[FriendsStore] Error fetching requests:', error);
    }
  },

  searchUsers: async (query: string) => {
    const { session } = useAuthStore.getState();
    if (!session?.access_token) return [];

    try {
      const response = await fetch(`${getApiUrl()}/api/friends/search?username=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('[FriendsStore] Error searching users:', error);
      return [];
    }
  },

  sendRequest: async (userId: string) => {
    const { session } = useAuthStore.getState();
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/friends/request/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to send request' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to send request' };
    }
  },

  acceptRequest: async (requestId: string) => {
    const { session } = useAuthStore.getState();
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/friends/accept/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to accept request' };
      }

      // Refresh friends and requests
      await get().fetchFriends();
      await get().fetchRequests();

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to accept request' };
    }
  },

  declineRequest: async (requestId: string) => {
    const { session } = useAuthStore.getState();
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/friends/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to decline request' };
      }

      // Refresh requests
      await get().fetchRequests();

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to decline request' };
    }
  },

  removeFriend: async (friendshipId: string) => {
    const { session } = useAuthStore.getState();
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to remove friend' };
      }

      // Refresh friends
      await get().fetchFriends();

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to remove friend' };
    }
  },

  clearError: () => set({ error: null }),
}));
