import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from '../components/auth/AuthModal';
import SupabaseAuthDebugger from '../components/debug/SupabaseAuthDebugger';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetTokens, setResetTokens] = useState<{ accessToken: string; refreshToken: string } | null>(null);

  useEffect(() => {
    // デバッグ: 完全なURL情報を表示
    console.log('=== RESET PASSWORD PAGE DEBUG ===');
    console.log('Full URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    console.log('Search:', window.location.search);
    console.log('Pathname:', window.location.pathname);
    
    // URLハッシュからSupabaseセッション情報を抽出
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    // ハッシュパラメータを確認
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    
    // サーチパラメータも確認（Supabaseが異なる方法で送信する可能性）
    const searchAccessToken = searchParams.get('access_token');
    const searchRefreshToken = searchParams.get('refresh_token');
    const searchType = searchParams.get('type');
    
    console.log('Hash params:', { type, accessToken: !!accessToken, refreshToken: !!refreshToken });
    console.log('Search params:', { searchType, searchAccessToken: !!searchAccessToken, searchRefreshToken: !!searchRefreshToken });
    console.log('All hash keys:', Array.from(hashParams.keys()));
    console.log('All search keys:', Array.from(searchParams.keys()));

    // **重要**: URLが /reset-password でない場合は処理しない（他のページからの誤判定を防ぐ）
    if (window.location.pathname !== '/reset-password') {
      console.log('🚫 Not on reset-password page, skipping token extraction');
      return;
    }

    // ハッシュまたはサーチパラメータからトークンを取得
    const finalAccessToken = accessToken || searchAccessToken;
    const finalRefreshToken = refreshToken || searchRefreshToken;
    const finalType = type || searchType;

    // **改善**: トークンがない場合でも、reset-passwordページにいる場合はモーダルを表示
    if (finalType === 'recovery' && finalAccessToken && finalRefreshToken) {
      console.log('✅ Valid recovery link detected');
      console.log('🔄 Storing tokens for password reset (NOT logging in yet)');
      
      // トークンを一時保存（セッションは設定しない）
      setResetTokens({
        accessToken: finalAccessToken,
        refreshToken: finalRefreshToken
      });
      
      // パスワード設定モーダルを表示
      setIsModalOpen(true);
    } else if (window.location.pathname === '/reset-password') {
      // /reset-password にアクセスしているが、トークンがない/無効な場合
      console.warn('❌ On reset-password page but tokens are missing or invalid');
      console.warn('This might indicate a configuration issue with Supabase redirect URLs');
      console.warn('Expected: type=recovery with access_token and refresh_token');
      console.warn('Received:', { finalType, hasAccessToken: !!finalAccessToken, hasRefreshToken: !!finalRefreshToken });
      
      // ユーザーにわかりやすいメッセージを表示
      alert(`パスワードリセットリンクが無効か期限切れです。\n\n詳細情報をコンソールで確認してください。\n\n3秒後にホームページに戻ります。`);
      setTimeout(() => navigate('/'), 3000);
    }
  }, [navigate]);

  const handleClose = () => {
    setIsModalOpen(false);
    // パスワードリセットをキャンセルした場合はホームに戻る
    navigate('/');
  };

  const handlePasswordResetComplete = () => {
    setIsModalOpen(false);
    // パスワードリセット完了後はダッシュボードに移動
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* デバッグ用 - 開発環境でのみ表示 */}
      <SupabaseAuthDebugger 
        onTokensDetected={(tokens) => {
          console.log('🎯 Tokens detected by debugger:', tokens);
          setResetTokens(tokens);
          setIsModalOpen(true);
        }}
      />
      
      <AuthModal
        isOpen={isModalOpen}
        onClose={handleClose}
        initialMode="setNewPassword"
        resetTokens={resetTokens} // トークンをAuthModalに渡す
        onPasswordResetComplete={handlePasswordResetComplete}
      />
    </div>
  );
};

export default ResetPasswordPage;
