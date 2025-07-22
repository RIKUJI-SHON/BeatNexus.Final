import React from 'react';
import { Medal, Shield, Trophy } from 'lucide-react';

interface EmptyCollectionStateProps {
  type?: 'all' | 'badges' | 'frames';
  className?: string;
}

const EmptyCollectionState: React.FC<EmptyCollectionStateProps> = ({
  type = 'all',
  className = ''
}) => {
  const getEmptyStateContent = () => {
    switch (type) {
      case 'badges':
        return {
          icon: Medal,
          title: 'バッジがありません',
          description: 'シーズンでのランキング達成でバッジを獲得できます',
          tip: 'ランキング上位入賞でレアなバッジをゲット！'
        };
      case 'frames':
        return {
          icon: Shield,
          title: 'フレームがありません',
          description: 'プロフィール画像を装飾するフレームがまだありません',
          tip: '特別な成績を収めてオリジナルフレームを獲得しよう！'
        };
      default:
        return {
          icon: Trophy,
          title: 'コレクションが空です',
          description: 'シーズンでの活躍により、バッジやフレームを獲得できます',
          tip: 'バトルで勝利を重ねて、限定アイテムをコレクションしよう！'
        };
    }
  };

  const { icon: Icon, title, description, tip } = getEmptyStateContent();

  return (
    <div className={`
      flex flex-col items-center justify-center
      py-16 px-8 text-center
      bg-gradient-to-br from-slate-800/40 to-slate-700/30
      rounded-xl border border-slate-600/30
      ${className}
    `}>
      {/* アイコン */}
      <div className="relative mb-6">
        <div className="w-24 h-24 bg-gradient-to-br from-slate-700/60 to-slate-600/40 rounded-2xl flex items-center justify-center border border-slate-500/30">
          <Icon className="w-12 h-12 text-slate-400" />
        </div>
        
        {/* 装飾的なグロー効果 */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/10 rounded-2xl blur-xl opacity-50" />
      </div>

      {/* メッセージ */}
      <div className="space-y-4 max-w-md">
        <h3 className="text-xl font-semibold text-slate-200">
          {title}
        </h3>
        
        <p className="text-slate-400 text-sm leading-relaxed">
          {description}
        </p>
        
        {/* ヒント */}
        <div className="mt-6 p-4 bg-slate-800/60 rounded-lg border border-slate-600/40">
          <p className="text-cyan-300 text-xs font-medium flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4" />
            {tip}
          </p>
        </div>
      </div>

      {/* 装飾的なパーティクル */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400/20 rounded-full animate-pulse" />
        <div className="absolute top-20 right-16 w-1 h-1 bg-purple-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-16 left-20 w-1.5 h-1.5 bg-amber-400/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-10 right-10 w-2 h-2 bg-pink-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
    </div>
  );
};

export default EmptyCollectionState;
