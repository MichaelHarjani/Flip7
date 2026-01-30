import { KEY_BINDING_PROFILES, PROFILE_LABELS, getKeyDisplayName, KeyBindingProfile, getStoredProfile, setStoredProfile } from '../../config/keyBindings';
import { useState } from 'react';

interface KeyBindingSettingsProps {
  onProfileChange?: (profile: KeyBindingProfile) => void;
}

export default function KeyBindingSettings({ onProfileChange }: KeyBindingSettingsProps) {
  const [selectedProfile, setSelectedProfile] = useState<KeyBindingProfile>(getStoredProfile());

  const handleProfileChange = (profile: KeyBindingProfile) => {
    setSelectedProfile(profile);
    setStoredProfile(profile);
    onProfileChange?.(profile);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Keyboard Shortcuts</h3>
        <p className="text-sm text-gray-400 mb-4">
          Choose your preferred control scheme based on your play style
        </p>
      </div>

      {/* Single Player Profiles */}
      <div>
        <h4 className="text-base font-semibold mb-3 text-gray-300">Single Player Controls</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['leftHand', 'rightHand'] as KeyBindingProfile[]).map((profile) => {
            const bindings = KEY_BINDING_PROFILES[profile];
            const isSelected = selectedProfile === profile;
            return (
              <button
                key={profile}
                onClick={() => handleProfileChange(profile)}
                className={`bg-gray-800 p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h5 className={`font-semibold ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>
                    {PROFILE_LABELS[profile]}
                  </h5>
                  {isSelected && (
                    <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white">Active</span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Hit:</span>
                    <kbd className="px-3 py-1.5 bg-gray-700 rounded font-mono text-sm border border-gray-600 text-white">
                      {getKeyDisplayName(bindings.hit)}
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Stay:</span>
                    <kbd className="px-3 py-1.5 bg-gray-700 rounded font-mono text-sm border border-gray-600 text-white">
                      {getKeyDisplayName(bindings.stay)}
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Next Round:</span>
                    <kbd className="px-3 py-1.5 bg-gray-700 rounded font-mono text-sm border border-gray-600 text-white">
                      {getKeyDisplayName(bindings.nextRound)}
                    </kbd>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Local Multiplayer Profiles */}
      <div>
        <h4 className="text-base font-semibold mb-3 text-gray-300">Local Multiplayer Controls</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['multiP1', 'multiP2'] as KeyBindingProfile[]).map((profile) => {
            const bindings = KEY_BINDING_PROFILES[profile];
            return (
              <div key={profile} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h5 className="font-semibold mb-3 text-green-400">{PROFILE_LABELS[profile]}</h5>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Hit:</span>
                    <kbd className="px-3 py-1.5 bg-gray-700 rounded font-mono text-sm border border-gray-600 text-white">
                      {getKeyDisplayName(bindings.hit)}
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Stay:</span>
                    <kbd className="px-3 py-1.5 bg-gray-700 rounded font-mono text-sm border border-gray-600 text-white">
                      {getKeyDisplayName(bindings.stay)}
                    </kbd>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-gray-400 mt-3 text-center">
          Both players use <kbd className="px-2 py-1 bg-gray-700 rounded font-mono text-xs border border-gray-600">Enter</kbd> for Next Round
        </p>
      </div>

      <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
        <h5 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
          <span>💡</span>
          Pro Tips
        </h5>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Left hand controls let you play while using mouse with right hand</li>
          <li>• Right hand controls are perfect for laptop trackpad users</li>
          <li>• Local multiplayer uses home row keys for comfortable 2-player gaming</li>
        </ul>
      </div>
    </div>
  );
}
