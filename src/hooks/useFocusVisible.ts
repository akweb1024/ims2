import { useEffect, useState } from 'react';

/**
 * Focus Visible Hook
 * Detects keyboard navigation and applies focus-visible class
 * Helps distinguish between mouse and keyboard focus
 * 
 * @returns isKeyboardUser - Whether the user is navigating with keyboard
 */
export function useFocusVisible() {
    const [isKeyboardUser, setIsKeyboardUser] = useState(false);

    useEffect(() => {
        // Detect keyboard usage
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                setIsKeyboardUser(true);
            }
        };

        // Detect mouse usage
        const handleMouseDown = () => {
            setIsKeyboardUser(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleMouseDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleMouseDown);
        };
    }, []);

    return isKeyboardUser;
}
