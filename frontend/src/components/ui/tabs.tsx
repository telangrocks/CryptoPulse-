import * as TabsPrimitive from '@radix-ui/react-tabs';
import React from 'react';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  /**
   * Size variant of the tabs list
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Variant of the tabs list
   */
  variant?: 'default' | 'pills' | 'underline';
}

/**
 * TabsList component for containing tab triggers
 *
 * @example
 * ```tsx
 * <TabsList variant="pills" size="lg">
 *   <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *   <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 * </TabsList>
 * ```
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, size = 'md', variant = 'default', ...props }, ref) => {
  const sizeClasses = {
    sm: 'h-8 p-0.5',
    md: 'h-9 p-1',
    lg: 'h-10 p-1.5',
  };

  const variantClasses = {
    default: 'rounded-lg bg-zinc-100 dark:bg-zinc-800',
    pills: 'rounded-full bg-zinc-100 dark:bg-zinc-800',
    underline: 'rounded-none bg-transparent border-b border-zinc-200 dark:border-zinc-800',
  };

  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex items-center justify-center text-zinc-500 dark:text-zinc-400',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /**
   * Icon to display before the trigger text
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon to display after the trigger text
   */
  rightIcon?: React.ReactNode;
  /**
   * Badge to display on the trigger
   */
  badge?: string | number;
}

/**
 * TabsTrigger component for tab navigation
 *
 * @example
 * ```tsx
 * <TabsTrigger value="tab1" leftIcon={<HomeIcon />}>Home</TabsTrigger>
 * <TabsTrigger value="tab2" badge="3">Messages</TabsTrigger>
 * ```
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, leftIcon, rightIcon, badge, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300 dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:text-zinc-50',
      className,
    )}
    ref={ref}
    {...props}
  >
    {leftIcon && <span className="mr-2">{leftIcon}</span>}
    {children}
    {badge && (
      <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-zinc-200 text-zinc-700 rounded-full dark:bg-zinc-700 dark:text-zinc-300">
        {badge}
      </span>
    )}
    {rightIcon && <span className="ml-2">{rightIcon}</span>}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export interface TabsContentProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  /**
   * Whether to add padding to the content
   */
  padded?: boolean;
  /**
   * Animation variant for content transitions
   */
  animation?: 'fade' | 'slide' | 'none';
}

/**
 * TabsContent component for tab panel content
 *
 * @example
 * ```tsx
 * <TabsContent value="tab1" padded>
 *   <p>Tab 1 content</p>
 * </TabsContent>
 * ```
 */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, padded = true, animation = 'fade', ...props }, ref) => {
  const animationClasses = {
    fade: 'data-[state=inactive]:opacity-0 data-[state=active]:opacity-100 transition-opacity duration-200',
    slide: 'data-[state=inactive]:translate-x-4 data-[state=active]:translate-x-0 transition-transform duration-200',
    none: '',
  };

  return (
    <TabsPrimitive.Content
      className={cn(
        'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300',
        padded && 'p-4',
        animationClasses[animation],
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsListProps, TabsTriggerProps, TabsContentProps };
