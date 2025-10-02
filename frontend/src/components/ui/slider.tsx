import { cn } from '@/lib/utils';
import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /**
   * Label text for the slider
   */
  label?: string;
  /**
   * Description text for the slider
   */
  description?: string;
  /**
   * Whether to show the current value
   */
  showValue?: boolean;
  /**
   * Format function for displaying the value
   */
  formatValue?: (value: number) => string;
  /**
   * Color variant of the slider
   */
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

/**
 * Slider component for selecting values from a range
 * 
 * @example
 * ```tsx
 * <Slider label="Volume" showValue value={[50]} max={100} />
 * <Slider variant="success" formatValue={(v) => `${v}%`} />
 * ```
 */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ 
  className, 
  label, 
  description, 
  showValue = false, 
  formatValue = (value) => value.toString(),
  variant = 'default',
  value,
  ...props 
}, ref) => {
  const sliderId = React.useId();
  const descriptionId = `${sliderId}-description`;

  const variantClasses = {
    default: 'bg-zinc-900 dark:bg-zinc-50',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    destructive: 'bg-red-500'
  };

  const currentValue = Array.isArray(value) ? value[0] : value || 0;

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <label
              htmlFor={sliderId}
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {formatValue(currentValue)}
            </span>
          )}
        </div>
      )}
      <SliderPrimitive.Root
        ref={ref}
        id={sliderId}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        value={value}
        aria-describedby={description ? descriptionId : undefined}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <SliderPrimitive.Range 
            className={cn(
              "absolute h-full transition-colors",
              variantClasses[variant]
            )} 
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-zinc-200 bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-visible:ring-zinc-300" />
      </SliderPrimitive.Root>
      {description && (
        <p
          id={descriptionId}
          className="text-xs text-zinc-500 dark:text-zinc-400 mt-1"
        >
          {description}
        </p>
      )}
    </div>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
