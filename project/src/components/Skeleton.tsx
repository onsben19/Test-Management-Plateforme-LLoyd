import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height
}) => {
    const style: React.CSSProperties = {
        width,
        height,
    };

    const variantClasses = {
        text: 'h-4 w-full mb-2',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    return (
        <div
            className={`skeleton ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
};

export default Skeleton;
