import { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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
    const isDisabled = disabled || loading;

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
          transition-colors
          duration-150
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        whileHover={isDisabled ? {} : { scale: 1.02 }}
        whileTap={isDisabled ? {} : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        <span className={loading ? 'opacity-70' : ''}>{children}</span>
        {shortcut && !loading && (
          <span className="absolute top-1 right-1.5 text-[10px] font-medium opacity-60 bg-black/20 px-1 rounded">
            {shortcut}
          </span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
