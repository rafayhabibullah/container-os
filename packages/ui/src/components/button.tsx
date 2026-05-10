import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
}

const variantClasses = {
  default: 'bg-blue-600 text-white hover:bg-blue-700',
  destructive: 'bg-red-500 text-white hover:bg-red-600',
  outline: 'border border-gray-300 bg-white hover:bg-gray-50',
  ghost: 'hover:bg-gray-100',
};
const sizeClasses = { default: 'h-10 px-4 py-2', sm: 'h-9 px-3', lg: 'h-11 px-8' };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button ref={ref} className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50', variantClasses[variant], sizeClasses[size], className)} {...props} />
  ),
);
Button.displayName = 'Button';
