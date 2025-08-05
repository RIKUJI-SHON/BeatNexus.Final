import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from '../components/auth/AuthModal';
import { supabase } from '../lib/supabase';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'resetPassword' | 'setNewPassword'>('setNewPassword');

  useEffect(() => {
    // URLハッシュからSupabaseセッション情報を抽出
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    console.log('Reset password page params:', { type, accessToken: !!accessToken, refreshToken: !!refreshToken });

    if (type === 'recovery' && accessToken && refreshToken) {
      // Supabaseセッション設定
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ data, error }) => {
        if (error) {
          console.error('Session setting error:', error);
          navigate('/');
          return;
        }
        
        console.log('Session set successfully for user:', data.user?.id);
        setIsModalOpen(true);
      });
    } else {
      // 無効なリセットリンクの場合はホームにリダイレクト
      console.warn('Invalid reset link parameters');
      navigate('/');
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
