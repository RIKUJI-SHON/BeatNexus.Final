import React, { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard,
  DollarSign,
  ExternalLink,
  Loader,
  CheckCircle,
  AlertCircle,
  Shield
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { toast } from '../../store/toastStore';

interface StripeAccountStatus {
  account_id: string;
  status: 'incomplete' | 'partial' | 'complete';
  status_message: string;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
  business_profile: {
    name?: string;
    url?: string;
  };
  country: string;
  created: number;
  details_submitted: boolean;
}

export const PaymentSettings: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null);
  const [hasStripeAccount, setHasStripeAccount] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isCreatingOnboarding, setIsCreatingOnboarding] = useState(false);

  const checkStripeAccountStatus = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // まずユーザープロファイルをチェック
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setHasStripeAccount(false);
        return;
      }

      if (!profile.stripe_account_id) {
        setHasStripeAccount(false);
        return;
      }

      setHasStripeAccount(true);

      // Stripeアカウントのステータスを取得
      const { data, error } = await supabase.functions.invoke('get-account-status', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) {
        console.error('Account status error:', error);
        toast.error('Error', 'Failed to check account status');
        return;
      }

      if (data.success) {
        setAccountStatus(data);
      }
    } catch (error) {
      console.error('Error checking Stripe account:', error);
      toast.error('Error', 'Failed to check payment settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkStripeAccountStatus();
  }, [checkStripeAccountStatus]);

  const createStripeAccount = async () => {
    if (!user) return;

    setIsCreatingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) {
        console.error('Account creation error:', error);
        toast.error('Error', 'Failed to create payment account');
        return;
      }

      if (data.success) {
        toast.success('Success', 'Payment account created successfully');
        await checkStripeAccountStatus();
      } else {
        toast.error('Error', data.error || 'Failed to create payment account');
      }
    } catch (error) {
      console.error('Error creating Stripe account:', error);
      toast.error('Error', 'Failed to create payment account');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const startOnboarding = async () => {
    if (!user || !hasStripeAccount) return;

    setIsCreatingOnboarding(true);
    try {
      const currentUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('create-onboarding-link', {
        body: {
          refresh_url: `${currentUrl}/profile?tab=payment`,
          return_url: `${currentUrl}/profile?tab=payment&success=true`
        },
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) {
        console.error('Onboarding error:', error);
        toast.error('Error', 'Failed to start onboarding');
        return;
      }

      if (data.success) {
        // Stripeオンボーディングページにリダイレクト
        window.location.href = data.onboarding_url;
      } else {
        toast.error('Error', data.error || 'Failed to start onboarding');
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
      toast.error('Error', 'Failed to start onboarding');
    } finally {
      setIsCreatingOnboarding(false);
    }
  };

  const getStatusIcon = () => {
    if (!accountStatus) return <AlertCircle className="w-5 h-5 text-amber-400" />;
    
    switch (accountStatus.status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getStatusColor = () => {
    if (!accountStatus) return 'text-amber-400';
    
    switch (accountStatus.status) {
      case 'complete':
        return 'text-green-400';
      case 'partial':
        return 'text-amber-400';
      default:
        return 'text-red-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30">
          <CreditCard className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Payment Settings</h2>
        <p className="text-slate-400">Manage your payment account to receive SuperTip earnings</p>
      </div>

      {!hasStripeAccount ? (
        /* アカウント未作成 */
        <Card className="p-6 space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-xl">
              <DollarSign className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Create Payment Account
              </h3>
              <p className="text-slate-400 text-sm">
                To receive SuperTip payments, you need to create a payment account with our secure partner Stripe.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                What you'll need:
              </h4>
              <ul className="text-xs text-slate-400 space-y-1 ml-6">
                <li>• Valid government-issued ID</li>
                <li>• Bank account information</li>
                <li>• Personal information (name, address)</li>
                <li>• Tax information (if applicable)</li>
              </ul>
              <div className="mt-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-xs text-cyan-200">
                  <strong>Note:</strong> For SuperTip earnings, you'll create an individual account. 
                  Your BeatNexus profile will be used as your business information automatically.
                </p>
              </div>
              <div className="mt-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-xs text-green-200">
                  <strong>Don't have a website?</strong> No problem! We'll use your BeatNexus profile page 
                  as your business URL, and describe your activity as "Digital content creation and live performance entertainment."
                </p>
              </div>
            </div>

            <Button
              onClick={createStripeAccount}
              disabled={isCreatingAccount}
              className="w-full"
            >
              {isCreatingAccount ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Create Payment Account
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        /* アカウント作成済み */
        <Card className="p-6 space-y-6">
          {/* ステータス表示 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <h3 className="text-lg font-semibold text-white">Account Status</h3>
                <p className={`text-sm ${getStatusColor()}`}>
                  {accountStatus?.status_message || 'Loading...'}
                </p>
              </div>
            </div>
            {accountStatus && (
              <div className="text-right text-sm text-slate-400">
                <div>Account ID: {accountStatus.account_id.slice(-8)}</div>
                <div>Country: {accountStatus.country}</div>
              </div>
            )}
          </div>

          {/* 機能ステータス */}
          {accountStatus && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {accountStatus.charges_enabled ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-white">Receive Payments</span>
                </div>
                <p className="text-xs text-slate-400">
                  {accountStatus.charges_enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {accountStatus.payouts_enabled ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-white">Payouts</span>
                </div>
                <p className="text-xs text-slate-400">
                  {accountStatus.payouts_enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          )}

          {/* 必要な情報 */}
          {accountStatus && accountStatus.requirements.currently_due.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">Action Required</span>
              </div>
              <p className="text-xs text-amber-200 mb-3">
                Please complete your account setup to enable all features.
              </p>
              <div className="space-y-1">
                {accountStatus.requirements.currently_due.map((requirement, index) => (
                  <div key={index} className="text-xs text-amber-100">
                    • {requirement.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payouts無効の場合の説明 */}
          {accountStatus && accountStatus.charges_enabled && !accountStatus.payouts_enabled && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Almost Ready!</span>
              </div>
              <p className="text-xs text-blue-200 mb-2">
                You can receive payments, but need to complete setup to receive payouts to your bank account.
              </p>
              <p className="text-xs text-blue-200">
                Click "Complete Setup" to verify your bank account and enable money transfers.
              </p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3">
            {accountStatus?.status !== 'complete' && (
              <Button
                onClick={startOnboarding}
                disabled={isCreatingOnboarding}
                className="flex-1"
              >
                {isCreatingOnboarding ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
            
            <Button
              onClick={checkStripeAccountStatus}
              variant="outline"
              className="px-4"
            >
              Refresh
            </Button>
          </div>
        </Card>
      )}

      {/* 収益情報（今後の実装用） */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Earnings Overview</h3>
        <div className="text-center py-8 text-slate-400">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Earnings tracking coming soon</p>
        </div>
      </Card>
    </div>
  );
};
