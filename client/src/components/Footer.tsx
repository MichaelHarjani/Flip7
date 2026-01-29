interface FooterProps {
  onShowTutorial?: () => void;
}

export default function Footer({ onShowTutorial }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="flex-shrink-0 border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-300">Flip 7</span>
            <span className="hidden sm:inline">|</span>
            <span>Press your luck card game</span>
          </div>

          <div className="flex items-center gap-4">
            {onShowTutorial && (
              <button
                onClick={onShowTutorial}
                className="hover:text-white transition-colors"
              >
                How to Play
              </button>
            )}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <span className="text-gray-500">
              v1.0.0
            </span>
          </div>

          <div className="text-gray-500">
            &copy; {currentYear}
          </div>
        </div>
      </div>
    </footer>
  );
}
