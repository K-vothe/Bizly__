import React from 'react';

const COLORS: Record<string, string> = {
  green: 'badge-green',
  red: 'badge-red',
  yellow: 'badge-yellow',
  purple: 'badge-purple',
  blue: 'badge-blue',
};

export interface BadgeProps {
  color?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Badge({ color = 'green', children, style }: BadgeProps) {
  return (
    <span className={`badge ${COLORS[color] || ''}`} style={style}>
      {children}
    </span>
  );
}

export default Badge;
