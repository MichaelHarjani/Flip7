interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export default function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const baseClasses = 'bg-gray-700 animate-pulse rounded';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'circular' ? '40px' : variant === 'text' ? '16px' : '100px'),
  };

  const elements = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  ));

  if (count === 1) {
    return elements[0];
  }

  return <div className="space-y-2">{elements}</div>;
}

// Pre-built skeleton patterns
export function CardSkeleton() {
  return (
    <div className="w-8 h-12 sm:w-10 sm:h-14 bg-gray-700 rounded-lg animate-pulse border-2 border-gray-600" />
  );
}

export function PlayerAreaSkeleton() {
  return (
    <div className="p-2 rounded-lg border-2 border-gray-600 bg-gray-800 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gray-700" />
        <div className="h-4 bg-gray-700 rounded w-24" />
      </div>
      <div className="flex gap-1 mb-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="h-3 bg-gray-700 rounded w-16" />
    </div>
  );
}

export function GameBoardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-2 space-y-4">
      {/* Header skeleton */}
      <div className="p-2 rounded-lg border-2 border-gray-600 bg-gray-800">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-700 rounded w-20 animate-pulse" />
          <div className="h-4 bg-gray-700 rounded w-32 animate-pulse" />
        </div>
      </div>

      {/* Player areas skeleton */}
      <div className="grid grid-cols-3 gap-2">
        <PlayerAreaSkeleton />
        <PlayerAreaSkeleton />
        <PlayerAreaSkeleton />
      </div>

      {/* Human player skeleton */}
      <div className="border-t-2 border-gray-600 pt-4">
        <PlayerAreaSkeleton />
      </div>

      {/* Action buttons skeleton */}
      <div className="flex justify-center gap-3">
        <div className="w-24 h-12 bg-gray-700 rounded-lg animate-pulse" />
        <div className="w-24 h-12 bg-gray-700 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
