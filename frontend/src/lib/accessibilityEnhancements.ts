// =============================================================================
// Accessibility Enhancements
// =============================================================================
// Comprehensive accessibility utilities and enhancements

// ARIA attributes helper
export function createAriaAttributes(options: {
  label?: string;
  describedBy?: string;
  expanded?: boolean;
  hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  hidden?: boolean;
  live?: 'polite' | 'assertive' | 'off';
  role?: string;
  level?: number;
  selected?: boolean;
  checked?: boolean;
  disabled?: boolean;
}): Record<string, string | boolean | number> {
  const attrs: Record<string, string | boolean | number> = {};
  
  if (options.label) attrs['aria-label'] = options.label;
  if (options.describedBy) attrs['aria-describedby'] = options.describedBy;
  if (typeof options.expanded === 'boolean') attrs['aria-expanded'] = options.expanded;
  if (options.hasPopup) attrs['aria-haspopup'] = options.hasPopup;
  if (typeof options.hidden === 'boolean') attrs['aria-hidden'] = options.hidden;
  if (options.live) attrs['aria-live'] = options.live;
  if (options.role) attrs['role'] = options.role;
  if (options.level) attrs['aria-level'] = options.level;
  if (typeof options.selected === 'boolean') attrs['aria-selected'] = options.selected;
  if (typeof options.checked === 'boolean') attrs['aria-checked'] = options.checked;
  if (typeof options.disabled === 'boolean') attrs['aria-disabled'] = options.disabled;
  
  return attrs;
}

// Focus management utilities
export const focusManager = {
  // Trap focus within an element
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    firstFocusable?.focus();
    
    return () => container.removeEventListener('keydown', handleTabKey);
  },
  
  // Store and restore focus
  createFocusManager() {
    let previousFocus: HTMLElement | null = null;
    
    return {
      store() {
        previousFocus = document.activeElement as HTMLElement;
      },
      restore() {
        if (previousFocus && document.contains(previousFocus)) {
          previousFocus.focus();
        }
      },
    };
  },
  
  // Focus first error element
  focusFirstError(container: HTMLElement = document.body) {
    const errorElement = container.querySelector('[aria-invalid="true"], .error') as HTMLElement;
    errorElement?.focus();
  },
};

// Screen reader announcements
export const announcer = {
  // Create live region for announcements
  createLiveRegion(): HTMLElement {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    document.body.appendChild(liveRegion);
    return liveRegion;
  },
  
  // Announce message to screen readers
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const liveRegion = document.getElementById('sr-live-region') || this.createLiveRegion();
    liveRegion.id = 'sr-live-region';
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  },
};

// Keyboard navigation helpers
export const keyboardNav = {
  // Handle arrow key navigation
  handleArrowKeys(
    elements: HTMLElement[],
    currentIndex: number,
    orientation: 'horizontal' | 'vertical' = 'vertical'
  ) {
    return (e: KeyboardEvent) => {
      let newIndex = currentIndex;
      
      if (orientation === 'vertical') {
        if (e.key === 'ArrowDown') {
          newIndex = (currentIndex + 1) % elements.length;
        } else if (e.key === 'ArrowUp') {
          newIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
        }
      } else {
        if (e.key === 'ArrowRight') {
          newIndex = (currentIndex + 1) % elements.length;
        } else if (e.key === 'ArrowLeft') {
          newIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
        }
      }
      
      if (newIndex !== currentIndex) {
        elements[newIndex].focus();
        e.preventDefault();
      }
    };
  },
  
  // Handle escape key
  handleEscape(callback: () => void) {
    return (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
        e.preventDefault();
      }
    };
  },
  
  // Handle enter/space activation
  handleActivation(callback: () => void) {
    return (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        callback();
        e.preventDefault();
      }
    };
  },
};

// Color contrast utilities
export const colorContrast = {
  // Calculate relative luminance
  getLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;
    
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },
  
  // Convert hex to RGB
  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  },
  
  // Calculate contrast ratio
  getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  },
  
  // Check if contrast meets WCAG standards
  meetsWCAG(color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): boolean {
    const ratio = this.getContrastRatio(color1, color2);
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  },
};

// Reduced motion utilities
export const motionPreferences = {
  // Check if user prefers reduced motion
  prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  
  // Apply animation only if user doesn't prefer reduced motion
  conditionalAnimation(element: HTMLElement, animation: () => void) {
    if (!this.prefersReducedMotion()) {
      animation();
    }
  },
};

// High contrast mode detection
export const highContrast = {
  // Detect high contrast mode
  isHighContrastMode(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  },
  
  // Apply high contrast styles
  applyHighContrastStyles(element: HTMLElement) {
    if (this.isHighContrastMode()) {
      element.style.border = '2px solid';
      element.style.outline = '1px solid';
    }
  },
};

// Form accessibility helpers
export const formA11y = {
  // Associate label with input
  associateLabel(input: HTMLInputElement, label: HTMLLabelElement) {
    const id = input.id || `input-${Date.now()}`;
    input.id = id;
    label.setAttribute('for', id);
  },
  
  // Add error message
  addErrorMessage(input: HTMLInputElement, message: string) {
    const errorId = `${input.id}-error`;
    let errorElement = document.getElementById(errorId);
    
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = errorId;
      errorElement.setAttribute('role', 'alert');
      errorElement.setAttribute('aria-live', 'polite');
      input.parentNode?.insertBefore(errorElement, input.nextSibling);
    }
    
    errorElement.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorId);
  },
  
  // Clear error message
  clearErrorMessage(input: HTMLInputElement) {
    const errorId = `${input.id}-error`;
    const errorElement = document.getElementById(errorId);
    
    if (errorElement) {
      errorElement.remove();
    }
    
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  },
};

// Hook exports
export function useAccessibility() {
  return {
    createAriaAttributes,
    focusManager,
    announcer,
    keyboardNav,
    colorContrast,
    motionPreferences,
    highContrast,
    formA11y,
  };
}

export function useModalAccessibility() {
  return {
    trapFocus: focusManager.trapFocus,
    announce: announcer.announce,
    createAriaAttributes,
  };
}

export function useFormAccessibility() {
  return {
    validateField: formA11y.validateField,
    showError: formA11y.showError,
    clearError: formA11y.clearError,
    createAriaAttributes,
  };
}

export function useLoadingAccessibility() {
  return {
    announce: announcer.announce,
    createAriaAttributes,
  };
}

export function useErrorAccessibility() {
  return {
    announce: announcer.announce,
    createAriaAttributes,
  };
}

// SkipLink is exported from components/SkipLink.tsx

// Export all utilities
export default {
  createAriaAttributes,
  focusManager,
  announcer,
  keyboardNav,
  colorContrast,
  motionPreferences,
  highContrast,
  formA11y,
  useAccessibility,
  useModalAccessibility,
  useFormAccessibility,
  useLoadingAccessibility,
  useErrorAccessibility,
};
