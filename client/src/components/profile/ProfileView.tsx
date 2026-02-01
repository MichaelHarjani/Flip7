import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useStatsStore } from '../../stores/statsStore';
import Avatar from '../Avatar';
import { Trophy, Target, Zap, TrendingUp, Calendar } from 'lucide-react';

interface ProfileViewProps {
  userId?: string; // If not provided, shows current user's profile
  onClose?: () => void;
}

interface ProfileData {
  id: string;
  username: string;
  bio?: string;
  avatarId?: string;
  avatarUrl?: string;
  stats?: {
    gamesPlayed: number;
    gamesWon: number;
    highestScore: number;
    flip7Count: number;
    currentWinStreak: number;
    bestWinStreak: number;
  };
  createdAt?: string;
}

export default function ProfileView({ userId, onClose }: ProfileViewProps) {
  const { user, profile: currentUserProfile, isGuest } = useAuthStore();
  const { stats: currentUserStats } = useStatsStore();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = !userId || (user && userId === user.id);

  useEffect(() => {
    async function fetchProfile() {
      if (isOwnProfile) {
        // Use current user's profile data
        if (user && currentUserProfile) {
          setProfileData({
            id: user.id,
            username: currentUserProfile.username || user.user_metadata?.name || 'Player',
            bio: currentUserProfile.bio || undefined,
            avatarId: currentUserProfile.avatar_id || undefined,
            avatarUrl: currentUserProfile.avatar_url || user.user_metadata?.avatar_url,
            stats: currentUserStats ? {
              gamesPlayed: currentUserStats.gamesPlayed,
              gamesWon: currentUserStats.gamesWon,
              highestScore: currentUserStats.highestScore,
              flip7Count: currentUserStats.flip7Count,
              currentWinStreak: currentUserStats.currentWinStreak,
              bestWinStreak: currentUserStats.bestWinStreak,
            } : undefined,
            createdAt: currentUserProfile.created_at,
          });
        }
        setLoading(false);
        return;
      }

      // Fetch another user's profile
      try {
        const response = await fetch(`/api/profile/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        const data = await response.json();
        setProfileData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId, isOwnProfile, user, currentUserProfile, currentUserStats]);

  if (loading) {
    return (
      <div className="animate-pulse p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-700 rounded-full" />
          <div className="flex-1">
            <div className="h-6 bg-gray-700 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-700 rounded w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!profileData && isGuest) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400 mb-4">Sign in to view your profile and track your stats!</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Profile not found</p>
      </div>
    );
  }

  const winRate = profileData.stats && profileData.stats.gamesPlayed > 0
    ? Math.round((profileData.stats.gamesWon / profileData.stats.gamesPlayed) * 100)
    : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar
          name={profileData.username}
          size="lg"
          avatarId={profileData.avatarId}
          avatarUrl={profileData.avatarUrl}
          className="w-16 h-16 text-2xl"
        />
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{profileData.username}</h2>
          {profileData.bio && (
            <p className="text-gray-400 text-sm mt-1">{profileData.bio}</p>
          )}
          {profileData.createdAt && (
            <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
              <Calendar size={12} />
              Joined {new Date(profileData.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {profileData.stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Trophy className="text-yellow-400" size={20} />}
            label="Games Won"
            value={profileData.stats.gamesWon}
            subValue={`${winRate}% win rate`}
          />
          <StatCard
            icon={<Target className="text-blue-400" size={20} />}
            label="Games Played"
            value={profileData.stats.gamesPlayed}
          />
          <StatCard
            icon={<Zap className="text-green-400" size={20} />}
            label="Flip 7s"
            value={profileData.stats.flip7Count}
          />
          <StatCard
            icon={<TrendingUp className="text-purple-400" size={20} />}
            label="Best Streak"
            value={profileData.stats.bestWinStreak}
            subValue={profileData.stats.currentWinStreak > 0 ? `${profileData.stats.currentWinStreak} current` : undefined}
          />
        </div>
      )}

      {!profileData.stats && (
        <div className="text-center text-gray-400 py-4">
          <p>No stats available yet. Play some games!</p>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subValue?: string;
}

function StatCard({ icon, label, value, subValue }: StatCardProps) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subValue && (
        <div className="text-xs text-gray-500">{subValue}</div>
      )}
    </div>
  );
}
