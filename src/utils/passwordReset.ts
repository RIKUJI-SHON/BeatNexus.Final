import { supabase } from '../lib/supabase';

// 開発環境用のパスワードリセットテスト関数
// AuthModalやHomePage等で使用可能

export const sendPasswordReset = async (email: string) => {
  const isDevelopment = window.location.hostname === 'localhost';
  const redirectUrl = isDevelopment 
    ? 'http://localhost:3000/reset-password'
    : 'https://beatnexus.app/reset-password';

  console.log(`🔄 Sending password reset to: ${email}`);
  console.log(`🔄 Using redirect URL: ${redirectUrl}`);

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl
  });

  if (error) {
    console.error('❌ Password reset failed:', error);
    throw error;
  }

  console.log('✅ Password reset email sent successfully');
  return data;
};
