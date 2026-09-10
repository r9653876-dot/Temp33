import React from 'react';
import './Card.css';

export function Card({ 
  children, 
  hoverable = false, 
  glass = false, 
  className = '', 
  ...props 
}) {
  const classes = [
    'lumilove-card',
    hoverable ? 'hoverable' : '',
    glass ? 'glass' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
