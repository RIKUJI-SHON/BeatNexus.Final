import React from 'react';
import { useTranslation } from 'react-i18next';
import { PasswordStrength, getPasswordStrengthDisplay, getPasswordStrengthWidth } from '../../utils/passwordSecurity';

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ strength }) => {
  const { t } = useTranslation();
  const display = getPasswordStrengthDisplay(strength.level);
  const width = getPasswordStrengthWidth(strength.score);

  return (
    <div className="mt-2 space-y-2">
      {/* プログレスバー */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${display.bgColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
      
      {/* 強度表示 */}
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${display.color}`}>
          {display.icon} {t(`auth.passwordStrength.${strength.level}`)}
        </span>
        <span className="text-xs text-gray-400">
          {strength.score}/100
        </span>
      </div>
      
      {/* フィードバック */}
      {strength.feedback.length > 0 && (
        <div className="text-xs text-gray-400 space-y-1">
          {strength.feedback.map((feedback, index) => (
            <div key={index}>• {feedback}</div>
          ))}
        </div>
      )}
    </div>
  );
};
