import { Modal, Button } from './ui';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'red' | 'blue' | 'green';
  onConfirm: () => void;
  onCancel: () => void;
}

const variantMap = {
  red: 'danger' as const,
  blue: 'primary' as const,
  green: 'success' as const,
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
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={title}
      size="sm"
      showCloseButton={false}
    >
      <p className="text-gray-300 mb-6">{message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} fullWidth>
          {cancelText}
        </Button>
        <Button variant={variantMap[confirmColor]} onClick={onConfirm} fullWidth>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
