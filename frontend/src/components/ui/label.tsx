import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      variant: {
        default: 'text-zinc-950 dark:text-zinc-50',
        muted: 'text-zinc-500 dark:text-zinc-400',
        error: 'text-red-500 dark:text-red-400',
        success: 'text-green-600 dark:text-green-400',
        warning: 'text-yellow-600 dark:text-yellow-400',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  /**
   * Whether the label is required (shows asterisk)
   */
  required?: boolean;
  /**
   * Optional description text below the label
   */
  description?: string;
  /**
   * Error message to display
   */
  error?: string;
}

/**
 * Label component for form inputs with enhanced accessibility
 *
 * @example
 * ```tsx
 * <Label htmlFor="email" required>Email Address</Label>
 * <Label variant="error" error="This field is required">Password</Label>
 * <Label description="Enter your full name">Name</Label>
 * ```
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, variant, size, required, description, error, children, ...props }, ref) => {
  const labelId = props.htmlFor ? `${props.htmlFor}-label` : undefined;
  const descriptionId = props.htmlFor ? `${props.htmlFor}-description` : undefined;
  const errorId = props.htmlFor ? `${props.htmlFor}-error` : undefined;

  return (
    <div className="space-y-1">
      <LabelPrimitive.Root
        className={cn(labelVariants({ variant, size }), className)}
        id={labelId}
        ref={ref}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </LabelPrimitive.Root>
      {description && !error && (
        <p
          className="text-xs text-zinc-500 dark:text-zinc-400"
          id={descriptionId}
        >
          {description}
        </p>
      )}
      {error && (
        <p
          className="text-xs text-red-500"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label, labelVariants };
export type { LabelProps };
