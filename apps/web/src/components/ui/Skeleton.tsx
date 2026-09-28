interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-cream-dark/50 rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
}
