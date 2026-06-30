import React from 'react';
import { clsx } from 'clsx';

type BadgeColor =
  | 'gray'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange'
  | 'teal'
  | 'pink'
  | 'slate'
  | 'indigo';

interface BadgeProps {
  label: string;
  color: BadgeColor;
  size?: 'sm' | 'md';
}

// Tailwind 4 safe: explicit static class names per color so the JIT compiler
// can statically detect every class. Never build these strings dynamically.
const colorClasses: Record<BadgeColor, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  teal: 'bg-teal-100 text-teal-700',
  pink: 'bg-pink-100 text-pink-700',
  slate: 'bg-gray-100 text-gray-600',
  indigo: 'bg-indigo-100 text-indigo-700',
};

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
};

export function Badge({ label, color, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md font-medium whitespace-nowrap',
        colorClasses[color],
        sizeClasses[size],
      )}
    >
      {label}
    </span>
  );
}

export default Badge;
