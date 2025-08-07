import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// 一時保存された電話番号を正式記録する関数
const recordTempPhoneVerification = async (userId: string): Promise<void> => {
  try {
    console.log('📱 Starting recordTempPhoneVerification for user:', userId);
    
    const tempPhoneDataStr = localStorage.getItem('beatnexus_temp_phone_verification');
    console.log('📱 localStorage data:', tempPhoneDataStr ? 'Found' : 'Not found');
    
    if (!tempPhoneDataStr) {
      console.log('📱 No temporary phone data found');
      return;
    }

    const tempPhoneData = JSON.parse(tempPhoneDataStr);
    console.log('📱 Parsed phone data:', { 
      userId: tempPhoneData.userId, 
      phoneNumber: tempPhoneData.phoneNumber ? 'Present' : 'Missing',
      expires: tempPhoneData.expiresAt 
    });
    
    // 期限切れチェック
    if (new Date() > new Date(tempPhoneData.expiresAt)) {
      console.log('📱 Temporary phone data expired, removing...');
      localStorage.removeItem('beatnexus_temp_phone_verification');
      return;
    }

    // ユーザーIDの一致確認
    if (tempPhoneData.userId !== userId) {
      console.log('📱 User ID mismatch, removing temp phone data...', {
        expected: userId,
        found: tempPhoneData.userId
      });
      localStorage.removeItem('beatnexus_temp_phone_verification');
      return;
    }

    console.log('📱 Recording phone number after email confirmation...');
    
    // 正式に電話番号をデータベースに記録
    console.log('📱 Calling record_phone_verification RPC...');
    const { error: phoneError } = await supabase.rpc('record_phone_verification', {
      p_user_id: tempPhoneData.userId,
      p_phone_number: tempPhoneData.phoneNumber
    });
    
    console.log('📱 RPC response:', { error: phoneError });
    
    if (phoneError) {
      console.error('❌ Phone number recording failed after email confirmation:', phoneError);
    } else {
      console.log('✅ Phone number successfully recorded after email confirmation');
      // 成功したら一時データを削除
      localStorage.removeItem('beatnexus_temp_phone_verification');
      console.log('✅ Temporary phone data removed from localStorage');
    }
  } catch (error) {
    console.error('❌ Error in recordTempPhoneVerification:', error);
  }
};

const AuthConfirmPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        console.log('🔐 Email confirmation process started');
        console.log('🔐 Token hash:', token_hash);
        console.log('🔐 Type:', type);

        if (!token_hash || !type) {
          setStatus('error');
          setMessage('認証リンクが無効です。必要なパラメータが不足しています。');
          return;
        }

        // verifyOtpを使用してメール認証を完了
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'email' | 'recovery' | 'invite' | 'magiclink' | 'signup'
        });

        console.log('🔐 Verification response:', { data, error });

        if (error) {
          console.error('❌ Email verification failed:', error);
          setStatus('error');
          setMessage(`メール認証に失敗しました: ${error.message}`);
          return;
        }

        if (data.session) {
          console.log('✅ Email verified successfully');
          console.log('✅ User session:', data.session.user);
          console.log('✅ User ID for phone recording:', data.session.user.id);
          
          // メール認証成功後に一時保存した電話番号を正式記録
          console.log('📱 About to call recordTempPhoneVerification...');
          await recordTempPhoneVerification(data.session.user.id);
          console.log('📱 recordTempPhoneVerification completed');
          
          setStatus('success');
          setMessage('メールアドレスが正常に認証されました！');
          
          // 3秒後にホームページにリダイレクト
          setTimeout(() => {
            navigate('/');
          }, 3000);
        } else {
          setStatus('error');
          setMessage('認証は完了しましたが、セッションの作成に失敗しました。');
        }
      } catch (error) {
        console.error('❌ Error during email confirmation:', error);
        setStatus('error');
        setMessage('認証処理中にエラーが発生しました。');
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">BeatNexus</h1>
          <p className="text-gray-400">メール認証</p>
        </div>

        <div className="bg-gray-900 p-8 rounded-lg shadow-lg">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-white mb-2">認証中...</h2>
              <p className="text-gray-400">メールアドレスを認証しています。しばらくお待ちください。</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">認証完了！</h2>
              <p className="text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500">3秒後に自動的にリダイレクトされます...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">認証失敗</h2>
              <p className="text-gray-400 mb-4">{message}</p>
              <button
                onClick={() => navigate('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                ホームに戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthConfirmPage;
