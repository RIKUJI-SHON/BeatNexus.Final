#!/usr/bin/env node

// Supabase SMTP設定確認スクリプト
// このスクリプトは設定確認のガイドです（実際のAPI呼び出しは手動で行います）

console.log('🔧 Supabase SMTP設定確認ガイド');
console.log('=====================================');
console.log('');

console.log('📋 確認すべき設定項目:');
console.log('');

console.log('1. Authentication Settings');
console.log('   ✅ Site URL: http://localhost:3000');
console.log('   ✅ Redirect URLs: http://localhost:3000/reset-password');
console.log('');

console.log('2. SMTP Settings');
console.log('   🔍 Enable custom SMTP: OFF (推奨)');
console.log('   🔍 Enable email confirmations: ON');
console.log('');

console.log('3. Email Templates');  
console.log('   🔍 Reset Password: Enabled');
console.log('   🔍 Template content: {{ .ConfirmationURL }} 含有');
console.log('');

console.log('🚨 緊急対応:');
console.log('1. Supabaseダッシュボードを開く');
console.log('   https://supabase.com/dashboard/project/wdttluticnlqzmqmfvgt/settings/auth');
console.log('');
console.log('2. SMTP Settings > Enable custom SMTP: OFF に設定');
console.log('3. Save をクリック');
console.log('4. 10-15分待機');
console.log('5. 診断ツールで再テスト');
console.log('');

console.log('💡 開発環境では Supabase デフォルトSMTP が最も安定して動作します');

export default {};
