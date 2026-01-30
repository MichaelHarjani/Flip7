import { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { getKeyDisplayName } from '../../config/keyBindings';
import { useThemeStore } from '../../stores/themeStore';

type ButtonVariant = 'primary' | 'success' | 'danger' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  shortcut?: string;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border-blue-500',
  success: 'bg-green-600 hover:bg-green-500 active:bg-green-700 text-white border-green-500',
  danger: 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white border-red-500',
  secondary: 'bg-gray-600 hover:bg-gray-500 active:bg-gray-700 text-white border-gray-500',
  ghost: 'bg-transparent hover:bg-gray-700/50 active:bg-gray-700 text-gray-200 border-transparent',
};

// Vintage theme button styles
const vintageVariantStyles: Record<ButtonVariant, { bg: string; border: string; text: string; hover: string }> = {
  primary: { bg: '#4682b4', border: '#d4af37', text: '#f5f1e8', hover: '#5a9fd4' },
  success: { bg: '#2e8b57', border: '#d4af37', text: '#f5f1e8', hover: '#3ca06a' },
  danger: { bg: '#8b1a3d', border: '#d4af37', text: '#f5f1e8', hover: '#a62050' },
  secondary: { bg: '#8b4513', border: '#d4af37', text: '#f5f1e8', hover: '#a05520' },
  ghost: { bg: 'transparent', border: 'transparent', text: '#c19a6b', hover: 'rgba(139,69,19,0.3)' },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      shortcut,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const { theme } = useThemeStore();
    const isVintageTheme = theme === 'vintage-flip7';
    const isDisabled = disabled || loading;

    const vintageStyle = isVintageTheme ? vintageVariantStyles[variant] : null;

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        className={`
          relative
          inline-flex
          items-center
          justify-center
          gap-2
          font-bold
          rounded-lg
          border-2
          transition-all
          duration-150
          ${!isVintageTheme ? variantStyles[variant] : ''}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isVintageTheme ? 'font-display shadow-vintage' : ''}
          ${className}
        `}
        style={isVintageTheme && vintageStyle ? {
          backgroundColor: vintageStyle.bg,
          borderColor: vintageStyle.border,
          color: vintageStyle.text,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
        } : undefined}
        whileHover={isDisabled ? {} : { scale: 1.02 }}
        whileTap={isDisabled ? {} : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onMouseEnter={(e) => {
          if (!isDisabled && isVintageTheme && vintageStyle) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = vintageStyle.hover;
          }
        }}
        onMouseLeave={(e) => {
          if (!isDisabled && isVintageTheme && vintageStyle) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = vintageStyle.bg;
          }
        }}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        <span className={loading ? 'opacity-70' : ''}>{children}</span>
        {shortcut && !loading && (
          <span className={`absolute top-1 right-1.5 text-[10px] font-medium opacity-60 px-1.5 py-0.5 rounded border font-mono ${isVintageTheme ? 'bg-flip7-wood-dark/50 border-flip7-gold/30 text-flip7-gold' : 'bg-black/20 border-white/10'}`}>
            {getKeyDisplayName(shortcut)}
          </span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
