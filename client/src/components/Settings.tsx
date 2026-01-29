import { useState, useEffect } from 'react';
import { useThemeStore, themeConfigs, type ThemeType } from '../stores/themeStore';
import { getSoundEnabled, setSoundEnabled, playSound } from '../utils/sounds';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { theme, reduceMotion, setTheme, setReduceMotion } = useThemeStore();
  const [soundEnabled, setSoundEnabledState] = useState(getSoundEnabled());

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setSoundEnabledState(enabled);
    if (enabled) {
      playSound('click');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-scale-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl border-4 border-gray-600 max-w-md w-full p-6 animate-scale-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Theme</h3>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeType)}
              className="w-full px-4 py-2.5 bg-gray-700 border-2 border-gray-600 rounded-lg text-white font-semibold focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              {(Object.keys(themeConfigs) as ThemeType[]).map((themeKey) => {
                const config = themeConfigs[themeKey];
                return (
                  <option key={themeKey} value={themeKey}>
                    {config.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Sound Effects</h3>
                <p className="text-sm text-gray-400">Play sounds for game actions</p>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => handleSoundToggle(e.target.checked)}
                className="w-6 h-6 rounded border-2 border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
              />
            </label>
          </div>

          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Reduce Motion</h3>
                <p className="text-sm text-gray-400">Disable animations and transitions</p>
              </div>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
                className="w-6 h-6 rounded border-2 border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-600">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

