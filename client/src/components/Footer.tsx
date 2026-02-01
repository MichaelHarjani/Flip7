// Version is updated with each release:
// - Patch (0.0.X): Small updates, bug fixes, minor UI tweaks
// - Minor (0.X.0): New features, significant improvements
// - Major (X.0.0): Major overhauls, breaking changes
const APP_VERSION = '1.1.0';

export default function Footer() {
  return (
    <footer className="absolute bottom-0 left-0 right-0 py-2 text-center">
      <span className="text-xs text-gray-500">v{APP_VERSION}</span>
    </footer>
  );
}
