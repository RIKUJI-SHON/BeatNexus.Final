// BeatNexus 環境別SMTP設定管理

/**
 * 開発環境と本番環境で異なるSMTP設定を管理
 * Resendドメイン制限を考慮した設定分離
 */

// 環境別設定
const SMTP_CONFIG = {
  development: {
    // 開発環境: Supabaseデフォルト使用（Resendドメイン制限回避）
    useSupabaseDefault: true,
    customSMTP: false,
    redirectDomain: 'http://localhost:3000',
    notes: 'Resendでlocalhost:3000が許可されていないため、Supabaseデフォルト使用'
  },
  
  production: {
    // 本番環境: Resend CustomSMTP使用
    useSupabaseDefault: false,
    customSMTP: true,
    redirectDomain: 'https://beatnexus.app',
    smtpSettings: {
      host: 'smtp.resend.com',
      port: 587,
      user: 'resend',
      // password: 'RESEND_API_KEY', // 環境変数で管理
      sender: 'noreply@beatnexus.app'
    },
    notes: 'Resendでbeatnexus.appドメインが設定済み'
  }
};

// Supabaseダッシュボード設定推奨値
const SUPABASE_SETTINGS = {
  development: {
    siteUrl: 'http://localhost:3000',
    redirectUrls: ['http://localhost:3000/reset-password'],
    enableCustomSMTP: false, // 重要: OFFに設定
    enableEmailConfirmations: true
  },
  
  production: {
    siteUrl: 'https://beatnexus.app',
    redirectUrls: ['https://beatnexus.app/reset-password'],
    enableCustomSMTP: true, // 本番ではResend使用
    enableEmailConfirmations: true
  }
};

// Resend必要設定
const RESEND_REQUIREMENTS = {
  domains: {
    verified: ['beatnexus.app'], // 現在設定済み
    needed: ['localhost'], // 開発環境で必要（オプション）
  },
  
  apiKeys: {
    development: 'RESEND_DEV_API_KEY', // 開発用（使わない場合は不要）
    production: 'RESEND_PROD_API_KEY'  // 本番用
  },
  
  notes: {
    development: 'localhostドメインはResendで追加困難。Supabaseデフォルト推奨',
    production: 'beatnexus.appドメインは設定済み。CustomSMTP使用可能'
  }
};

console.log('🔧 BeatNexus SMTP設定ガイド');
console.log('=====================================');
console.log('');
console.log('💡 問題解決のアプローチ:');
console.log('1. 開発環境: Supabaseデフォルト使用 (Enable custom SMTP: OFF)');
console.log('2. 本番環境: Resend CustomSMTP使用 (Enable custom SMTP: ON)');
console.log('');
console.log('📋 開発環境での即座の解決:');
console.log('- Supabaseダッシュボード > SMTP Settings');
console.log('- Enable custom SMTP: OFF');
console.log('- Save & 10分待機');
console.log('');
console.log('🚀 本番環境は現在の設定のまま動作します');

export { SMTP_CONFIG, SUPABASE_SETTINGS, RESEND_REQUIREMENTS };
