import React from 'react';

import { cn , generateRandomId } from '@/lib/utils';

export interface InputProps extends React.ComponentProps<'input'> {
  /**
   * Label text for the input
   */
  label?: string;
  /**
   * Description text for the input
   */
  description?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Whether the input is required
   */
  required?: boolean;
  /**
   * Left icon to display in the input
   */
  leftIcon?: React.ReactNode;
  /**
   * Right icon to display in the input
   */
  rightIcon?: React.ReactNode;
  /**
   * Whether the input is in a loading state
   */
  loading?: boolean;
}

/**
 * Input component with enhanced accessibility and validation
 *
 * @example
 * ```tsx
 * <Input label="Email" type="email" placeholder="Enter your email" />
 * <Input label="Password" type="password" error="Password is required" />
 * <Input leftIcon={<SearchIcon />} placeholder="Search..." />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type,
    label,
    description,
    error,
    required,
    leftIcon,
    rightIcon,
    loading,
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${generateRandomId()}`;
    const descriptionId = `${inputId}-description`;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full">
        {label && (
          <label
            className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2"
            htmlFor={inputId}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500">
              {leftIcon}
            </div>
          )}
          <input
            aria-describedby={description ? descriptionId : error ? errorId : undefined}
            aria-invalid={error ? 'true' : undefined}
            className={cn(
              'flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-zinc-950 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-zinc-800 dark:file:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-300',
              leftIcon && 'pl-10',
              (rightIcon || loading) && 'pr-10',
              error && 'border-red-500 focus-visible:ring-red-500',
              className,
            )}
            id={inputId}
            ref={ref}
            type={type}
            {...props}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg
                className="h-4 w-4 animate-spin text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  fill="currentColor"
                />
              </svg>
            </div>
          )}
          {!loading && rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500">
              {rightIcon}
            </div>
          )}
        </div>
        {description && (
          <p
            className="text-xs text-zinc-500 dark:text-zinc-400 mt-1"
            id={descriptionId}
          >
            {description}
          </p>
        )}
        {error && (
          <p
            className="text-xs text-red-500 mt-1"
            id={errorId}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
