import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import React from 'react';

const skeletonVariants = cva(
  "animate-pulse rounded-md",
  {
    variants: {
      variant: {
        default: "bg-zinc-100 dark:bg-zinc-800",
        card: "bg-zinc-200 dark:bg-zinc-700",
        text: "bg-zinc-200 dark:bg-zinc-700 h-4",
        avatar: "bg-zinc-200 dark:bg-zinc-700 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export { Skeleton, skeletonVariants };
export type { SkeletonProps };
