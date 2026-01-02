import { useThemeStore, themeConfigs, type ThemeType } from '../stores/themeStore';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { theme, setTheme } = useThemeStore();

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
            <div className="grid grid-cols-1 gap-3">
              {(Object.keys(themeConfigs) as ThemeType[]).map((themeKey) => {
                const config = themeConfigs[themeKey];
                const isActive = theme === themeKey;
                
                return (
                  <button
                    key={themeKey}
                    onClick={() => setTheme(themeKey)}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all text-left
                      ${isActive 
                        ? 'border-blue-500 bg-blue-900/30 shadow-lg shadow-blue-500/20' 
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white mb-1">{config.name}</div>
                        <div className="flex gap-2 mt-2">
                          {/* Color preview */}
                          {themeKey === 'classic-casino' && (
                            <>
                              <div className="w-6 h-6 rounded-full bg-felt border-2 border-gold"></div>
                              <div className="w-6 h-6 rounded-full bg-gold border-2 border-gold-dark"></div>
                            </>
                          )}
                          {themeKey === 'cyberpunk-neon' && (
                            <>
                              <div className="w-6 h-6 rounded-full bg-neon-blue border-2 border-neon-pink"></div>
                              <div className="w-6 h-6 rounded-full bg-neon-purple border-2 border-neon-green"></div>
                            </>
                          )}
                          {themeKey === 'minimalist' && (
                            <>
                              <div className="w-6 h-6 rounded-full bg-minimal-light border-2 border-minimal-dark"></div>
                              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-gray-600"></div>
                            </>
                          )}
                          {themeKey === 'dark-luxury' && (
                            <>
                              <div className="w-6 h-6 rounded-full bg-gray-800 border-2 border-purple-600"></div>
                              <div className="w-6 h-6 rounded-full bg-purple-600 border-2 border-blue-600"></div>
                            </>
                          )}
                        </div>
                      </div>
                      {isActive && (
                        <div className="text-blue-400 text-2xl">✓</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
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

