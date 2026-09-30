'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'espresso' | 'secondary' | 'ghost' | 'danger' | 'sage' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-sans font-medium transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-xl gap-2',
    lg: 'text-base px-6 py-3.5 rounded-xl gap-2.5 font-semibold',
  }[size];

  const variantStyles = {
    primary:
      'bg-gold hover:bg-gold-deep text-white border border-gold hover:border-gold-deep shadow-sm hover:shadow-md hover:shadow-gold/20',
    espresso:
      'bg-ink hover:bg-[#332A22] text-white border border-ink shadow-sm hover:shadow-md hover:shadow-ink/20',
    secondary:
      'bg-white hover:bg-gold-pale text-ink hover:text-gold-deep border border-divider hover:border-gold shadow-sm',
    outline:
      'bg-transparent hover:bg-white/80 text-ink border border-divider hover:border-ink/30',
    ghost:
      'bg-transparent hover:bg-ink/5 text-ink-muted hover:text-ink border-transparent',
    danger:
      'bg-danger hover:bg-[#8B2D22] text-white border border-danger shadow-sm',
    sage:
      'bg-sage hover:bg-sage-dark text-white border border-sage shadow-sm',
  }[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}

export function IconButton({
  icon,
  size = 'md',
  variant = 'secondary',
  className = '',
  disabled = false,
  loading = false,
  ...props
}: Omit<ButtonProps, 'children'> & { icon: React.ReactNode }) {
  const sizeStyles = {
    sm: 'w-7 h-7 p-1 rounded-lg text-xs',
    md: 'w-9 h-9 p-2 rounded-xl text-sm',
    lg: 'w-11 h-11 p-2.5 rounded-xl text-base',
  }[size];

  return (
    <Button
      size={size}
      variant={variant}
      disabled={disabled || loading}
      className={`!px-0 ${sizeStyles} ${className}`}
      {...props}
    >
      {icon}
    </Button>
  );
}
