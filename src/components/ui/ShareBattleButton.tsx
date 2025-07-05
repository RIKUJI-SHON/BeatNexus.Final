import React from 'react';
import { Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';

interface ShareBattleButtonProps {
  battleId: string;
  player1Name: string;
  player2Name: string;
  player1UserId: string;
  player2UserId: string;
}

export const ShareBattleButton: React.FC<ShareBattleButtonProps> = ({
  battleId,
  player1Name,
  player2Name,
  player1UserId,
  player2UserId
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();

  const isParticipant = user?.id === player1UserId || user?.id === player2UserId;
  const opponentUsername = isParticipant
    ? user?.id === player1UserId
      ? player2Name
      : player1Name
    : '';

  const isJa = i18n.language.startsWith('ja');

  const handleClick = () => {
    let shareText = '';

    if (isParticipant) {
      shareText = isJa
        ? `BeatNexusでバトル中です！🔥\n対戦相手は ${opponentUsername} さん！\n\n最高のパフォーマンスをしたので、ぜひ見て応援（投票）お願いします！💪\n\n投票はこちらから👇`
        : `I'm in a battle on BeatNexus! 🥊\nFacing off against the incredible ${opponentUsername}.\n\nGave it my all on this one. Check it out and drop a vote if you're feelin' my performance! 🙏\n\nWatch & Vote here 👇`;
    } else {
      const templatesJa = [
        `【🔥BATTLE ALERT🔥】\n${player1Name} 🆚 ${player2Name}\n\nBeatNexusで超ハイレベルなビートボックスバトルが勃発！\n勝敗はあなたの投票で決まる！今すぐジャッジに参加しよう！\n\n🎤 観戦＆投票はこちら👇`,
        `君の一票が勝敗を分ける。\n${player1Name} vs ${player2Name}、究極のビートボックス対決！🔥\n\nどっちのフロウが、スキルが、より心を揺さぶる？\nあなたの耳でジャッジしてください！\n\n🎧 投票ページへ👇`,
      ];
      const templatesEn = [
        `🔥 EPIC BATTLE ALERT 🔥\n${player1Name} 🆚 ${player2Name} are throwing down on BeatNexus!\n\nWho takes the win? YOU decide! This is a must-watch for any beatbox fan.\n\n🎤 Cast your vote now! 👇`,
        `Your vote is the final say. 🎧\n${player1Name} vs ${player2Name} in an insane clash on BeatNexus.\n\nWho's got the better flow, tech, and musicality?\nBe the judge and make your voice heard!\n\nJudge the battle now 👇`,
      ];
      const arr = isJa ? templatesJa : templatesEn;
      shareText = arr[Math.floor(Math.random() * arr.length)];
    }

    const url = `${window.location.origin}/battle-replay/${battleId}`;
    const tags = '#BeatNexus #ビートボックス #Beatbox';
    const taggedTextBase = `${shareText}\n\n${tags}`;
    const MAX_TEXT_LEN = 280 - 24; // URL 23 + space
    let taggedText = taggedTextBase;
    if (taggedText.length > MAX_TEXT_LEN) {
      const excess = taggedText.length - MAX_TEXT_LEN;
      const newShare = shareText.slice(0, Math.max(0, shareText.length - excess - 1)).trimEnd() + '…';
      taggedText = `${newShare}\n\n${tags}`;
    }
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(taggedText)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  return (
    <button
      className="battle-share-button flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
      onClick={handleClick}
    >
      <Share2 className="w-4 h-4" /> {t('battle.matched.share')}
    </button>
  );
}; 