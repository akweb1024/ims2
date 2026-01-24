'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Skip Navigation Link
 * Allows keyboard users to skip directly to main content
 */
export default function SkipNavigation() {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <Link
            href="#main-content"
            className={`
                fixed top-4 left-4 z-[100]
                bg-blue-600 text-white
                px-6 py-3 rounded-lg
                font-semibold text-sm
                shadow-lg
                transition-all duration-200
                focus:outline-none focus:ring-4 focus:ring-blue-300
                ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}
            `}
            onFocus={() => setIsVisible(true)}
            onBlur={() => setIsVisible(false)}
        >
            Skip to main content
        </Link>
    );
}
