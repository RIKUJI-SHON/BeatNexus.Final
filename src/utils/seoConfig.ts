/**
 * SEO設定の定数
 * 全てのSEO関連設定を統一管理
 */

// 本番・開発環境のドメイン設定
export const SEO_CONFIG = {
  // 本番ドメイン（常にこれを使用）
  CANONICAL_DOMAIN: 'https://beatnexus.app',
  
  // 旧Vercelドメイン（リダイレクト対象）
  VERCEL_DOMAIN: 'https://beatnexus.vercel.app',
  
  // デフォルトメタタグ
  DEFAULT_TITLE: 'BeatNexus - Beatbox Battle Community',
  DEFAULT_DESCRIPTION: 'ビートボクサーのための競技プラットフォーム。動画投稿、自動マッチング、コミュニティ投票でバトルを楽しもう！',
  DEFAULT_KEYWORDS: 'beatbox, battle, community, music, competition, ビートボックス, バトル, コミュニティ',
  DEFAULT_AUTHOR: 'BeatNexus Team',
  
  // OGP画像パス
  OG_IMAGE_PATH: '/images/OGP.png',
  
  // Twitter設定
  TWITTER_SITE: '@beatnexus_app', // 将来的にTwitterアカウントを作成した場合
} as const;

/**
 * 正規化されたURLを生成する関数
 * @param path - パス（例: '/', '/battles', '/ranking'）
 * @returns 正規化されたURL
 */
export function getCanonicalUrl(path: string = '/'): string {
  // パスが/で始まっていない場合は追加
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${SEO_CONFIG.CANONICAL_DOMAIN}${normalizedPath}`;
}

/**
 * OGP画像の完全URLを生成する関数
 * @param imagePath - 画像パス（オプション、デフォルトはOG_IMAGE_PATH）
 * @returns OGP画像の完全URL
 */
export function getOgImageUrl(imagePath?: string): string {
  const path = imagePath || SEO_CONFIG.OG_IMAGE_PATH;
  return `${SEO_CONFIG.CANONICAL_DOMAIN}${path}`;
}

/**
 * 現在のドメインが本番ドメインかどうかを判定
 * @returns 本番ドメインの場合true
 */
export function isCanonicalDomain(): boolean {
  if (typeof window === 'undefined') return true; // SSR環境では本番として扱う
  
  const currentOrigin = window.location.origin;
  return currentOrigin === SEO_CONFIG.CANONICAL_DOMAIN;
}

/**
 * VercelプレビューURLかどうかを判定
 * @returns Vercelプレビューの場合true
 */
export function isVercelPreview(): boolean {
  if (typeof window === 'undefined') return false;
  
  const currentHost = window.location.hostname;
  return currentHost.includes('vercel.app');
}
