import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from '../components/auth/AuthModal';
import { supabase } from '../lib/supabase';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'resetPassword' | 'setNewPassword'>('setNewPassword');

  useEffect(() => {
    // デバッグ: 完全なURL情報を表示
    console.log('=== RESET PASSWORD PAGE DEBUG ===');
    console.log('Full URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    console.log('Search:', window.location.search);
    
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

    // ハッシュまたはサーチパラメータからトークンを取得
    const finalAccessToken = accessToken || searchAccessToken;
    const finalRefreshToken = refreshToken || searchRefreshToken;
    const finalType = type || searchType;

    if (finalType === 'recovery' && finalAccessToken && finalRefreshToken) {
      console.log('✅ Valid recovery link detected, setting session...');
      // Supabaseセッション設定
      supabase.auth.setSession({
        access_token: finalAccessToken,
        refresh_token: finalRefreshToken
      }).then(({ data, error }) => {
        if (error) {
          console.error('❌ Session setting error:', error);
          alert(`Session Error: ${error.message}\n\nRedirecting to home...`);
          navigate('/');
          return;
        }
        
        console.log('✅ Session set successfully for user:', data.user?.id);
        setIsModalOpen(true);
      });
    } else {
      // 無効なリセットリンクの場合
      console.warn('❌ Invalid reset link parameters');
      console.warn('Expected: type=recovery with access_token and refresh_token');
      console.warn('Received:', { finalType, hasAccessToken: !!finalAccessToken, hasRefreshToken: !!finalRefreshToken });
      
      // デバッグ用：3秒後にリダイレクト（ユーザーがデバッグ情報を確認できるように）
      alert('Invalid reset link parameters. Check console for details. Redirecting to home in 3 seconds...');
      setTimeout(() => navigate('/'), 3000);
    }
  }, [navigate]);

  const handleClose = () => {
    setIsModalOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <AuthModal
        isOpen={isModalOpen}
        onClose={handleClose}
        initialMode="setNewPassword"
        setMode={setMode}
      />
    </div>
  );
};

export default ResetPasswordPage;
