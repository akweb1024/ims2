import { useEffect, useRef } from 'react';

/**
 * Focus Trap Hook
 * Traps focus within a container (e.g., modal) for keyboard accessibility
 * 
 * @param isActive - Whether the focus trap is active
 * @returns ref - Ref to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(isActive: boolean = true) {
    const containerRef = useRef<T>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isActive) return;

        const container = containerRef.current;
        if (!container) return;

        // Store the currently focused element
        previousActiveElement.current = document.activeElement as HTMLElement;

        // Get all focusable elements
        const getFocusableElements = () => {
            const focusableSelectors = [
                'a[href]',
                'button:not([disabled])',
                'textarea:not([disabled])',
                'input:not([disabled])',
                'select:not([disabled])',
                '[tabindex]:not([tabindex="-1"])',
            ].join(', ');

            return Array.from(
                container.querySelectorAll<HTMLElement>(focusableSelectors)
            ).filter(el => {
                // Filter out hidden elements
                return el.offsetParent !== null;
            });
        };

        // Handle tab key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            const focusableElements = getFocusableElements();
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            // Shift + Tab (backwards)
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab (forwards)
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        // Focus first element when trap activates
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        // Add event listener
        container.addEventListener('keydown', handleKeyDown);

        // Cleanup
        return () => {
            container.removeEventListener('keydown', handleKeyDown);

            // Restore focus to previous element
            if (previousActiveElement.current) {
                previousActiveElement.current.focus();
            }
        };
    }, [isActive]);

    return containerRef;
}
