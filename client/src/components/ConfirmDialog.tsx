interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'red' | 'blue' | 'green';
  onConfirm: () => void;
  onCancel: () => void;
}

const colorClasses = {
  red: 'bg-red-600 hover:bg-red-500',
  blue: 'bg-blue-600 hover:bg-blue-500',
  green: 'bg-green-600 hover:bg-green-500',
};

export default function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'red',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-scale-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl border-4 border-gray-600 max-w-sm w-full p-6 animate-scale-in">
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 ${colorClasses[confirmColor]} text-white rounded-lg font-bold transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
