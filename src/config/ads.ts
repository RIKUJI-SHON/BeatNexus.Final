// ads.ts
// 広告フロントエンド統一設定 / レジストリ
// 現在 2025-08-21 時点では配信・計測基盤サスペンド中のため
// デフォルトで ADS_SUSPENDED=true としネットワーク呼び出しを抑止する。

interface ImportMetaEnvAds {
  VITE_ADS_TRACKING_SUSPENDED?: string; // 計測のみ停止
  VITE_ADS_DELIVERY_DISABLED?: string; // 配信そのものを無効 (通常 false)
}
const envAds = (import.meta as unknown as { env: ImportMetaEnvAds }).env;

// 計測サスペンド (デフォルト true): impression / click 送信を行わない
export const ADS_TRACKING_SUSPENDED: boolean = envAds.VITE_ADS_TRACKING_SUSPENDED
  ? envAds.VITE_ADS_TRACKING_SUSPENDED === 'true'
  : true;

// 配信完全無効 (デフォルト false)。true の場合は広告自体を表示しない (fallback/空)。
export const ADS_DELIVERY_DISABLED: boolean = envAds.VITE_ADS_DELIVERY_DISABLED
  ? envAds.VITE_ADS_DELIVERY_DISABLED === 'true'
  : false;

// 公式 placement レジストリ (要件定義 27.1 / 27.2 より抜粋)
// active=false のものはまだ UI に挿入しない。variant はレイアウト指標。
export const AD_PLACEMENTS = {
  'home.features.mid.inline': { variant: 'inline', active: true, description: 'Home HowItWorks→Features 間 Inline' },
  'home.latest.before-list.infeed': { variant: 'infeed', active: true, description: 'Home LatestBattles 手前 InFeed' },
  'battles.list.after-3.infeed': { variant: 'infeed', active: true, description: 'Battles 一覧 3件後 InFeed' },
  'battles.list.after-10.infeed': { variant: 'infeed', active: true, description: 'Battles 一覧 10件後 InFeed 深部' },
  'ranking.top.banner': { variant: 'banner', active: true, description: 'Ranking トップポディウム直下 Banner' },
  'ranking.list.after-5.infeed': { variant: 'infeed', active: true, description: 'Ranking 5位後 InFeed' },
  'battles.archived.after-3.infeed': { variant: 'infeed', active: true, description: 'ArchivedBattles 一覧 3件後 InFeed' },
  'battles.archived.after-6.infeed': { variant: 'infeed', active: true, description: 'ArchivedBattles 一覧 6件後 InFeed' },
  'battles.archived.after-9.infeed': { variant: 'infeed', active: true, description: 'ArchivedBattles 一覧 9件後 InFeed' },
  // 追加候補 (第2フェーズ) - active false
  'battles.sidebar.ranking-bottom.card': { variant: 'sidebar', active: false, description: 'Battles サイドバー下部 SidebarPromo' },
  'battles.carousel.after-4.card': { variant: 'carousel', active: false, description: 'Battles NewsCarousel 4枚目後 Carousel' },
  'profile.activity.after-2.infeed': { variant: 'infeed', active: false, description: 'Profile アクティビティ2件後 InFeed' },
  'battleview.comments.top.inline': { variant: 'inline', active: false, description: 'BattleView コメント上 Inline' }
} as const;

export type AdPlacementKey = keyof typeof AD_PLACEMENTS;

export function isAdPlacementKey(v: string): v is AdPlacementKey {
  return v in AD_PLACEMENTS;
}

// 静的クリエイティブオーバーライド: DB / Edge 未復活でも表示したい固定広告をここへ。
// placementKey ごとに 1 件表示 (ローテーション不要な最小構成)
// 本番で実広告を表示したい場合、ここにスポンサー素材を追加しコミット (一時策)。
// ※ データベースから動的取得を優先するため、現在は空に設定
export const STATIC_AD_OVERRIDES: Partial<Record<AdPlacementKey, {
  id: string; // 一意 (例: 'static-xyz')
  headline?: string;
  body?: string;
  cta_text?: string;
  target_url?: string;
  file_url?: string; // 画像など (オプション)
}>> = {
  // データベースからの動的取得を優先するため、静的オーバーライドを無効化
  // 必要に応じて特定の配置のみ静的設定を復活可能
};
