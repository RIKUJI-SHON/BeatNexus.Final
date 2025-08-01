#!/usr/bin/env node
import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SEO設定
const SITE_BASE_URL = 'https://beatnexus.app';
const SITE_OUTPUT_PATH = resolve(__dirname, '../public/sitemap.xml');

/**
 * サイトマップエントリの型定義
 */
interface SitemapEntry {
  url: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  lastmod?: string;
  alternateRefs?: Array<{
    href: string;
    hreflang: string;
  }>;
}

/**
 * 静的ページのサイトマップエントリ
 */
const staticPages: SitemapEntry[] = [
  {
    url: '/',
    changefreq: 'daily',
    priority: 1.0,
    lastmod: new Date().toISOString().split('T')[0],
    alternateRefs: [
      { href: `${SITE_BASE_URL}/`, hreflang: 'ja' },
      { href: `${SITE_BASE_URL}/`, hreflang: 'en' }
    ]
  },
  {
    url: '/battles',
    changefreq: 'hourly',
    priority: 0.9,
    lastmod: new Date().toISOString().split('T')[0],
    alternateRefs: [
      { href: `${SITE_BASE_URL}/battles`, hreflang: 'ja' },
      { href: `${SITE_BASE_URL}/battles`, hreflang: 'en' }
    ]
  },
  {
    url: '/ranking',
    changefreq: 'daily',
    priority: 0.8,
    lastmod: new Date().toISOString().split('T')[0],
    alternateRefs: [
      { href: `${SITE_BASE_URL}/ranking`, hreflang: 'ja' },
      { href: `${SITE_BASE_URL}/ranking`, hreflang: 'en' }
    ]
  },
  {
    url: '/forum',
    changefreq: 'hourly',
    priority: 0.7,
    lastmod: new Date().toISOString().split('T')[0],
    alternateRefs: [
      { href: `${SITE_BASE_URL}/forum`, hreflang: 'ja' },
      { href: `${SITE_BASE_URL}/forum`, hreflang: 'en' }
    ]
  },
  {
    url: '/communities',
    changefreq: 'daily',
    priority: 0.7,
    lastmod: new Date().toISOString().split('T')[0],
    alternateRefs: [
      { href: `${SITE_BASE_URL}/communities`, hreflang: 'ja' },
      { href: `${SITE_BASE_URL}/communities`, hreflang: 'en' }
    ]
  },
  {
    url: '/profile',
    changefreq: 'weekly',
    priority: 0.6,
    lastmod: new Date().toISOString().split('T')[0],
    alternateRefs: [
      { href: `${SITE_BASE_URL}/profile`, hreflang: 'ja' },
      { href: `${SITE_BASE_URL}/profile`, hreflang: 'en' }
    ]
  },
  {
    url: '/notifications',
    changefreq: 'daily',
    priority: 0.5,
    lastmod: new Date().toISOString().split('T')[0],
    alternateRefs: [
      { href: `${SITE_BASE_URL}/notifications`, hreflang: 'ja' },
      { href: `${SITE_BASE_URL}/notifications`, hreflang: 'en' }
    ]
  }
];

/**
 * 動的ページ（将来の拡張用）
 * 実際のアプリケーションでは、データベースからバトルID、ユーザーID、コミュニティIDなどを取得
 */
async function getDynamicPages(): Promise<SitemapEntry[]> {
  const dynamicPages: SitemapEntry[] = [];
  
  // TODO: 将来的に以下を実装
  // - バトル詳細ページ: /battle/[id]
  // - ユーザープロフィール: /user/[username]
  // - コミュニティページ: /community/[id]
  // - フォーラム投稿: /forum/post/[id]
  
  // 現在は静的な例を追加（実装時にコメントアウト）
  // dynamicPages.push({
  //   url: '/battle/example-battle-id',
  //   changefreq: 'weekly',
  //   priority: 0.6,
  //   lastmod: new Date().toISOString().split('T')[0],
  // });
  
  return dynamicPages;
}

/**
 * サイトマップ生成メイン関数
 */
async function generateSitemap() {
  try {
    console.log('🗺️ サイトマップ生成を開始...');
    
    // 動的ページを取得
    const dynamicPages = await getDynamicPages();
    
    // 全ページを結合
    const allPages = [...staticPages, ...dynamicPages];
    
    console.log(`📄 ${allPages.length} ページを処理中...`);
    
    // サイトマップストリームを作成
    const sitemap = new SitemapStream({ 
      hostname: SITE_BASE_URL,
      cacheTime: 600000, // 10分間キャッシュ
      xmlns: {
        custom: [
          'http://www.w3.org/1999/xhtml'
        ]
      }
    });
    
    // 書き込みストリームを作成
    const writeStream = createWriteStream(SITE_OUTPUT_PATH);
    sitemap.pipe(writeStream);
    
    // 各ページをサイトマップに追加
    for (const page of allPages) {
      sitemap.write({
        url: page.url,
        changefreq: page.changefreq,
        priority: page.priority,
        lastmod: page.lastmod,
        links: page.alternateRefs
      });
    }
    
    // サイトマップを完了
    sitemap.end();
    
    // 書き込み完了を待機
    await streamToPromise(sitemap);
    
    console.log(`✅ サイトマップが生成されました: ${SITE_OUTPUT_PATH}`);
    console.log(`🌐 URL: ${SITE_BASE_URL}/sitemap.xml`);
    console.log(`📊 総ページ数: ${allPages.length}`);
    
    // 統計情報
    const stats = {
      priority1: allPages.filter(p => p.priority === 1.0).length,
      priority08_09: allPages.filter(p => p.priority && p.priority >= 0.8 && p.priority < 1.0).length,
      priority06_07: allPages.filter(p => p.priority && p.priority >= 0.6 && p.priority < 0.8).length,
      priorityLow: allPages.filter(p => p.priority && p.priority < 0.6).length,
    };
    
    console.log('📈 優先度別統計:');
    console.log(`  - 最高優先度 (1.0): ${stats.priority1}ページ`);
    console.log(`  - 高優先度 (0.8-0.9): ${stats.priority08_09}ページ`);
    console.log(`  - 中優先度 (0.6-0.7): ${stats.priority06_07}ページ`);
    console.log(`  - 低優先度 (<0.6): ${stats.priorityLow}ページ`);
    
  } catch (error) {
    console.error('❌ サイトマップ生成エラー:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap();
}

export { generateSitemap };
