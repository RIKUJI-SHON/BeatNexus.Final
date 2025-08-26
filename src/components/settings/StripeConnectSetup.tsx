import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { toast } from '../../store/toastStore';
import { Button } from '../ui/Button';
import { CreditCard, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface StripeConnectSetupProps {
  onStatusChange?: (status: 'none' | 'pending' | 'active') => void;
}

export const StripeConnectSetup: React.FC<StripeConnectSetupProps> = ({ onStatusChange }) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    accountId: string | null;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    payoutsEnabled: boolean;
  }>({
    accountId: null,
    chargesEnabled: false,
    detailsSubmitted: false,
    payoutsEnabled: false
  });

  // プロファイルからStripe Connect状態を取得
  const fetchStripeStatus = React.useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_charges_enabled')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching Stripe status:', error);
        return;
      }

      if (data?.stripe_account_id) {
        setStripeStatus({
          accountId: data.stripe_account_id,
          chargesEnabled: data.stripe_charges_enabled || false,
          detailsSubmitted: data.stripe_charges_enabled || false,
          payoutsEnabled: data.stripe_charges_enabled || false
        });
        onStatusChange?.(data.stripe_charges_enabled ? 'active' : 'pending');
      } else {
        onStatusChange?.('none');
      }
    } catch (error) {
      console.error('Error in fetchStripeStatus:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, onStatusChange]);

  useEffect(() => {
    fetchStripeStatus();
  }, [fetchStripeStatus]);

  // 連結アカウント作成
  const handleCreateAccount = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error('認証エラー', 'ログインが必要です');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connect-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          country: 'JP'
        })
      });

      const result = await response.json();

      if (result.success) {
        setStripeStatus({
          accountId: result.account,
          chargesEnabled: result.charges_enabled || false,
          detailsSubmitted: result.details_submitted || false,
          payoutsEnabled: result.payouts_enabled || false
        });
        onStatusChange?.(result.charges_enabled ? 'active' : 'pending');
        toast.success('成功', 'Stripe Connectアカウントが作成されました');
      } else {
        if (result.error === 'Stripe Connect account already exists') {
          toast.info('情報', '既にStripe Connectアカウントが存在します');
          await fetchStripeStatus(); // 最新状態を再取得
        } else {
          toast.error('エラー', result.error || 'アカウント作成に失敗しました');
        }
      }
    } catch (error) {
      console.error('Error creating Stripe account:', error);
      toast.error('エラー', 'アカウント作成中にエラーが発生しました');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-400">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
        <span>読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!stripeStatus.accountId ? (
        // アカウント未作成の場合
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-start space-x-4">
            <CreditCard className="h-6 w-6 text-cyan-400 mt-1" />
            <div className="flex-1">
              <h4 className="text-lg font-medium text-white">SuperTip受け取り設定</h4>
              <p className="text-gray-400 mt-1">
                他のユーザーからSuperTipを受け取るには、Stripe Connectアカウントの設定が必要です。
              </p>
              <p className="text-gray-400 mt-2 text-sm">
                アカウント作成後、オンボーディング手続きを完了することで、SuperTipの受け取りが可能になります。
              </p>
              <Button
                onClick={handleCreateAccount}
                disabled={isCreating}
                isLoading={isCreating}
                className="mt-4 bg-cyan-600 hover:bg-cyan-700"
                leftIcon={<CreditCard className="h-4 w-4" />}
              >
                {isCreating ? 'アカウント作成中...' : 'Stripe Connect開始'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // アカウント作成済みの場合
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-start space-x-4">
            {stripeStatus.chargesEnabled ? (
              <CheckCircle className="h-6 w-6 text-green-400 mt-1" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-400 mt-1" />
            )}
            <div className="flex-1">
              <h4 className="text-lg font-medium text-white">
                {stripeStatus.chargesEnabled ? 'SuperTip受け取り準備完了' : 'オンボーディング未完了'}
              </h4>
              
              {stripeStatus.chargesEnabled ? (
                <p className="text-green-400 mt-1">
                  ✅ SuperTipの受け取りが可能です
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  <p className="text-yellow-400">
                    ⚠️ オンボーディング手続きを完了してください
                  </p>
                  <p className="text-gray-400 text-sm">
                    Stripeダッシュボードでビジネス情報の入力と本人確認を完了する必要があります。
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-3 h-3 rounded-full ${stripeStatus.accountId ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                  <span className="text-gray-300">アカウント作成済み</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-3 h-3 rounded-full ${stripeStatus.detailsSubmitted ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                  <span className="text-gray-300">
                    {stripeStatus.detailsSubmitted ? '情報入力完了' : '情報入力が必要'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-3 h-3 rounded-full ${stripeStatus.chargesEnabled ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                  <span className="text-gray-300">
                    {stripeStatus.chargesEnabled ? '決済受付可能' : '決済受付未対応'}
                  </span>
                </div>
              </div>

              {!stripeStatus.chargesEnabled && (
                <Button
                  onClick={() => {
                    // Stripeダッシュボードへのリンクを開く（実装予定）
                    toast.info('情報', 'Stripeオンボーディング機能は近日実装予定です');
                  }}
                  className="mt-4 bg-yellow-600 hover:bg-yellow-700"
                  leftIcon={<ExternalLink className="h-4 w-4" />}
                >
                  オンボーディングを完了
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
