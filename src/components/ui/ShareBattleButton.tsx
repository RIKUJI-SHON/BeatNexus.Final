import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { generateBattleUrl } from '../../utils/battleUrl';
import { ShareModal } from './ShareModal';
import { buildBattleShareText } from '../../utils/share';

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

  const [open, setOpen] = useState(false);
  const battleUrl = generateBattleUrl(player1Name, player2Name, battleId);
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/battle-replay/${battleUrl}`;
  const shareText = buildBattleShareText({
    isParticipant,
    isJa,
    opponentUsername,
    player1Name,
    player2Name
  });

  return (
    <>
      <button
        className="battle-share-button flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
        onClick={() => setOpen(true)}
      >
        <Share2 className="w-4 h-4" /> {t('battle.matched.share')}
      </button>
      <ShareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        baseUrl={url}
        text={shareText}
        hashtags={["BeatNexus", "ビートボックス", "Beatbox"]}
      />
    </>
  );
}; 