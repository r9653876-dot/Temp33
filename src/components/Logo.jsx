import React from 'react';
import './Logo.css';

export function Logo({ className = '' }) {
  return (
    <a href="/" className={`lumilove-logo ${className}`}>
      <svg className="lumilove-logo-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF2D95" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <path 
          d="M 50 88 C 50 88 15 60 15 35 C 15 18 38 15 50 32 C 62 15 85 18 85 35 C 85 60 50 88 50 88 Z" 
          fill="url(#logo-grad)" 
        />
      </svg>
      <span className="lumilove-logo-text">LumiLove</span>
    </a>
  );
}
