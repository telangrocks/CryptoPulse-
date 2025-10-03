import React from 'react';

import { generateRandomId } from '../lib/utils';

// Production-ready toast configuration
const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000; // 5 seconds instead of 1000000

// Enhanced type definitions for production
type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';
type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface ToastProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: ToastVariant;
  position?: ToastPosition;
  duration?: number;
  dismissible?: boolean;
  persistent?: boolean;
}

interface ToasterToast extends ToastProps {
  id: string;
  createdAt: number;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

// Action types with better type safety
const actionTypes = {
  ADD: 'ADD-TOAST',
  UPDATE: 'UPDATE-TOAST',
  DISMISS: 'DISMISS-TOAST',
  REMOVE: 'REMOVE-TOAST',
  CLEAR: 'CLEAR-TOASTS',
} as const;

// Secure ID generation with better collision resistance
let count = 0;
const generateSecureId = (): string => {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  const timestamp = Date.now().toString(36);
  const random = generateRandomId();
  return `toast-${timestamp}-${random}-${count}`;
};

type ActionType = typeof actionTypes;
type Action =
  | {
      type: ActionType['ADD'];
      toast: ToasterToast;
    }
  | {
      type: ActionType['UPDATE'];
      toast: Partial<ToasterToast> & { id: string };
    }
  | {
      type: ActionType['DISMISS'];
      toastId?: ToasterToast['id'];
    }
  | {
      type: ActionType['REMOVE'];
      toastId?: ToasterToast['id'];
    }
  | {
      type: ActionType['CLEAR'];
    };

interface State {
  toasts: ToasterToast[];
}

// Enhanced timeout management with cleanup
class ToastTimeoutManager {
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private intervals = new Map<string, ReturnType<typeof setInterval>>();

  addTimeout(toastId: string, callback: () => void, delay: number): void {
    this.clearTimeout(toastId);
    const timeout = setTimeout(() => {
      this.timeouts.delete(toastId);
      callback();
    }, delay);
    this.timeouts.set(toastId, timeout);
  }

  addInterval(toastId: string, callback: () => void, interval: number): void {
    this.clearInterval(toastId);
    const intervalId = setInterval(callback, interval);
    this.intervals.set(toastId, intervalId);
  }

  clearTimeout(toastId: string): void {
    const timeout = this.timeouts.get(toastId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(toastId);
    }
  }

  clearInterval(toastId: string): void {
    const interval = this.intervals.get(toastId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(toastId);
    }
  }

  clearAll(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.intervals.forEach(interval => clearInterval(interval));
    this.timeouts.clear();
    this.intervals.clear();
  }

  cleanup(): void {
    this.clearAll();
  }
}

const timeoutManager = new ToastTimeoutManager();

// Input sanitization for security
const sanitizeToastContent = (content: React.ReactNode): React.ReactNode => {
  if (typeof content === 'string') {
    // Basic XSS protection - remove script tags and dangerous attributes
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/javascript:/gi, '');
  }
  return content;
};

const addToRemoveQueue = (toastId: string, duration: number = TOAST_REMOVE_DELAY): void => {
  if (timeoutManager.timeouts.has(toastId)) {
    return;
  }

  timeoutManager.addTimeout(toastId, () => {
    dispatch({
      type: 'REMOVE-TOAST',
      toastId: toastId,
    });
  }, duration);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD-TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case 'UPDATE-TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      };

    case 'DISMISS-TOAST': {
      const { toastId } = action;
      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
              ...t,
              open: false,
            }
            : t,
        ),
      };
    }
    case 'REMOVE-TOAST':
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
};

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type Toast = Omit<ToasterToast, 'id'>;

function toast({ ...props }: Toast) {
  const id = generateSecureId();
  const update = (props: Partial<ToasterToast>) =>
    dispatch({
      type: 'UPDATE-TOAST',
      toast: { ...props, id },
    });
  const dismiss = () => dispatch({ type: 'DISMISS-TOAST', toastId: id as string });

  dispatch({
    type: 'ADD-TOAST',
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id: id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS-TOAST', toastId }),
  };
}

export { useToast, toast };
