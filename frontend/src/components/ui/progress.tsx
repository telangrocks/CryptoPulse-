import { cn } from '@/lib/utils';
import React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /**
   * Label text for the progress bar
   */
  label?: string;
  /**
   * Whether to show the percentage value
   */
  showValue?: boolean;
  /**
   * Size variant of the progress bar
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Color variant of the progress bar
   */
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

/**
 * Progress component for displaying progress indicators
 * 
 * @example
 * ```tsx
 * <Progress value={75} label="Upload progress" showValue />
 * <Progress value={50} variant="success" size="lg" />
 * ```
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, label, showValue = false, size = 'md', variant = 'default', ...props }, ref) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6'
  };

  const variantClasses = {
    default: 'bg-gradient-to-r from-purple-500 to-blue-500',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    destructive: 'bg-gradient-to-r from-red-500 to-pink-500'
  };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {Math.round(value || 0)}%
            </span>
          )}
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800",
          sizeClasses[size],
          className
        )}
        value={value}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-all duration-300 ease-in-out",
            variantClasses[variant]
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
