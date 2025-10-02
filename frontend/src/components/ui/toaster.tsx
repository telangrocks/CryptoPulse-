"use client";

import React, { useCallback } from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { useToast } from "@/hooks/use-toast";

/**
 * Toaster component for displaying toast notifications
 * 
 * @example
 * ```tsx
 * <Toaster />
 * ```
 */
export function Toaster() {
  const { toasts } = useToast();

  const renderToast = useCallback(({ id, title, description, action, variant, ...props }) => {
    return (
      <Toast key={id} variant={variant} {...props}>
        <div className="grid gap-1">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && (
            <ToastDescription>{description}</ToastDescription>
          )}
        </div>
        {action}
        <ToastClose />
      </Toast>
    );
  }, []);

  return (
    <ToastProvider>
      {toasts.map(renderToast)}
      <ToastViewport />
    </ToastProvider>
  );
}
