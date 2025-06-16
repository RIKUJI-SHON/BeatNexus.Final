import React from 'react';

interface Button3DProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export const Button3D: React.FC<Button3DProps> = ({ 
  children, 
  onClick, 
  disabled = false, 
  className = '',
  variant = 'primary'
}) => {
  const buttonId = `button3d-${Math.random().toString(36).substr(2, 9)}`;

  const primaryGradient = 'linear-gradient(145deg, #6a11cb, #2575fc)';
  const primaryActiveGradient = 'linear-gradient(145deg, #2575fc, #6a11cb)';
  const secondaryGradient = 'linear-gradient(145deg, #6b7280, #4b5563)';
  const secondaryActiveGradient = 'linear-gradient(145deg, #4b5563, #6b7280)';

  const gradient = variant === 'primary' ? primaryGradient : secondaryGradient;
  const activeGradient = variant === 'primary' ? primaryActiveGradient : secondaryActiveGradient;

  return (
    <>
      <style>{`
        .button-3d-${buttonId} {
          -webkit-appearance: none;
          appearance: none;
          position: relative;
          border-width: 0;
          padding: 0 8px;
          min-width: 4em;
          min-height: 4em;
          box-sizing: border-box;
          background: transparent;
          font: inherit;
          cursor: pointer;
          margin: 10px;
          border-radius: 20px;
          ${disabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}
        }

        .button-top-${buttonId} {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
          padding: 8px 16px;
          transform: translateY(0);
          color: #fff;
          background-image: ${gradient};
          text-shadow: 0 -1px rgba(0, 0, 0, 0.25);
          border-radius: 20px;
          transition: transform 0.3s, border-radius 0.3s, background 0.3s;
        }

        .button-3d-${buttonId}:active .button-top-${buttonId} {
          border-radius: 10px 10px 8px 8px / 8px;
          transform: translateY(2px);
          background-image: ${activeGradient};
        }

        .button-bottom-${buttonId} {
          position: absolute;
          z-index: 1;
          bottom: 4px;
          left: 4px;
          border-radius: 20px;
          padding-top: 6px;
          width: calc(100% - 8px);
          height: calc(100% - 10px);
          background-image: ${gradient};
          box-shadow: 0px 2px 3px 0px rgba(0, 0, 0, 0.5);
          transition: border-radius 0.2s, padding-top 0.2s;
        }

        .button-base-${buttonId} {
          position: absolute;
          z-index: 0;
          top: 4px;
          left: 0;
          border-radius: 20px;
          width: 100%;
          height: calc(100% - 4px);
          background-color: rgba(0, 0, 0, 0.15);
          box-shadow: 0 1px 1px 0 rgba(255, 255, 255, 0.75),
            inset 0 2px 2px rgba(0, 0, 0, 0.25);
          transition: border-radius 0.2s, padding-top 0.2s;
        }

        .button-3d-${buttonId}:active .button-bottom-${buttonId} {
          border-radius: 10px 10px 8px 8px / 8px;
          padding-top: 0;
        }

        .button-3d-${buttonId}:active .button-base-${buttonId} {
          border-radius: 10px 10px 8px 8px / 8px;
        }
      `}</style>
      
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`button-3d-${buttonId} ${className}`}
      >
        <div className={`button-base-${buttonId}`} />
        <div className={`button-bottom-${buttonId}`} />
        <div className={`button-top-${buttonId}`}>
          {children}
        </div>
      </button>
    </>
  );
}; 