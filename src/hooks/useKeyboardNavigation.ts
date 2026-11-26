import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing focus trapping in modals/dialogs
 */
export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the first focusable element
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    if (firstFocusable) {
      firstFocusable.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableArray = Array.from(focusableElements);
      const first = focusableArray[0];
      const last = focusableArray[focusableArray.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, containerRef]);
}

/**
 * Hook for handling escape key to close modals
 */
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, isActive]);
}

/**
 * Hook for managing roving tabindex in lists/menus
 */
export function useRovingTabindex(
  itemsCount: number,
  onSelect: (index: number) => void,
  orientation: 'horizontal' | 'vertical' | 'both' = 'vertical'
) {
  const activeIndexRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isHorizontal = orientation === 'horizontal' || (orientation === 'both' && e.key === 'ArrowRight');
      const isVertical = orientation === 'vertical' || (orientation === 'both' && e.key === 'ArrowDown');

      let newIndex = activeIndexRef.current;

      if (e.key === 'ArrowDown' && isVertical) {
        e.preventDefault();
        newIndex = (activeIndexRef.current + 1) % itemsCount;
      } else if (e.key === 'ArrowUp' && isVertical) {
        e.preventDefault();
        newIndex = (activeIndexRef.current - 1 + itemsCount) % itemsCount;
      } else if (e.key === 'ArrowRight' && isHorizontal) {
        e.preventDefault();
        newIndex = (activeIndexRef.current + 1) % itemsCount;
      } else if (e.key === 'ArrowLeft' && isHorizontal) {
        e.preventDefault();
        newIndex = (activeIndexRef.current - 1 + itemsCount) % itemsCount;
      } else if (e.key === 'Home') {
        e.preventDefault();
        newIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        newIndex = itemsCount - 1;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(activeIndexRef.current);
        return;
      } else {
        return;
      }

      activeIndexRef.current = newIndex;
      const items = containerRef.current?.querySelectorAll('[role="option"], [role="menuitem"], button');
      if (items?.[newIndex]) {
        (items[newIndex] as HTMLElement).focus();
      }
    },
    [itemsCount, onSelect, orientation]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { containerRef, activeIndex: activeIndexRef.current };
}

/**
 * Hook for announcing changes to screen readers
 */
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
    announcerRef.current = announcer;

    return () => {
      document.body.removeChild(announcer);
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority);
      announcerRef.current.textContent = message;
    }
  }, []);

  return { announce };
}