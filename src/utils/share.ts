// docs/BeatNexus.md 参照: 共有機能集約ユーティリティ
// Phase 1: Web Share API + X + Copy Link
// Phase 2: 主要SNS(Line/WhatsApp/Telegram/Reddit/LinkedIn) + timestamp option

export type SharePlatform =
  | 'x'
  | 'line'
  | 'whatsapp'
  | 'telegram'
  | 'reddit'
  | 'linkedin';

export interface BuildShareOptions {
  text: string;
  url: string;
  hashtags?: string[];
  timestampSeconds?: number; // 秒単位 timestamp 付与 (t=)
}

export interface BuiltSharePayload {
  finalText: string;
  shareUrl: string;
  truncatedForX: string;
}

const X_MAX = 280;
const X_URL_RESERVED = 24; // URL 23 + space

export function buildSharePayload(opts: BuildShareOptions): BuiltSharePayload {
  const { text, url, hashtags = [], timestampSeconds } = opts;
  const urlWithTs = typeof timestampSeconds === 'number' && timestampSeconds >= 0
    ? appendTimestamp(url, timestampSeconds)
    : url;
  const tagStr = hashtags.length ? '\n\n' + hashtags.map(h => (h.startsWith('#') ? h : '#' + h)).join(' ') : '';
  const base = `${text}${tagStr}`;
  const maxTextLen = X_MAX - X_URL_RESERVED;
  let truncated = base;
  if (truncated.length > maxTextLen) {
    const excess = truncated.length - maxTextLen;
    truncated = text.slice(0, Math.max(0, text.length - excess - 1)).trimEnd() + '…' + tagStr;
  }
  return { finalText: base, shareUrl: urlWithTs, truncatedForX: truncated };
}

export function appendTimestamp(url: string, seconds: number): string {
  const u = new URL(url, window.location.origin);
  u.searchParams.set('t', Math.floor(seconds).toString());
  return u.toString();
}

export function buildPlatformUrl(platform: SharePlatform, payload: BuiltSharePayload): string {
  const { truncatedForX, shareUrl, finalText } = payload;
  switch (platform) {
    case 'x':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(truncatedForX)}&url=${encodeURIComponent(shareUrl)}`;
    case 'line':
      return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;
    case 'whatsapp':
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(finalText + '\n' + shareUrl)}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(finalText)}`;
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(finalText.split('\n')[0] || 'BeatNexus Battle')}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    default:
      return shareUrl;
  }
}

export async function tryNativeShare(payload: BuiltSharePayload): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'BeatNexus', text: payload.finalText, url: payload.shareUrl });
      return true;
    } catch {
      return false; // user cancel or failure -> fallback
    }
  }
  return false;
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.resolve();
}

export interface BattleShareContext {
  isParticipant: boolean;
  isJa: boolean;
  opponentUsername?: string;
  player1Name: string;
  player2Name: string;
}

export function buildBattleShareText(ctx: BattleShareContext): string {
  const { isParticipant, isJa, opponentUsername, player1Name, player2Name } = ctx;
  if (isParticipant) {
    return isJa
      ? `BeatNexusでバトル中です！🔥\n対戦相手は ${opponentUsername} さん！\n\n最高のパフォーマンスをしたので、ぜひ見て応援（投票）お願いします！💪\n\n投票はこちらから👇`
      : `I'm in a battle on BeatNexus! 🥊\nFacing off against the incredible ${opponentUsername}.\n\nGave it my all on this one. Check it out and drop a vote if you're feelin' my performance! 🙏\n\nWatch & Vote here 👇`;
  }
  if (isJa) {
    const templates = [
      `【🔥BATTLE ALERT🔥】\n${player1Name} 🆚 ${player2Name}\n\nBeatNexusで超ハイレベルなビートボックスバトルが勃発！\n勝敗はあなたの投票で決まる！今すぐジャッジに参加しよう！\n\n🎤 観戦＆投票はこちら👇`,
      `君の一票が勝敗を分ける。\n${player1Name} vs ${player2Name}、究極のビートボックス対決！🔥\n\nどっちのフロウが、スキルが、より心を揺さぶる？\nあなたの耳でジャッジしてください！\n\n🎧 投票ページへ👇`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  const templates = [
    `🔥 EPIC BATTLE ALERT 🔥\n${player1Name} 🆚 ${player2Name} are throwing down on BeatNexus!\n\nWho takes the win? YOU decide! This is a must-watch for any beatbox fan.\n\n🎤 Cast your vote now! 👇`,
    `Your vote is the final say. 🎧\n${player1Name} vs ${player2Name} in an insane clash on BeatNexus.\n\nWho's got the better flow, tech, and musicality?\nBe the judge and make your voice heard!\n\nJudge the battle now 👇`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}
