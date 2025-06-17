import React from 'react';

interface VoteButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const VoteButton: React.FC<VoteButtonProps> = ({ 
  onClick, 
  disabled = false, 
  children, 
  className = '' 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        vote-btn
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <div id="container-stars">
        <div id="stars"></div>
      </div>
      
      <div id="glow">
        <div className="circle"></div>
        <div className="circle"></div>
      </div>
      
      <strong>{children}</strong>
    </button>
  );
}; 