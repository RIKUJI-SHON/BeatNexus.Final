/**
 * iOS互換動画URL変換マッピング
 * 標準URLからiOS最適化URLへの変換テーブル
 */

export interface VideoUrlMapping {
  standard: string;
  iosCompat: string;
  description?: string;
}

// iOS互換URLマッピング
export const iosVideoMappings: VideoUrlMapping[] = [
  {
    standard: 'https://qgqcjtjxaoplhxurbpis.supabase.co/storage/v1/object/public/videos/d3507fc4-3d83-42e5-ae31-41fbff43c287/3442594c-1a35-4703-9c46-eb541071a4b3.mp4',
    iosCompat: 'https://qgqcjtjxaoplhxurbpis.supabase.co/storage/v1/object/public/videos/d3507fc4-3d83-42e5-ae31-41fbff43c287/3442594c-1a35-4703-9c46-eb541071a4b3_ios.mp4',
    description: 'vid1 - baseline profile, level 3.0, fragmented MP4'
  },
  {
    standard: 'https://qgqcjtjxaoplhxurbpis.supabase.co/storage/v1/object/public/videos/a5ebc610-c03b-485f-be01-8566a9de83c4/3cd48825-0ee1-46ad-9c8a-85121b164f31.mp4',
    iosCompat: 'https://qgqcjtjxaoplhxurbpis.supabase.co/storage/v1/object/public/videos/a5ebc610-c03b-485f-be01-8566a9de83c4/3cd48825-0ee1-46ad-9c8a-85121b164f31_ios.mp4',
    description: 'vid2 - baseline profile, level 3.0, 960x540, rotation fixed'
  }
];

/**
 * 標準URLからiOS互換URLを取得
 * @param standardUrl 標準動画URL
 * @returns iOS互換URL（見つからない場合はundefined）
 */
export function getIOSCompatibleUrl(standardUrl: string): string | undefined {
  // クエリパラメータを除去して正規化
  const normalizedUrl = standardUrl.split('?')[0];
  
  const mapping = iosVideoMappings.find(m => 
    m.standard.split('?')[0] === normalizedUrl
  );
  
  return mapping?.iosCompat;
}

/**
 * URLがiOS互換性チェック対象かどうかを判定
 * @param url 確認するURL
 * @returns iOS互換性チェックが必要な場合true
 */
export function requiresIOSCompatCheck(url: string): boolean {
  const normalizedUrl = url.split('?')[0];
  return iosVideoMappings.some(m => 
    m.standard.split('?')[0] === normalizedUrl
  );
}

/**
 * iOS環境向けの最適URL取得
 * @param standardUrl 標準URL
 * @returns iOS環境で使用すべきURL
 */
export function getOptimalUrlForIOS(standardUrl: string): string {
  const iosUrl = getIOSCompatibleUrl(standardUrl);
  return iosUrl || standardUrl;
}
