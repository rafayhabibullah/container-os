import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
const cn = (...inputs: any[]) => twMerge(clsx(inputs));

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline';
}
const variantClasses = { default: 'bg-blue-100 text-blue-800', success: 'bg-green-100 text-green-800', warning: 'bg-yellow-100 text-yellow-800', destructive: 'bg-red-100 text-red-800', outline: 'text-gray-700 border-gray-300' };

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return <div className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', variantClasses[variant], className)} {...props} />;
}
