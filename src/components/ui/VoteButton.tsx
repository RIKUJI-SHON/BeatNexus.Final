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
    <div className={`vote-button-container ${className}`}>
      <button
        onClick={onClick}
        disabled={disabled}
        className="vote-space-button"
      >
        <span>{children}</span>
        <div className="bright-particles"></div>
      </button>
    </div>
  );
}; 