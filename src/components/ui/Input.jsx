import React, { forwardRef } from 'react';
import './Input.css';

export const Input = forwardRef(({ 
  label, 
  error, 
  className = '', 
  id, 
  ...props 
}, ref) => {
  return (
    <div className={`lumilove-input-wrapper ${className}`}>
      {label && <label htmlFor={id} className="lumilove-label">{label}</label>}
      <input
        id={id}
        ref={ref}
        className={`lumilove-input ${error ? 'error' : ''}`}
        {...props}
      />
      {error && <span style={{ color: 'var(--color-red)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
