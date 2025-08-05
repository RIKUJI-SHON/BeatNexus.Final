// Supabaseパスワードリセット機能テストスクリプト
// このスクリプトでSupabaseの設定を確認します

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdttluticnlqzmqmfvgt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkdHRsdXRpY25scXptcW1mdmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MzA5NzYsImV4cCI6MjA2MzMwNjk3Nn0.wzvwpAePsYnMzgMmXMraTmRi_mEun1g6uxeDzBFyUiM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// パスワードリセットテスト関数
async function testPasswordReset() {
  console.log('🔧 Supabaseパスワードリセット機能テスト開始...');
  
  // テスト用メールアドレス（実際のメールアドレスに変更してください）
  const testEmail = 'your-test-email@example.com';
  
  try {
    console.log(`📧 リセットメール送信テスト: ${testEmail}`);
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'http://localhost:5173/reset-password'
    });
    
    if (error) {
      console.error('❌ パスワードリセットエラー:', error);
      console.error('エラーメッセージ:', error.message);
      console.error('エラーコード:', error.status);
      
      // 一般的なエラーパターンの診断
      if (error.message.includes('rate limit')) {
        console.log('💡 診断: レート制限に達しています。しばらく待ってから再試行してください。');
      } else if (error.message.includes('SMTP')) {
        console.log('💡 診断: SMTP設定に問題があります。Supabaseダッシュボードでメール設定を確認してください。');
      } else if (error.message.includes('template')) {
        console.log('💡 診断: メールテンプレートに問題があります。');
      } else {
        console.log('💡 診断: その他の設定問題の可能性があります。');
      }
      
      return false;
    }
    
    console.log('✅ リセットメール送信要求が成功しました');
    console.log('データ:', data);
    console.log('📬 メールボックスを確認してください（スパムフォルダも含む）');
    
    return true;
    
  } catch (error) {
    console.error('💥 予期しないエラー:', error);
    return false;
  }
}

// 設定確認関数
async function checkSupabaseConfig() {
  console.log('🔍 Supabase設定確認...');
  console.log('URL:', supabaseUrl);
  console.log('プロジェクトID: wdttluticnlqzmqmfvgt');
  
  // セッション状態確認
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ セッション取得エラー:', error);
  } else {
    console.log('✅ Supabaseクライアント接続OK');
    console.log('現在のセッション:', session ? 'あり' : 'なし');
  }
}

// メイン実行
async function main() {
  await checkSupabaseConfig();
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('⚠️  重要: testEmail変数を実際のメールアドレスに変更してからテストしてください');
  console.log('📝 このスクリプトを実行する前に、以下を確認してください:');
  console.log('1. Supabaseダッシュボード > Authentication > Settings');
  console.log('2. Site URL: http://localhost:5173');
  console.log('3. Redirect URLs: http://localhost:5173/reset-password');
  console.log('4. Email Templates > Reset Password が有効');
  console.log('\n');
  
  // await testPasswordReset();
}

main().catch(console.error);

export { testPasswordReset, checkSupabaseConfig };
