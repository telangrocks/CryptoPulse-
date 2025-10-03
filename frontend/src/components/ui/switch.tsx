import * as SwitchPrimitives from '@radix-ui/react-switch';
import React from 'react';

import { cn } from '@/lib/utils';

import { generateRandomId } from '../../lib/utils';

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  /**
   * Label text for the switch
   */
  label?: string;
  /**
   * Description text for the switch
   */
  description?: string;
  /**
   * Whether the switch is required
   */
  required?: boolean;
  /**
   * Size variant of the switch
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Color variant of the switch
   */
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

/**
 * Switch component for toggling between two states
 *
 * @example
 * ```tsx
 * <Switch label="Enable notifications" />
 * <Switch variant="success" size="lg" description="Turn on email alerts" />
 * ```
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({
  className,
  label,
  description,
  required,
  size = 'md',
  variant = 'default',
  id,
  ...props
}, ref) => {
  const switchId = id || `switch-${generateRandomId()}`;
  const descriptionId = `${switchId}-description`;

  const sizeClasses = {
    sm: 'h-4 w-7',
    md: 'h-5 w-9',
    lg: 'h-6 w-11',
  };

  const thumbSizeClasses = {
    sm: 'h-3 w-3 data-[state=checked]:translate-x-3',
    md: 'h-4 w-4 data-[state=checked]:translate-x-4',
    lg: 'h-5 w-5 data-[state=checked]:translate-x-5',
  };

  const variantClasses = {
    default: 'data-[state=checked]:bg-zinc-900 dark:data-[state=checked]:bg-zinc-50',
    success: 'data-[state=checked]:bg-green-500',
    warning: 'data-[state=checked]:bg-yellow-500',
    destructive: 'data-[state=checked]:bg-red-500',
  };

  return (
    <div className="flex items-start space-x-3">
      <SwitchPrimitives.Root
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-zinc-200 dark:focus-visible:ring-zinc-300 dark:focus-visible:ring-offset-zinc-950 dark:data-[state=unchecked]:bg-zinc-800',
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        id={switchId}
        ref={ref}
        {...props}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            'pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0 dark:bg-zinc-950',
            thumbSizeClasses[size],
          )}
        />
      </SwitchPrimitives.Root>
      {(label || description) && (
        <div className="grid gap-1.5 leading-none">
          {label && (
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor={switchId}
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {description && (
            <p
              className="text-xs text-zinc-500 dark:text-zinc-400"
              id={descriptionId}
            >
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
