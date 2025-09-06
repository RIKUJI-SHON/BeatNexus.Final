import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { ExternalLink, Loader2, CreditCard, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { PaymentProcessing } from '../components/payments/PaymentProcessing';

// 型定義
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

// 環境変数
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

// 決済フォームコンポーネント
const PaymentForm: React.FC<{
  onSuccess: () => void;
  onError: (error: string) => void;
}> = ({ onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/super-tip/complete?test=true`,
        },
      });

      if (error) {
        onError(error.message || '決済エラーが発生しました');
      } else {
        onSuccess();
      }
    } catch {
      onError('予期しないエラーが発生しました');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-gray-300 rounded-lg bg-white">
        <PaymentElement />
      </div>
      <button
        type="submit"
        disabled={!stripe || !elements || processing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            決済処理中...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            決済を実行
          </>
        )}
      </button>
    </form>
  );
};

export default function SuperTipProductionTestPage() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [connectStatus, setConnectStatus] = useState<JsonValue | null>(null);

  // URLパラメータからpayment_intent IDを取得
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    if (paymentIntent) {
      setPaymentIntentId(paymentIntent);
      // URLからパラメータを削除（オプション）
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
  
  // ペイメント状態をポーリング
  const { status: paymentStatus } = usePaymentStatus(paymentIntentId || undefined);

  // テスト用Super Tip設定
  const [testForm, setTestForm] = useState({
    recipient_user_id: '', // 他のユーザーのIDを設定
    comment: '本番環境テスト用のSuper Tip！',
    amount_jpy: 500,
    battle_id: '', // バトルIDを追加（オプション）
    vote: 'A' as 'A' | 'B', // 投票先を追加（オプション）
    use_battle: false, // バトル投票を使うかどうかのフラグ
  });

  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'setup' | 'payment' | 'success' | 'error'>('setup');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // ログ関数
  const appendLog = useCallback((line: string) => {
    const entry = `${new Date().toLocaleTimeString()} ${line}`;
    setLogs((prev) => [entry, ...prev]);
  }, []);

  // 初期化
  useEffect(() => {
    const init = async () => {
      appendLog('ユーザー認証情報を取得中...');
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      
      if (userData.user) {
        appendLog(`ユーザー認証確認完了: ${userData.user.email}`);
        // 自分自身は設定しない（自己送金は制限されているため）
        appendLog('受取人IDは手動で他のユーザーのIDを設定してください');
      } else {
        appendLog('ユーザー認証情報が取得できませんでした');
      }
    };
    init();
  }, [appendLog]);

  // Connect Account状況確認
  const checkConnectStatus = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      appendLog('Connect Account状況を確認中...');
      
      // 本番環境のEdge Function URL を直接確認
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-connect-account-status`;
      appendLog(`Edge Function URL: ${functionUrl}`);
      
      const { data, error } = await supabase.functions.invoke('get-connect-account-status');
      
      if (error) {
        appendLog(`Connect状況確認エラー: ${error.message}`);
        appendLog(`エラー詳細: ${JSON.stringify(error)}`);
        console.error('Connect status error:', error);
        
        // エラーの場合、データベースから直接確認を試行
        appendLog('データベースから直接profile情報を確認中...');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('stripe_connect_account_id, stripe_charges_enabled')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          appendLog(`Profile取得エラー: ${profileError.message}`);
        } else {
          appendLog(`Profile情報: ${JSON.stringify(profileData)}`);
          // Profileデータから手動でconnect状況を構築
          if (profileData) {
            const mockConnectStatus = {
              success: true,
              has_account: Boolean(profileData.stripe_connect_account_id),
              charges_enabled: Boolean(profileData.stripe_charges_enabled),
              account_id: profileData.stripe_connect_account_id || undefined
            };
            setConnectStatus(mockConnectStatus);
            appendLog(`Profile情報からConnect状況を構築: ${JSON.stringify(mockConnectStatus)}`);
          }
        }
      } else {
        setConnectStatus(data);
        appendLog(`Connect状況確認完了: ${JSON.stringify(data)}`);
        console.log('Connect status data:', data);
      }
    } catch (err) {
      appendLog(`Connect状況確認失敗: ${err}`);
      console.error('Connect status exception:', err);
    } finally {
      setLoading(false);
    }
  }, [user, appendLog]);

  // Super Tip決済作成
  const createSuperTipPayment = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setPaymentStep('setup');
    setErrorMessage('');

    try {
      appendLog('Super Tip決済作成開始...');
      
      // バトル投票か単独支援かで関数を切り替え
      if (testForm.use_battle && testForm.battle_id) {
        const { data, error } = await supabase.functions.invoke('vote-with-super-tip-vote', {
          body: {
            battle_id: testForm.battle_id,
            sender_user_id: user.id,
            recipient_user_id: testForm.recipient_user_id,
            comment: testForm.comment,
            amount_jpy: testForm.amount_jpy,
            vote: testForm.vote,
          }
        });
        
        if (error) throw new Error(error.message);
        if (data?.client_secret) {
          setPaymentClientSecret(data.client_secret);
          setPaymentStep('payment');
          appendLog('バトル投票付きPayment Intent作成成功');
          appendLog(`Super Tip ID: ${data.super_tip_id}`);
        } else {
          throw new Error('Payment Intent作成に失敗しました');
        }
      } else {
        const { data, error } = await supabase.functions.invoke('vote-with-super-tip', {
          body: {
            sender_user_id: user.id,
            recipient_user_id: testForm.recipient_user_id,
            comment: testForm.comment,
            amount_jpy: testForm.amount_jpy,
            // バトルIDと投票は指定しない（単独支援テスト）
          }
        });
        
        if (error) throw new Error(error.message);
        if (data?.client_secret) {
          setPaymentClientSecret(data.client_secret);
          setPaymentStep('payment');
          appendLog('単独支援Payment Intent作成成功');
          appendLog(`Super Tip ID: ${data.tip?.id || data.super_tip_id}`);
        } else {
          throw new Error('Payment Intent作成に失敗しました');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      setPaymentStep('error');
      appendLog(`Super Tip作成エラー: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [user, testForm, appendLog]);

  // 受取人のConnect状況確認
  const checkRecipientConnectStatus = useCallback(async () => {
    if (!testForm.recipient_user_id) {
      appendLog('受取人IDが設定されていません');
      return;
    }

    if (testForm.recipient_user_id === user?.id) {
      appendLog('❌ 自己送金は禁止されています');
      return;
    }

    setLoading(true);
    try {
      appendLog(`受取人(${testForm.recipient_user_id})のConnect状況を確認中...`);
      
      // データベースから受取人のprofile情報を確認
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_connect_account_id, stripe_charges_enabled, display_name, username')
        .eq('id', testForm.recipient_user_id)
        .single();
        
      if (profileError) {
        appendLog(`受取人Profile取得エラー: ${profileError.message}`);
      } else if (profileData) {
        appendLog(`受取人情報: ${JSON.stringify(profileData)}`);
        const connectReady = Boolean(profileData.stripe_charges_enabled);
        appendLog(`受取人のConnect設定: ${connectReady ? '完了' : '未完了'}`);
        
        if (!connectReady) {
          appendLog('⚠️ この受取人はStripe Connect設定が未完了です');
        }
      } else {
        appendLog('受取人が見つかりませんでした');
      }
    } catch (err) {
      appendLog(`受取人Connect状況確認失敗: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [testForm.recipient_user_id, user?.id, appendLog]);
  const setupConnectAccount = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      appendLog('Connect Account設定開始...');
      const { data, error } = await supabase.functions.invoke('setup-super-tip-receiving');
      
      if (error) {
        throw new Error(error.message);
      }

      if (data?.onboarding_url) {
        appendLog('オンボーディングURLを取得、新しいタブで開きます');
        window.open(data.onboarding_url, '_blank');
      }
    } catch (err) {
      appendLog(`Connect設定エラー: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [user, appendLog]);

  // 初回Connect状況確認
  useEffect(() => {
    if (user) {
      checkConnectStatus();
    }
  }, [user, checkConnectStatus]);

  // Connect状況のパース
  const parsedConnectStatus = useMemo(() => {
    if (!connectStatus || typeof connectStatus !== 'object') {
      console.log('Connect status parsing: invalid data', connectStatus);
      return null;
    }
    const status = connectStatus as Record<string, unknown>;
    const result = {
      hasAccount: Boolean(status.has_account),
      chargesEnabled: Boolean(status.charges_enabled),
      accountId: status.account_id as string | undefined,
    };
    console.log('Connect status parsed:', result);
    return result;
  }, [connectStatus]);

  const isConnectReady = parsedConnectStatus?.chargesEnabled === true;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <Helmet>
        <title>Super Tips 本番環境テスト | BeatNexus</title>
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* ペイメント処理状態表示 */}
        {paymentIntentId && paymentStatus && (
          <PaymentProcessing
            status={paymentStatus.payment_status}
            amount={testForm.amount_jpy}
            onComplete={() => setPaymentIntentId(null)}
          />
        )}

        {/* ヘッダー */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-cyan-400" />
          <h1 className="text-3xl font-bold text-cyan-400">Super Tips 本番環境テスト</h1>
        </div>
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
          <p className="text-amber-300 text-sm">
            ⚠️ これは本番環境での決済テストページです。実際に決済が発生します。
          </p>
        </div>

        {/* Connect Account状況 */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className={`h-5 w-5 ${isConnectReady ? 'text-green-400' : 'text-gray-400'}`} />
              Stripe Connect 状況
            </h2>
            <button
              onClick={checkConnectStatus}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition"
            >
              更新
            </button>
          </div>
          
          {/* デバッグ: 生データ表示 */}
          {connectStatus && (
            <div className="mb-4 p-3 bg-black rounded text-xs">
              <div className="text-green-400 mb-2">取得された生データ:</div>
              <pre className="text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(connectStatus, null, 2)}
              </pre>
            </div>
          )}
          
          {parsedConnectStatus && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>アカウント作成済み:</span>
                <span className={parsedConnectStatus.hasAccount ? 'text-green-400' : 'text-red-400'}>
                  {parsedConnectStatus.hasAccount ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>決済受け取り可能:</span>
                <span className={parsedConnectStatus.chargesEnabled ? 'text-green-400' : 'text-red-400'}>
                  {parsedConnectStatus.chargesEnabled ? 'Yes' : 'No'}
                </span>
              </div>
              {parsedConnectStatus.accountId && (
                <div className="flex justify-between">
                  <span>アカウントID:</span>
                  <span className="text-gray-300 font-mono text-xs">{parsedConnectStatus.accountId}</span>
                </div>
              )}
            </div>
          )}

          {!isConnectReady && (
            <div className="space-y-2">
              <button
                onClick={setupConnectAccount}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Connect Account を設定
              </button>
              
              {/* デバッグ用: 手動でConnect状況をオーバーライド */}
              <button
                onClick={() => {
                  setConnectStatus({
                    success: true,
                    has_account: true,
                    charges_enabled: true,
                    account_id: 'test_account_override'
                  });
                  appendLog('Connect状況を手動でオーバーライドしました（テスト用）');
                }}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-1 px-4 rounded transition text-sm"
              >
                🔧 Connect状況を強制的に有効にする（デバッグ用）
              </button>
            </div>
          )}
        </div>

        {/* テスト用Super Tip設定 */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="text-lg font-semibold mb-4">テスト設定</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">受取人ユーザーID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testForm.recipient_user_id}
                  onChange={(e) => setTestForm(prev => ({ ...prev, recipient_user_id: e.target.value }))}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm font-mono"
                  placeholder="Stripe Connect設定済みの他のユーザーのID"
                />
                <button
                  onClick={checkRecipientConnectStatus}
                  disabled={loading || !testForm.recipient_user_id}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded transition"
                >
                  確認
                </button>
              </div>
              <div className="mt-2 text-xs text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded p-2">
                ⚠️ 注意: 受取人は以下の条件を満たす必要があります<br/>
                • Stripe Connect設定が完了していること<br/>
                • あなた自身のIDではないこと（自己送金は禁止）<br/>
                • 実在するユーザーIDであること
              </div>
              {user?.id && (
                <div className="mt-1 text-xs text-gray-400">
                  あなたのID（使用不可）: {user.id}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">コメント</label>
              <textarea
                value={testForm.comment}
                onChange={(e) => setTestForm(prev => ({ ...prev, comment: e.target.value }))}
                rows={3}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                placeholder="テスト用コメント"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">テストモード</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="test_mode"
                    checked={!testForm.use_battle}
                    onChange={() => setTestForm(prev => ({ ...prev, use_battle: false }))}
                    className="mr-2"
                  />
                  <span className="text-green-400">単独支援（推奨）</span>
                  <span className="ml-2 text-xs text-gray-400">- バトル不要、本番環境で安全</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="test_mode"
                    checked={testForm.use_battle}
                    onChange={() => setTestForm(prev => ({ ...prev, use_battle: true }))}
                    className="mr-2"
                  />
                  <span className="text-amber-400">バトル投票付き</span>
                  <span className="ml-2 text-xs text-gray-400">- バトル必要、開発環境推奨</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">金額（円）</label>
              <select
                value={testForm.amount_jpy}
                onChange={(e) => setTestForm(prev => ({ ...prev, amount_jpy: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
              >
                <option value={100}>¥100</option>
                <option value={300}>¥300</option>
                <option value={500}>¥500</option>
                <option value={1000}>¥1,000</option>
                <option value={3000}>¥3,000</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">バトルID</label>
              <input
                type="text"
                value={testForm.battle_id}
                onChange={(e) => setTestForm(prev => ({ ...prev, battle_id: e.target.value }))}
                disabled={!testForm.use_battle}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="投票するバトルのID"
              />
              <div className="mt-1 text-xs text-gray-400">
                バトル投票付きの場合のみ必須です
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">投票先</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="vote"
                    value="A"
                    checked={testForm.vote === 'A'}
                    onChange={(e) => setTestForm(prev => ({ ...prev, vote: e.target.value as 'A' | 'B' }))}
                    disabled={!testForm.use_battle}
                    className="mr-2 disabled:opacity-50"
                  />
                  プレイヤーA
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="vote"
                    value="B"
                    checked={testForm.vote === 'B'}
                    onChange={(e) => setTestForm(prev => ({ ...prev, vote: e.target.value as 'A' | 'B' }))}
                    disabled={!testForm.use_battle}
                    className="mr-2 disabled:opacity-50"
                  />
                  プレイヤーB
                </label>
              </div>
              {!testForm.use_battle && (
                <div className="mt-1 text-xs text-gray-400">
                  単独支援では投票は不要です
                </div>
              )}
            </div>

            <div className="bg-gray-800 p-3 rounded text-sm">
              <div className="flex justify-between mb-1">
                <span>支援額:</span>
                <span>¥{testForm.amount_jpy.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>プレイヤーが受け取る金額（85%）:</span>
                <span className="text-green-400">¥{Math.floor(testForm.amount_jpy * 0.85).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>プラットフォーム運営費（15%）:</span>
                <span className="text-gray-400">¥{Math.floor(testForm.amount_jpy * 0.15).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 決済フロー */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="text-lg font-semibold mb-4">決済テスト</h2>
          
          {/* デバッグ情報表示 */}
          <div className="mb-4 p-3 bg-gray-800 rounded text-xs space-y-1">
            <div className="text-gray-400">ボタン有効化条件チェック:</div>
            <div className={`${loading ? 'text-red-300' : 'text-green-300'}`}>
              ローディング中: {loading ? 'はい（無効化要因）' : 'いいえ'}
            </div>
            <div className={`${!isConnectReady ? 'text-red-300' : 'text-green-300'}`}>
              Connect設定完了: {isConnectReady ? 'はい' : 'いいえ（無効化要因）'}
            </div>
            <div className={`${!testForm.recipient_user_id ? 'text-red-300' : 'text-green-300'}`}>
              受取人ID設定: {testForm.recipient_user_id ? 'はい' : 'いいえ（無効化要因）'}
            </div>
            <div className={`${!testForm.battle_id ? 'text-red-300' : 'text-green-300'}`}>
              バトルID設定: {testForm.battle_id ? 'はい' : 'いいえ（無効化要因）'}
            </div>
            <div className={`${testForm.recipient_user_id === user?.id ? 'text-red-300' : 'text-green-300'}`}>
              自己送金チェック: {testForm.recipient_user_id === user?.id ? '自己送金のため無効' : '問題なし'}
            </div>
            <div className="text-gray-300">
              受取人ID: {testForm.recipient_user_id || '未設定'}
            </div>
            <div className="text-gray-300">
              バトルID: {testForm.battle_id || '未設定'}
            </div>
            <div className="text-gray-300">
              投票先: {testForm.vote}
            </div>
            <div className="text-gray-300">
              あなたのID: {user?.id || '未ログイン'}
            </div>
          </div>
          
          {paymentStep === 'setup' && (
            <button
              onClick={createSuperTipPayment}
              disabled={
                loading || 
                !isConnectReady || 
                !testForm.recipient_user_id || 
                (testForm.use_battle && !testForm.battle_id) || 
                testForm.recipient_user_id === user?.id
              }
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-4 rounded transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Super Tip決済を開始
            </button>
          )}

          {paymentStep === 'payment' && paymentClientSecret && stripePromise && (
            <div className="space-y-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-300 text-sm">
                  決済フォームが表示されました。テスト用カード番号: 4242 4242 4242 4242
                </p>
              </div>
              <Elements stripe={stripePromise} options={{ clientSecret: paymentClientSecret }}>
                <PaymentForm
                  onSuccess={() => {
                    setPaymentStep('success');
                    appendLog('決済が完了しました！');
                  }}
                  onError={(error) => {
                    setErrorMessage(error);
                    setPaymentStep('error');
                    appendLog(`決済エラー: ${error}`);
                  }}
                />
              </Elements>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-300 font-semibold">決済テスト成功！</p>
              <button
                onClick={() => {
                  setPaymentStep('setup');
                  setPaymentClientSecret(null);
                }}
                className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
              >
                新しいテストを開始
              </button>
            </div>
          )}

          {paymentStep === 'error' && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-red-300 font-semibold">エラーが発生しました</span>
              </div>
              <p className="text-red-300 text-sm mb-3">{errorMessage}</p>
              <button
                onClick={() => {
                  setPaymentStep('setup');
                  setPaymentClientSecret(null);
                  setErrorMessage('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
              >
                再試行
              </button>
            </div>
          )}
        </div>

        {/* ログ表示 */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="text-lg font-semibold mb-4">実行ログ</h2>
          <div className="bg-black rounded p-3 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">ログはまだありません</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-green-400 text-xs font-mono mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 注意事項 */}
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <h3 className="text-red-300 font-semibold mb-2">⚠️ 本番環境テストの注意事項</h3>
          <ul className="text-red-300 text-sm space-y-1">
            <li>• このテストでは実際に決済が発生します</li>
            <li>• テスト用カード番号（4242 4242 4242 4242）を使用してください</li>
            <li>• 実際のカード情報は入力しないでください</li>
            <li>• Connect Accountが未設定の場合は先に設定を完了してください</li>
            <li>• エラーが発生した場合はログを確認してください</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
