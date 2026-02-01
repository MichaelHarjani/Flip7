import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { PREDEFINED_AVATARS, type PredefinedAvatar } from '../../utils/avatars';
import Avatar from '../Avatar';
import { Button } from '../ui';
import { Check } from 'lucide-react';

interface ProfileSettingsProps {
  onClose: () => void;
  onSave?: () => void;
}

export default function ProfileSettings({ onClose, onSave }: ProfileSettingsProps) {
  const { user, profile, isGuest, updateProfile } = useAuthStore();
  const [username, setUsername] = useState(profile?.username || user?.user_metadata?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | undefined>(profile?.avatar_id || undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isGuest) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400 mb-4">Sign in to customize your profile!</p>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await updateProfile({
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar_id: selectedAvatarId,
      });

      onSave?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const avatarsByCategory: Record<PredefinedAvatar['category'], PredefinedAvatar[]> = {
    suits: PREDEFINED_AVATARS.filter(a => a.category === 'suits'),
    numbers: PREDEFINED_AVATARS.filter(a => a.category === 'numbers'),
    special: PREDEFINED_AVATARS.filter(a => a.category === 'special'),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Preview */}
      <div className="flex items-center justify-center gap-4">
        <Avatar
          name={username || 'Player'}
          size="lg"
          avatarId={selectedAvatarId}
          avatarUrl={!selectedAvatarId ? (profile?.avatar_url || user?.user_metadata?.avatar_url) : undefined}
          className="w-20 h-20 text-3xl"
        />
        <div className="text-left">
          <div className="text-lg font-bold text-white">{username || 'Player'}</div>
          {bio && <div className="text-sm text-gray-400">{bio}</div>}
        </div>
      </div>

      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Display Name
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
          className="w-full px-4 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          placeholder="Enter your name"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Bio (optional)
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={100}
          rows={2}
          className="w-full px-4 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
          placeholder="Tell us about yourself..."
        />
        <div className="text-xs text-gray-500 mt-1 text-right">{bio.length}/100</div>
      </div>

      {/* Avatar Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Avatar
        </label>

        {/* Use Google avatar option */}
        {(profile?.avatar_url || user?.user_metadata?.avatar_url) && (
          <div className="mb-4">
            <button
              onClick={() => setSelectedAvatarId(undefined)}
              className={`relative p-2 rounded-lg border-2 transition-all ${
                !selectedAvatarId
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <Avatar
                name={username}
                avatarUrl={profile?.avatar_url || user?.user_metadata?.avatar_url}
                size="md"
                className="w-10 h-10"
              />
              {!selectedAvatarId && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </button>
            <span className="text-xs text-gray-400 ml-2">Google Photo</span>
          </div>
        )}

        {/* Predefined Avatars */}
        {Object.entries(avatarsByCategory).map(([category, avatars]) => (
          <div key={category} className="mb-3">
            <div className="text-xs text-gray-500 mb-2 capitalize">{category}</div>
            <div className="flex flex-wrap gap-2">
              {avatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedAvatarId(avatar.id)}
                  className={`relative p-2 rounded-lg border-2 transition-all ${
                    selectedAvatarId === avatar.id
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  title={avatar.name}
                >
                  <Avatar
                    name={avatar.name}
                    avatarId={avatar.id}
                    size="md"
                    className="w-10 h-10"
                  />
                  {selectedAvatarId === avatar.id && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-900 border border-red-600 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} fullWidth>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} loading={saving} fullWidth>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
