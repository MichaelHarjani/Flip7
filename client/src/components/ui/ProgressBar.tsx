import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  showPercentage?: boolean;
  showValue?: boolean;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  milestones?: number[];
  className?: string;
}

const colorStyles: Record<string, { bar: string; glow: string }> = {
  blue: {
    bar: 'from-blue-600 to-blue-400',
    glow: 'shadow-blue-500/50',
  },
  green: {
    bar: 'from-green-600 to-green-400',
    glow: 'shadow-green-500/50',
  },
  yellow: {
    bar: 'from-yellow-500 to-amber-400',
    glow: 'shadow-yellow-500/50',
  },
  purple: {
    bar: 'from-purple-600 to-purple-400',
    glow: 'shadow-purple-500/50',
  },
  red: {
    bar: 'from-red-600 to-red-400',
    glow: 'shadow-red-500/50',
  },
};

const sizeStyles: Record<string, { height: string; text: string }> = {
  sm: { height: 'h-2', text: 'text-xs' },
  md: { height: 'h-3', text: 'text-sm' },
  lg: { height: 'h-4', text: 'text-base' },
};

export default function ProgressBar({
  current,
  target,
  label,
  color = 'blue',
  showPercentage = false,
  showValue = true,
  animated = true,
  size = 'md',
  milestones = [100, 150, 200],
  className = '',
}: ProgressBarProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const previousValue = useRef(current);

  const percentage = Math.min((current / target) * 100, 100);
  const styles = colorStyles[color];
  const sizeStyle = sizeStyles[size];

  // Trigger pulse animation on value increase
  useEffect(() => {
    if (animated && current > previousValue.current) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 500);
      previousValue.current = current;
      return () => clearTimeout(timer);
    }
    previousValue.current = current;
  }, [current, animated]);

  return (
    <div className={`w-full ${className}`}>
      {/* Label and value row */}
      {(label || showValue || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className={`font-medium text-gray-300 ${sizeStyle.text}`}>
              {label}
            </span>
          )}
          <div className="flex items-center gap-2">
            {showValue && (
              <AnimatePresence mode="wait">
                <motion.span
                  key={current}
                  initial={animated ? { scale: 1.2, color: '#fbbf24' } : false}
                  animate={{ scale: 1, color: '#ffffff' }}
                  transition={{ duration: 0.3 }}
                  className={`font-bold text-white ${sizeStyle.text}`}
                >
                  {current}
                </motion.span>
              </AnimatePresence>
            )}
            {showValue && <span className={`text-gray-500 ${sizeStyle.text}`}>/ {target}</span>}
            {showPercentage && (
              <span className={`text-gray-400 ${sizeStyle.text}`}>
                ({Math.round(percentage)}%)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar container */}
      <div className={`relative w-full bg-gray-700 rounded-full ${sizeStyle.height} overflow-hidden`}>
        {/* Milestone markers */}
        {milestones.map((milestone) => {
          const milestonePercent = (milestone / target) * 100;
          if (milestonePercent > 100) return null;
          return (
            <div
              key={milestone}
              className="absolute top-0 bottom-0 w-0.5 bg-gray-500/50 z-10"
              style={{ left: `${milestonePercent}%` }}
              title={`${milestone}`}
            />
          );
        })}

        {/* Progress fill */}
        <motion.div
          className={`
            absolute
            top-0
            left-0
            ${sizeStyle.height}
            bg-gradient-to-r
            ${styles.bar}
            rounded-full
            ${isPulsing ? `shadow-lg ${styles.glow}` : ''}
          `}
          initial={{ width: 0 }}
          animate={{
            width: `${percentage}%`,
            scale: isPulsing ? [1, 1.02, 1] : 1,
          }}
          transition={{
            width: { type: 'spring', stiffness: 100, damping: 20 },
            scale: { duration: 0.3 },
          }}
        />

        {/* Shine effect */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Milestone labels (optional, shown below bar) */}
      {size !== 'sm' && milestones.length > 0 && (
        <div className="relative mt-0.5">
          {milestones.map((milestone) => {
            const milestonePercent = (milestone / target) * 100;
            if (milestonePercent > 100) return null;
            return (
              <span
                key={milestone}
                className={`absolute text-[10px] text-gray-500 transform -translate-x-1/2`}
                style={{ left: `${milestonePercent}%` }}
              >
                {milestone}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
