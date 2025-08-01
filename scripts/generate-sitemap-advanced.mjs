#!/usr/bin/env node
import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SEO設定
const SITE_BASE_URL = 'https://beatnexus.app';
const SITE_OUTPUT_PATH = resolve(__dirname, '../public/sitemap.xml');

// Supabase設定
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qgqcjtjxaoplhxurbpis.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFncWNqdGp4YW9wbGh4dXJicGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTA2MjcsImV4cCI6MjA2Mzc2NjYyN30.ga96XIqzpaMpqCQZ-O47TbZlV42wfkOFe6PzjlyKZoo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 静的ページのサイトマップエントリ
 */
const staticPages = [
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
 * 動的ページを取得
 * アクティブなバトルとアーカイブされたバトルを含める
 */
async function getDynamicPages() {
  const dynamicPages = [];
  
  try {
    // アクティブバトルを取得（最新100件）
    const { data: activeBattles, error: activeBattlesError } = await supabase
      .from('active_battles')
      .select('id, updated_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (activeBattlesError) {
      console.warn('アクティブバトルの取得に失敗:', activeBattlesError.message);
    } else if (activeBattles) {
      activeBattles.forEach(battle => {
        dynamicPages.push({
          url: `/battle/${battle.id}`,
          changefreq: 'daily',
          priority: 0.7,
          lastmod: new Date(battle.updated_at).toISOString().split('T')[0],
          alternateRefs: [
            { href: `${SITE_BASE_URL}/battle/${battle.id}`, hreflang: 'ja' },
            { href: `${SITE_BASE_URL}/battle/${battle.id}`, hreflang: 'en' }
          ]
        });
      });
    }

    // アーカイブバトルを取得（最新500件）
    const { data: archivedBattles, error: archivedBattlesError } = await supabase
      .from('archived_battles')
      .select('id, archived_at')
      .order('archived_at', { ascending: false })
      .limit(500);

    if (archivedBattlesError) {
      console.warn('アーカイブバトルの取得に失敗:', archivedBattlesError.message);
    } else if (archivedBattles) {
      archivedBattles.forEach(battle => {
        dynamicPages.push({
          url: `/archived-battle/${battle.id}`,
          changefreq: 'monthly',
          priority: 0.5,
          lastmod: new Date(battle.archived_at).toISOString().split('T')[0],
          alternateRefs: [
            { href: `${SITE_BASE_URL}/archived-battle/${battle.id}`, hreflang: 'ja' },
            { href: `${SITE_BASE_URL}/archived-battle/${battle.id}`, hreflang: 'en' }
          ]
        });
      });
    }

    // ユーザープロフィール（公開設定のみ、最新100名）
    const { data: publicProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('username, updated_at')
      .eq('is_deleted', false)
      .not('username', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (profilesError) {
      console.warn('プロフィールの取得に失敗:', profilesError.message);
    } else if (publicProfiles) {
      publicProfiles.forEach(profile => {
        dynamicPages.push({
          url: `/user/${profile.username}`,
          changefreq: 'weekly',
          priority: 0.4,
          lastmod: new Date(profile.updated_at).toISOString().split('T')[0],
          alternateRefs: [
            { href: `${SITE_BASE_URL}/user/${profile.username}`, hreflang: 'ja' },
            { href: `${SITE_BASE_URL}/user/${profile.username}`, hreflang: 'en' }
          ]
        });
      });
    }

    // コミュニティページ（最新50個）
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('id, updated_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (communitiesError) {
      console.warn('コミュニティの取得に失敗:', communitiesError.message);
    } else if (communities) {
      communities.forEach(community => {
        dynamicPages.push({
          url: `/community/${community.id}`,
          changefreq: 'daily',
          priority: 0.6,
          lastmod: new Date(community.updated_at).toISOString().split('T')[0],
          alternateRefs: [
            { href: `${SITE_BASE_URL}/community/${community.id}`, hreflang: 'ja' },
            { href: `${SITE_BASE_URL}/community/${community.id}`, hreflang: 'en' }
          ]
        });
      });
    }

    console.log(`🎯 動的ページ取得完了: ${dynamicPages.length}ページ`);
    
  } catch (error) {
    console.error('動的ページ取得エラー:', error);
  }
  
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
    
    console.log(`📄 総ページ数: ${allPages.length} ページを処理中...`);
    
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
      static: staticPages.length,
      dynamic: dynamicPages.length,
      priority1: allPages.filter(p => p.priority === 1.0).length,
      priority08_09: allPages.filter(p => p.priority && p.priority >= 0.8 && p.priority < 1.0).length,
      priority06_07: allPages.filter(p => p.priority && p.priority >= 0.6 && p.priority < 0.8).length,
      priorityLow: allPages.filter(p => p.priority && p.priority < 0.6).length,
    };
    
    console.log('📈 統計情報:');
    console.log(`  - 静的ページ: ${stats.static}ページ`);
    console.log(`  - 動的ページ: ${stats.dynamic}ページ`);
    console.log(`  - 最高優先度 (1.0): ${stats.priority1}ページ`);
    console.log(`  - 高優先度 (0.8-0.9): ${stats.priority08_09}ページ`);
    console.log(`  - 中優先度 (0.6-0.7): ${stats.priority06_07}ページ`);
    console.log(`  - 低優先度 (<0.6): ${stats.priorityLow}ページ`);
    
    console.log('\n🚀 Google Search Consoleでの送信準備完了！');
    console.log(`   サイトマップURL: ${SITE_BASE_URL}/sitemap.xml`);
    
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
