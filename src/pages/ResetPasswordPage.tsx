import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from '../components/auth/AuthModal';
import SupabaseAuthDebugger from '../components/debug/SupabaseAuthDebugger';
import { supabase } from '../lib/supabase';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetTokens, setResetTokens] = useState<{ accessToken: string; refreshToken: string } | null>(null);

  // **新方式**: token_hashを使用してverifyOtpでセッション確立
  const handleTokenHashVerification = useCallback(async (tokenHash: string) => {
    try {
      console.log('🔐 Verifying token_hash with Supabase...');
      
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery'
      });

      if (error) {
        console.error('❌ Token verification failed:', error);
        alert(`トークンの検証に失敗しました: ${error.message}\n\n新しいパスワードリセットを申請してください。`);
        navigate('/');
        return;
      }

      if (data.session) {
        console.log('✅ Token verified, session established');
        console.log('🔄 Storing session tokens for password reset');
        
        // セッションからトークンを取得してresetTokensに設定
        setResetTokens({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token
        });
        
        // パスワード設定モーダルを表示
        setIsModalOpen(true);
      } else {
        console.error('❌ No session returned from token verification');
        alert('セッションの確立に失敗しました。新しいパスワードリセットを申請してください。');
        navigate('/');
      }
    } catch (error) {
      console.error('❌ Error during token verification:', error);
      alert('認証処理中にエラーが発生しました。新しいパスワードリセットを申請してください。');
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    // デバッグ: 完全なURL情報を表示
    console.log('=== RESET PASSWORD PAGE DEBUG ===');
    console.log('Full URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    console.log('Search:', window.location.search);
    console.log('Pathname:', window.location.pathname);
    
    // URLハッシュからSupabaseセッション情報を抽出（従来の方式）
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    // **新方式**: 直接リンクのtoken_hashを確認
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    
    // ハッシュパラメータも確認（従来の方式との互換性維持）
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const hashType = hashParams.get('type');
    
    console.log('🔗 Direct link params:', { tokenHash: !!tokenHash, type });
    console.log('🔗 Hash params (legacy):', { hashType, accessToken: !!accessToken, refreshToken: !!refreshToken });
    console.log('All search keys:', Array.from(searchParams.keys()));
    console.log('All hash keys:', Array.from(hashParams.keys()));

    // **重要**: URLが /reset-password でない場合は処理しない
    if (window.location.pathname !== '/reset-password') {
      console.log('🚫 Not on reset-password page, skipping token extraction');
      return;
    }

    // **優先順位1**: 新方式（直接リンク with token_hash）
    if (type === 'recovery' && tokenHash) {
      console.log('✅ Direct link detected with token_hash');
      console.log('🔄 Using verifyOtp method for token verification');
      
      handleTokenHashVerification(tokenHash);
      return;
    }

    // **優先順位2**: 従来方式（ハッシュフラグメント）
    if (hashType === 'recovery' && accessToken && refreshToken) {
      console.log('✅ Legacy hash format detected');
      console.log('🔄 Storing tokens for password reset (NOT logging in yet)');
      
      setResetTokens({
        accessToken,
        refreshToken
      });
      
      setIsModalOpen(true);
      return;
    }

    // **エラーケース**: reset-passwordページにいるが、有効なトークンがない
    console.warn('❌ On reset-password page but no valid tokens found');
    console.warn('Expected: ?token_hash=...&type=recovery OR #access_token=...&refresh_token=...&type=recovery');
    console.warn('Received:', { 
      searchType: type, 
      hasTokenHash: !!tokenHash,
      hashType,
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken 
    });
    
    // **緊急回避策**: ホームページ（/）に移動してハッシュフラグメントをチェック
    if (window.location.pathname === '/reset-password' && !tokenHash && !accessToken) {
      console.log('🔄 Checking if user came from old-style Supabase redirect...');
      console.log('🔄 Redirecting to home page to check for hash fragments...');
      
      // ホームページにリダイレクトして、ハッシュフラグメントの処理を試みる
      window.location.href = '/';
      return;
    }
    
    // **一時的な解決**: メールテンプレート更新までの間、より詳細な情報を表示
    console.warn('🔍 This might be due to email template not being updated yet');
    console.warn('🔍 Check if Supabase email template uses {{ .TokenHash }} instead of {{ .ConfirmationURL }}');
    
    alert(`パスワードリセットリンクが無効か期限切れです。\n\n原因の可能性:\n1. リンクが期限切れ\n2. メールテンプレートがまだ更新されていない\n\n新しいパスワードリセットを申請してください。\n\n3秒後にホームページに戻ります。`);
    setTimeout(() => navigate('/'), 3000);
  }, [navigate, handleTokenHashVerification]);

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
