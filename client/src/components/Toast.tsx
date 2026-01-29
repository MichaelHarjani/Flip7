import { useToastStore, type ToastType } from '../stores/toastStore';

const typeStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-green-900/95',
    border: 'border-green-500',
    icon: '✓',
  },
  error: {
    bg: 'bg-red-900/95',
    border: 'border-red-500',
    icon: '✕',
  },
  warning: {
    bg: 'bg-yellow-900/95',
    border: 'border-yellow-500',
    icon: '⚠',
  },
  info: {
    bg: 'bg-blue-900/95',
    border: 'border-blue-500',
    icon: 'ℹ',
  },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const style = typeStyles[toast.type];
        return (
          <div
            key={toast.id}
            className={`
              ${style.bg} ${style.border}
              border-2 rounded-lg px-4 py-3 shadow-lg
              flex items-start gap-3
              animate-slide-in pointer-events-auto
              backdrop-blur-sm
            `}
          >
            <span className="text-lg flex-shrink-0">{style.icon}</span>
            <p className="text-white text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
