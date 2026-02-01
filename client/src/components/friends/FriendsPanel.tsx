import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useFriendsStore } from '../../stores/friendsStore';
import { Modal } from '../ui';
import FriendsList from './FriendsList';
import FriendRequests from './FriendRequests';
import FriendSearch from './FriendSearch';
import { Users, Bell, Search, X } from 'lucide-react';

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite?: (friendUserId: string) => void;
}

type Tab = 'friends' | 'requests' | 'search';

export default function FriendsPanel({ isOpen, onClose, onInvite }: FriendsPanelProps) {
  const { isGuest } = useAuthStore();
  const { friends, requests, fetchFriends, fetchRequests } = useFriendsStore();
  const [activeTab, setActiveTab] = useState<Tab>('friends');

  // Fetch friends and requests when panel opens
  useEffect(() => {
    if (isOpen && !isGuest) {
      fetchFriends();
      fetchRequests();
    }
  }, [isOpen, isGuest, fetchFriends, fetchRequests]);

  if (isGuest) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Friends" size="md">
        <div className="p-6 text-center">
          <Users size={48} className="mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Sign in to add friends
          </h3>
          <p className="text-gray-400 text-sm">
            Create an account to build your friends list, invite them to games,
            and see when they're online!
          </p>
        </div>
      </Modal>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'friends', label: 'Friends', icon: <Users size={16} />, badge: friends.filter(f => f.isOnline).length || undefined },
    { id: 'requests', label: 'Requests', icon: <Bell size={16} />, badge: requests.length || undefined },
    { id: 'search', label: 'Search', icon: <Search size={16} /> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Friends" size="md">
      <div className="flex flex-col h-[500px] max-h-[70vh]">
        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-1">
          {activeTab === 'friends' && <FriendsList onInvite={onInvite} />}
          {activeTab === 'requests' && <FriendRequests />}
          {activeTab === 'search' && <FriendSearch />}
        </div>
      </div>
    </Modal>
  );
}
