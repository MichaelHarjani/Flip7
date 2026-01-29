import { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  showChange?: boolean;
}

export default function AnimatedNumber({
  value,
  duration = 500,
  className = '',
  showChange = false,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [change, setChange] = useState<number | null>(null);
  const previousValue = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const diff = endValue - startValue;

    if (diff === 0) return;

    // Show the change indicator
    if (showChange && diff !== 0) {
      setChange(diff);
      setTimeout(() => setChange(null), 1500);
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentValue = Math.round(startValue + diff * easeOut);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, showChange]);

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <span className="tabular-nums">{displayValue}</span>
      {change !== null && (
        <span
          className={`
            absolute -right-6 top-0
            text-xs font-bold
            animate-bounce-soft
            ${change > 0 ? 'text-green-400' : 'text-red-400'}
          `}
        >
          {change > 0 ? `+${change}` : change}
        </span>
      )}
    </span>
  );
}
