import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, X } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

import { generateRandomId } from '../../lib/utils';

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  /**
   * Label text for the checkbox
   */
  label?: string;
  /**
   * Description text for the checkbox
   */
  description?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Whether the checkbox is required
   */
  required?: boolean;
}

/**
 * Checkbox component with enhanced accessibility
 *
 * @example
 * ```tsx
 * <Checkbox id="terms" label="Accept terms and conditions" />
 * <Checkbox id="newsletter" label="Subscribe to newsletter" description="Get updates about new features" />
 * ```
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, description, error, required, id, ...props }, ref) => {
  const checkboxId = id || `checkbox-${generateRandomId()}`;
  const descriptionId = `${checkboxId}-description`;
  const errorId = `${checkboxId}-error`;

  return (
    <div className="flex items-start space-x-2">
      <CheckboxPrimitive.Root
        aria-describedby={description ? descriptionId : error ? errorId : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          'peer h-4 w-4 shrink-0 rounded-sm border border-zinc-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-zinc-900 data-[state=checked]:text-zinc-50 dark:border-zinc-50 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300 dark:data-[state=checked]:bg-zinc-50 dark:data-[state=checked]:text-zinc-900',
          error && 'border-red-500 focus-visible:ring-red-500',
          className,
        )}
        id={checkboxId}
        ref={ref}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          className={cn('flex items-center justify-center text-current')}
        >
          <Check className="h-4 w-4" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {(label || description || error) && (
        <div className="grid gap-1.5 leading-none">
          {label && (
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor={checkboxId}
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
      )}
    </div>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
