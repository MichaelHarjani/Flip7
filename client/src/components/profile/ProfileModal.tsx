import { Modal } from '../ui';
import ProfileView from './ProfileView';

interface ProfileModalProps {
  userId?: string;
  username?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ userId, username, isOpen, onClose }: ProfileModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={username ? `${username}'s Profile` : 'My Profile'}
      size="md"
    >
      <ProfileView userId={userId} onClose={onClose} />
    </Modal>
  );
}
