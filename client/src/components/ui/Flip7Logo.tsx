import { useThemeStore } from '../../stores/themeStore';

interface Flip7LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export default function Flip7Logo({ size = 'md', showTagline = false }: Flip7LogoProps) {
  const { theme } = useThemeStore();
  const isVintageTheme = theme === 'vintage-flip7';

  const sizeClasses = {
    xs: 'text-lg',
    sm: 'text-xl sm:text-2xl',
    md: 'text-3xl sm:text-4xl',
    lg: 'text-5xl sm:text-6xl',
  };

  const underlineHeight = {
    xs: 'h-0.5',
    sm: 'h-0.5 sm:h-1',
    md: 'h-1',
    lg: 'h-1.5',
  };

  if (isVintageTheme) {
    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* Main logo text with vintage styling */}
          <div
            className={`${sizeClasses[size]} font-display font-bold relative tracking-wider`}
            style={{
              color: '#f5f1e8',
              textShadow: `
                2px 2px 0px #8b4513,
                3px 3px 0px #d4af37,
                4px 4px 8px rgba(0,0,0,0.5)
              `,
            }}
          >
            <span className="relative">
              FLIP
              {/* Lucky 7 with special styling */}
              <span
                className="ml-1 sm:ml-2"
                style={{
                  color: '#d4af37',
                  textShadow: `
                    2px 2px 0px #8b4513,
                    3px 3px 0px #cd853f,
                    4px 4px 8px rgba(0,0,0,0.5),
                    0 0 20px rgba(212,175,55,0.5)
                  `,
                }}
              >
                7
              </span>
            </span>
          </div>

          {/* Decorative underline */}
          <div
            className={`${underlineHeight[size]} mt-0.5 sm:mt-1 rounded-full`}
            style={{
              background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
              boxShadow: '0 2px 4px rgba(212,175,55,0.5)',
            }}
          />
        </div>

        {/* Optional tagline */}
        {showTagline && (
          <div
            className="text-[10px] sm:text-xs tracking-widest uppercase mt-1 font-card"
            style={{
              color: '#c19a6b',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            Press Your Luck
          </div>
        )}
      </div>
    );
  }

  // Default styling for non-vintage themes
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className={`${sizeClasses[size]} font-bold tracking-wider text-white`}>
          <span>FLIP</span>
          <span className="ml-1 sm:ml-2 text-yellow-400">7</span>
        </div>
        <div
          className={`${underlineHeight[size]} mt-0.5 sm:mt-1 rounded-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent`}
        />
      </div>
      {showTagline && (
        <div className="text-[10px] sm:text-xs tracking-widest uppercase mt-1 text-gray-400">
          Press Your Luck
        </div>
      )}
    </div>
  );
}
