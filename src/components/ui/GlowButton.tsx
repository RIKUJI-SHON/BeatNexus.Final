import React from 'react';

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
}

export const GlowButton: React.FC<GlowButtonProps> = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = '' 
}) => {
  return (
    <div className={`relative p-[3px] bg-gradient-to-r from-cyan-400 to-pink-500 rounded-[0.9rem] transition-all duration-400 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      {/* Glow effect - hidden by default, shown on hover of this specific button */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-[0.9rem] opacity-0 hover:opacity-100 blur-[1.2rem] transition-all duration-400 active:blur-[0.2rem] -z-10"></div>
      
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className="relative w-full bg-black text-white text-[1.4em] px-[0.8em] py-[0.6em] rounded-[0.5em] border-none font-medium transition-all duration-300 shadow-[2px_2px_3px_rgba(0,0,0,0.7)] hover:shadow-[4px_4px_6px_rgba(0,0,0,0.8)] active:shadow-[1px_1px_2px_rgba(0,0,0,0.9)] disabled:cursor-not-allowed"
      >
        {children}
      </button>
    </div>
  );
}; 