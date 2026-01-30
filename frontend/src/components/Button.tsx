import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={twMerge(
                    clsx(
                        'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                        {
                            'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500': variant === 'primary',
                            'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500': variant === 'secondary',
                            'bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-blue-500 border border-gray-300': variant === 'outline',
                            'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'danger',
                        },
                        {
                            'px-3 py-1.5 text-sm': size === 'sm',
                            'px-4 py-2 text-sm': size === 'md',
                            'px-6 py-3 text-base': size === 'lg',
                        }
                    ),
                    className
                )}
                {...props}
            />
        );
    }
);

Button.displayName = 'Button';
