import React from 'react';

interface NoteBadgeProps {
    /** Whether to show the badge */
    isVisible: boolean;
    /** Whether note is selected (affects styling) */
    isSelected: boolean;
}

/**
 * Note type badge component
 */
export const NoteBadge = React.memo(function NoteBadge({
    isVisible,
    isSelected,
}: NoteBadgeProps) {
    if (!isVisible) return null;

    // Light mode only - theme is enforced application-wide
    const isDark = false;

    return (
        <div
            style={{
                position: 'absolute',
                top: '8px',
                left: '12px',
                fontSize: '10px',
                fontWeight: 600,
                color: isSelected ? '#818cf8' : (isDark ? '#a1a1aa' : '#6b7280'),
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                pointerEvents: 'none',
                opacity: 0.9,
                zIndex: 1000,
            }}
        >
            📝 Markdown
        </div>
    );
});
