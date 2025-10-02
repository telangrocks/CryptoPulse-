import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import React from 'react';

const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-zinc-200 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:border-zinc-800 dark:focus:ring-zinc-300",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 text-zinc-50 shadow hover:bg-zinc-900/80 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/80",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-100/80 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-800/80",
        destructive:
          "border-transparent bg-red-500 text-zinc-50 shadow hover:bg-red-500/80 dark:bg-red-900 dark:text-zinc-50 dark:hover:bg-red-900/80",
        success:
          "border-transparent bg-green-500 text-zinc-50 shadow hover:bg-green-500/80 dark:bg-green-900 dark:text-zinc-50 dark:hover:bg-green-900/80",
        warning:
          "border-transparent bg-yellow-500 text-zinc-50 shadow hover:bg-yellow-500/80 dark:bg-yellow-900 dark:text-zinc-50 dark:hover:bg-yellow-900/80",
        info:
          "border-transparent bg-blue-500 text-zinc-50 shadow hover:bg-blue-500/80 dark:bg-blue-900 dark:text-zinc-50 dark:hover:bg-blue-900/80",
        outline: "text-zinc-950 dark:text-zinc-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /**
   * Whether the badge should be interactive (clickable)
   */
  interactive?: boolean;
  /**
   * Callback when badge is clicked (only if interactive)
   */
  onClick?: () => void;
}

/**
 * Badge component for displaying status, labels, or counts
 * 
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="destructive" interactive onClick={handleClick}>Remove</Badge>
 * ```
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, interactive = false, onClick, ...props }, ref) => {
    const Component = interactive ? 'button' : 'div';
    
    return (
      <Component
        ref={ref}
        className={cn(
          badgeVariants({ variant }),
          interactive && "cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2",
          className
        )}
        onClick={interactive ? onClick : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
