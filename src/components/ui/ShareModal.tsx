import React, { useState } from 'react';
import { X as Close, Share2, Link as LinkIcon, Clock, Copy } from 'lucide-react';
import { buildPlatformUrl, buildSharePayload, copyToClipboard, SharePlatform, tryNativeShare } from '../../utils/share';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseUrl: string; // 共有対象URL
  text: string; // ベーステキスト
  hashtags?: string[];
}

const PLATFORMS: { key: SharePlatform; label: string; icon: string; }[] = [
  { key: 'x', label: 'X', icon: '𝕏' },
  { key: 'line', label: 'LINE', icon: 'LINE' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'WA' },
  { key: 'telegram', label: 'Telegram', icon: 'TG' },
  { key: 'reddit', label: 'Reddit', icon: 'R' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'in' },
];

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, baseUrl, text, hashtags }) => {
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const payload = buildSharePayload({ text, url: baseUrl, hashtags, timestampSeconds: timestamp ?? undefined });

  const handleCopy = async () => {
    await copyToClipboard(payload.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 w-full md:w-[480px] rounded-t-2xl md:rounded-2xl shadow-xl border border-white/10 p-4 md:p-6 flex flex-col gap-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold"><Share2 className="w-4 h-4" />Share</div>
          <button aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-white transition"><Close className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {PLATFORMS.map(p => {
            const url = buildPlatformUrl(p.key, payload);
            return (
              <button
                key={p.key}
                className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/90"
                onClick={() => window.open(url, '_blank', 'noopener')}
              >
                <span className="text-sm font-bold">{p.icon}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-xs break-all text-white/70 select-all">
            {payload.shareUrl}
          </div>
          <button onClick={handleCopy} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1">
            <Copy className="w-4 h-4" /> {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-white/60">
          <Clock className="w-4 h-4" />
          <span>Timestamp (s)</span>
          <input type="number" min={0} className="bg-white/10 rounded px-2 py-1 w-24 text-white" value={timestamp ?? ''} onChange={e => setTimestamp(e.target.value === '' ? null : Number(e.target.value))} placeholder="120" />
          <button onClick={() => setTimestamp(null)} className="text-white/50 hover:text-white">Reset</button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={async () => {
              const ok = await tryNativeShare(payload);
              if (!ok) {
                await handleCopy();
              }
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >System Share</button>
        </div>
      </div>
      <style>{`.animate-slide-up{animation:su .25s ease;}@keyframes su{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
};
