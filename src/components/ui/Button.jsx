import React from 'react';
import './Button.css';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) {
  return (
    <button 
      className={`lumilove-button ${variant} ${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
