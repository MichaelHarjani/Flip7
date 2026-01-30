import { useState } from 'react';
import { useThemeStore, themeConfigs, type ThemeType } from '../stores/themeStore';
import { getSoundEnabled, setSoundEnabled, playSound } from '../utils/sounds';
import { Modal, Button } from './ui';
import KeyBindingSettings from './settings/KeyBindingSettings';
import { Volume2, Palette, Zap, Keyboard } from 'lucide-react';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { theme, reduceMotion, setTheme, setReduceMotion } = useThemeStore();
  const [soundEnabled, setSoundEnabledState] = useState(getSoundEnabled());
  const isVintageTheme = theme === 'vintage-flip7';

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setSoundEnabledState(enabled);
    if (enabled) {
      playSound('click');
    }
  };

  const sectionHeaderClass = isVintageTheme
    ? 'text-flip7-wood-dark font-display'
    : 'text-white';

  const labelClass = isVintageTheme
    ? 'text-flip7-wood-dark'
    : 'text-white';

  const sublabelClass = isVintageTheme
    ? 'text-flip7-wood-medium'
    : 'text-gray-400';

  const iconClass = isVintageTheme
    ? 'text-flip7-border'
    : 'text-gray-400';

  return (
    <Modal isOpen={true} onClose={onClose} title="Settings" size="md">
      <div className="space-y-6">
        {/* Theme Selection */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={20} className={iconClass} />
            <h3 className={`text-lg font-semibold ${sectionHeaderClass}`}>Theme</h3>
          </div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeType)}
            className={`w-full px-4 py-2.5 rounded-lg font-semibold focus:outline-none cursor-pointer ${
              isVintageTheme
                ? 'bg-flip7-card-base border-2 border-flip7-border text-flip7-wood-dark focus:border-flip7-gold'
                : 'bg-gray-700 border-2 border-gray-600 text-white focus:border-blue-500'
            }`}
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

        {/* Sound Effects */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Volume2 size={20} className={iconClass} />
            <h3 className={`text-lg font-semibold ${sectionHeaderClass}`}>Audio</h3>
          </div>
          <label
            className={`flex items-center justify-between cursor-pointer p-3 rounded-lg ${
              isVintageTheme ? 'bg-flip7-vintage/10' : 'bg-gray-700/50'
            }`}
          >
            <div>
              <div className={`font-semibold ${labelClass}`}>Sound Effects</div>
              <p className={`text-sm ${sublabelClass}`}>Play sounds for game actions</p>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => handleSoundToggle(e.target.checked)}
              className={`w-6 h-6 rounded cursor-pointer ${
                isVintageTheme
                  ? 'border-2 border-flip7-border bg-flip7-card-base text-flip7-gold focus:ring-flip7-gold'
                  : 'border-2 border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500'
              }`}
            />
          </label>
        </div>

        {/* Visual Settings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={20} className={iconClass} />
            <h3 className={`text-lg font-semibold ${sectionHeaderClass}`}>Visual</h3>
          </div>
          <label
            className={`flex items-center justify-between cursor-pointer p-3 rounded-lg ${
              isVintageTheme ? 'bg-flip7-vintage/10' : 'bg-gray-700/50'
            }`}
          >
            <div>
              <div className={`font-semibold ${labelClass}`}>Reduce Motion</div>
              <p className={`text-sm ${sublabelClass}`}>Disable animations and transitions</p>
            </div>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className={`w-6 h-6 rounded cursor-pointer ${
                isVintageTheme
                  ? 'border-2 border-flip7-border bg-flip7-card-base text-flip7-gold focus:ring-flip7-gold'
                  : 'border-2 border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500'
              }`}
            />
          </label>
        </div>

        {/* Keyboard Shortcuts */}
        <div className={`border-t pt-6 ${isVintageTheme ? 'border-flip7-border' : 'border-gray-600'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Keyboard size={20} className={iconClass} />
            <h3 className={`text-lg font-semibold ${sectionHeaderClass}`}>Keyboard Shortcuts</h3>
          </div>
          <KeyBindingSettings />
        </div>
      </div>

      <div className={`mt-6 pt-6 border-t ${isVintageTheme ? 'border-flip7-border' : 'border-gray-600'}`}>
        <Button variant="primary" fullWidth onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

