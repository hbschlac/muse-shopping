/**
 * Muse Brand Button Component
 * Enforces brand guidelines for all button usage
 */

import React from 'react';
import { getButtonClasses } from '../utils';
import { BrandTokens } from '../tokens';

export interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  isPrimaryCTA?: boolean;
  size?: 'default' | 'small';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const BrandButton: React.FC<BrandButtonProps> = ({
  variant = 'primary',
  isPrimaryCTA = false,
  size = 'default',
  fullWidth = false,
  children,
  className = '',
  ...props
}) => {
  const brandClasses = getButtonClasses(variant, isPrimaryCTA);

  const sizeClasses = size === 'small'
    ? `h-[${BrandTokens.components.button.heightSmall}] px-4`
    : `h-[${BrandTokens.components.button.height}] px-6`;

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${brandClasses} ${sizeClasses} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
