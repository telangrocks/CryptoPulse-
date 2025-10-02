import { cn } from '@/lib/utils';
import React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

export interface ScrollAreaProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  /**
   * Whether to show scrollbars
   */
  showScrollbar?: boolean;
  /**
   * Orientation of the scroll area
   */
  orientation?: 'vertical' | 'horizontal' | 'both';
  /**
   * Custom scrollbar variant
   */
  scrollbarVariant?: 'default' | 'thin' | 'none';
}

/**
 * ScrollArea component for creating scrollable content areas
 * 
 * @example
 * ```tsx
 * <ScrollArea className="h-72 w-48">
 *   <div className="p-4">Long content...</div>
 * </ScrollArea>
 * <ScrollArea orientation="horizontal" showScrollbar>
 *   <div className="flex space-x-4">Horizontal content...</div>
 * </ScrollArea>
 * ```
 */
const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, showScrollbar = true, orientation = 'vertical', scrollbarVariant = 'default', ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    {showScrollbar && orientation !== 'horizontal' && (
      <ScrollBar orientation="vertical" variant={scrollbarVariant} />
    )}
    {showScrollbar && orientation !== 'vertical' && (
      <ScrollBar orientation="horizontal" variant={scrollbarVariant} />
    )}
    {showScrollbar && orientation === 'both' && (
      <>
        <ScrollBar orientation="vertical" variant={scrollbarVariant} />
        <ScrollBar orientation="horizontal" variant={scrollbarVariant} />
      </>
    )}
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

export interface ScrollBarProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> {
  /**
   * Visual variant of the scrollbar
   */
  variant?: 'default' | 'thin' | 'none';
}

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  ScrollBarProps
>(({ className, orientation = "vertical", variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: "w-2.5 h-2.5",
    thin: "w-1 h-1",
    none: "w-0 h-0"
  };

  if (variant === 'none') return null;

  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      ref={ref}
      orientation={orientation}
      className={cn(
        "flex touch-none select-none transition-colors",
        orientation === "vertical" &&
          `h-full border-l border-l-transparent p-[1px] ${variantClasses[variant]}`,
        orientation === "horizontal" &&
          `flex-col border-t border-t-transparent p-[1px] ${variantClasses[variant]}`,
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
});
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
export type { ScrollAreaProps, ScrollBarProps };
