import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { PaymentProcessing } from '../components/payments/PaymentProcessing';

// Simple JSON-like type without using any
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

export default function DevSuperTipsPage() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<JsonValue | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [voteForm, setVoteForm] = useState({
    battle_id: '',
    recipient_user_id: '',
    vote: '' as '' | 'A' | 'B',
    comment: '応援してます！',
    amount_jpy: 300,
  });
  
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
  const { status: paymentStatus, loading: statusLoading, isSucceeded, isPending } = usePaymentStatus(paymentIntentId || undefined);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentReturnUrl, setPaymentReturnUrl] = useState<string | null>(null);

  const appendLog = useCallback((line: string) => {
    const entry = `${new Date().toLocaleTimeString()}  ${line}`;
    setLogs((prev) => [entry, ...prev]);
  }, []);

  useEffect(() => {
    const init = async () => {
      const [{ data: userData }, { data: sessionData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);
      setUser(userData.user);
      setAccessToken(sessionData.session?.access_token ?? null);
    };
    init();
  }, []);

  const isAuthed = !!user && !!accessToken;

  const callSetupReceiving = useCallback(async () => {
    setLoading(true);
    setOnboardingUrl(null);
    try {
      appendLog('setup-super-tip-receiving を呼び出し');
      const { data, error } = await supabase.functions.invoke('setup-super-tip-receiving', { body: {} });
      if (error) {
        appendLog(`invoke失敗（${error.message}）。fetch(POST)で再試行`);
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const r = await fetch(`${SUPABASE_URL}/functions/v1/setup-super-tip-receiving`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        const txt = await r.text();
        appendLog(`fetch結果 HTTP ${r.status}`);
        try {
          const json = JSON.parse(txt) as JsonValue;
          const hasOnboarding = (v: JsonValue): v is { onboarding_url: string } => {
            return typeof v === 'object' && v !== null && 'onboarding_url' in v && typeof (v as { onboarding_url: unknown }).onboarding_url === 'string';
          };
          if (hasOnboarding(json)) {
            const u = json.onboarding_url;
            if (u) {
              setOnboardingUrl(u);
              appendLog('onboarding_url を受信（fetch）');
              window.open(u, '_blank');
            }
          }
          setStatus(json);
        } catch {
          appendLog('JSON parse 失敗');
        }
        return;
      }
      if (data?.onboarding_url) {
        setOnboardingUrl(data.onboarding_url);
        appendLog('onboarding_url を受信');
        // 新規タブで開く
        window.open(data.onboarding_url as string, '_blank');
      } else {
        appendLog('レスポンスに onboarding_url が見つかりません');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      appendLog(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [appendLog]);

  const callGetStatus = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      appendLog('get-connect-account-status を呼び出し');
      // まずは invoke（POST）で試す
      const res = await supabase.functions.invoke('get-connect-account-status');
      if (res.error) {
        // 405等が来る場合に fetch(GET) フォールバック
        appendLog(`invoke失敗（${res.error.message}）。fetch(GET)で再試行`);
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const r = await fetch(`${SUPABASE_URL}/functions/v1/get-connect-account-status`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
          },
        });
        const json = await r.json();
        setStatus(json);
      } else {
        setStatus(res.data as JsonValue);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      appendLog(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [appendLog]);

  const openExpressDashboard = useCallback(async () => {
    if (!isAuthed) return;
    setLoading(true);
    try {
      appendLog('get-express-login-link を呼び出し');
      type LoginLinkResp = { success: boolean; url?: string } | null;
      const { data, error } = await supabase.functions.invoke('get-express-login-link') as { data: LoginLinkResp; error: { message: string } | null };
      if (error) {
        appendLog(`invoke失敗（${error.message}）。fetch(GET)で再試行`);
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const r = await fetch(`${SUPABASE_URL}/functions/v1/get-express-login-link`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
          },
        });
        const json = (await r.json()) as { success?: boolean; url?: string };
        if (json && json.success && typeof json.url === 'string') {
          window.open(json.url, '_blank');
        } else {
          setStatus(json);
        }
        return;
      }
      if (data && data.success && typeof data.url === 'string') {
        window.open(data.url, '_blank');
      } else {
        setStatus(data as JsonValue);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      appendLog(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [appendLog, isAuthed]);

  const callVoteWithSuperTip = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setPaymentClientSecret(null);
    setPaymentReturnUrl(null);
    try {
      appendLog('vote-with-super-tip を呼び出し');
      const payload = {
        battle_id: voteForm.battle_id || undefined,
        sender_user_id: user.id,
        recipient_user_id: voteForm.recipient_user_id,
        vote: voteForm.battle_id ? (voteForm.vote || undefined) : undefined,
        comment: voteForm.comment,
        amount_jpy: Number(voteForm.amount_jpy) || 0,
      };

      // invoke で試し、失敗時は fetch フォールバック
      const { data, error } = await supabase.functions.invoke('vote-with-super-tip', { body: payload });
      if (error) {
        appendLog(`invoke失敗（${error.message}）。fetch(POST)で再試行`);
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const r = await fetch(`${SUPABASE_URL}/functions/v1/vote-with-super-tip`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const txt = await r.text();
        appendLog(`fetch結果 HTTP ${r.status}`);
        try {
          const parsed = JSON.parse(txt) as JsonValue;
          type TipPIResponse = { success: boolean; client_secret: string; recommended_return_url?: string };
          const hasClientSecret = (v: JsonValue): v is TipPIResponse => {
            return typeof v === 'object' && v !== null && 'client_secret' in v && 'success' in v;
          };
          if (hasClientSecret(parsed) && parsed.success) {
            setPaymentClientSecret(parsed.client_secret);
            setPaymentReturnUrl(parsed.recommended_return_url || null);
            appendLog('client_secret を受信（fetch）');
          } else {
            setStatus(parsed);
          }
        } catch {
          appendLog('JSON parse 失敗');
        }
        return;
      }
      if (data?.success && data?.client_secret) {
        setPaymentClientSecret(data.client_secret as string);
        setPaymentReturnUrl((data.recommended_return_url as string) || null);
        appendLog('client_secret を受信');
      } else {
        setStatus(data as JsonValue);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      appendLog(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [appendLog, user, voteForm]);

  const maskedToken = useMemo(() => {
    if (!accessToken) return '';
    if (accessToken.length <= 16) return accessToken;
    return `${accessToken.slice(0, 12)}...${accessToken.slice(-6)}`;
  }, [accessToken]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Dev: Super Tips テスト</h1>
      <p className="text-sm text-gray-500">ログイン済みでこのページからEdge Functionsを叩いて動作確認します。</p>

      {/* ペイメント処理状態表示 */}
      {paymentIntentId && paymentStatus && (
        <PaymentProcessing
          status={paymentStatus.payment_status}
          amount={voteForm.amount_jpy}
          onComplete={() => setPaymentIntentId(null)}
        />
      )}

      <div className="rounded-md border p-3 text-sm">
        <div>Auth: {isAuthed ? '✅' : '❌'}</div>
        <div>User ID: {user?.id ?? '-'}</div>
        <div>JWT: {maskedToken || '-'}</div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <button
          disabled={!isAuthed || loading}
          onClick={callSetupReceiving}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          1) 受け取り設定を開始（Account Links）
        </button>
        <button
          disabled={!isAuthed || loading}
          onClick={callGetStatus}
          className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
        >
          2) 状況を確認（charges_enabled 同期）
        </button>
        <button
          disabled={!isAuthed || loading}
          onClick={openExpressDashboard}
          className="px-4 py-2 rounded bg-slate-700 text-white disabled:opacity-50 sm:col-span-2"
        >
          2.5) Stripe Express ダッシュボードを開く（本人用）
        </button>
      </div>

      {/* Vote with Super Tip */}
      <div className="rounded-md border p-3 space-y-3">
        <div className="font-semibold">3) vote-with-super-tip（決済テスト）</div>
        {!STRIPE_PUBLISHABLE_KEY && (
          <div className="text-sm text-red-600">
            VITE_STRIPE_PUBLISHABLE_KEY が未設定です。.env.local にテスト用の Publishable Key を設定してください。
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-sm">recipient_user_id（必須）</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="対象プレイヤーのユーザーID"
              value={voteForm.recipient_user_id}
              onChange={(e) => setVoteForm((s) => ({ ...s, recipient_user_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">battle_id（任意: 単独支援は空）</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="バトルID（任意）"
              value={voteForm.battle_id}
              onChange={(e) => setVoteForm((s) => ({ ...s, battle_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">vote（A/B、バトル指定時のみ）</label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={voteForm.vote}
              onChange={(e) => setVoteForm((s) => ({ ...s, vote: (e.target.value as 'A' | 'B' | '') }))}
              disabled={!voteForm.battle_id}
            >
              <option value="">未選択</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm">amount_jpy（100-10000）</label>
            <input
              type="number"
              min={100}
              max={10000}
              className="w-full border rounded px-2 py-1 text-sm"
              value={voteForm.amount_jpy}
              onChange={(e) => setVoteForm((s) => ({ ...s, amount_jpy: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm">comment（必須, 500文字以内）</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            rows={2}
            value={voteForm.comment}
            onChange={(e) => setVoteForm((s) => ({ ...s, comment: e.target.value }))}
          />
        </div>
        <button
          disabled={!isAuthed || loading}
          onClick={callVoteWithSuperTip}
          className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
        >
          3-1) PaymentIntent 作成（Edge Function）
        </button>

        {paymentClientSecret && stripePromise && (
          <div className="mt-3 border-t pt-3 space-y-3">
            <div className="text-sm text-gray-700">client_secret: {paymentClientSecret.slice(0, 18)}…</div>
            <Elements stripe={stripePromise} options={{ clientSecret: paymentClientSecret }}>
              <PaymentSection returnUrl={paymentReturnUrl || window.location.origin} />
            </Elements>
          </div>
        )}
      </div>

      {onboardingUrl && (
        <div className="rounded-md border p-3">
          <div className="font-semibold mb-1">Onboarding URL</div>
          <a className="text-blue-600 underline" href={onboardingUrl} target="_blank" rel="noreferrer">
            {onboardingUrl}
          </a>
        </div>
      )}

      <div className="rounded-md border p-3">
        <div className="font-semibold mb-1">Status</div>
        <pre className="text-xs whitespace-pre-wrap">{status ? JSON.stringify(status, null, 2) : '—'}</pre>
      </div>

      <div className="rounded-md border p-3">
        <div className="font-semibold mb-1">Logs</div>
        <pre className="text-xs whitespace-pre-wrap">{logs.length ? logs : '—'}</pre>
      </div>
    </div>
  );
}

function PaymentSection({ returnUrl }: { returnUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const onConfirm = useCallback(async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
      });
      if (error) {
        // エラーは画面に出さずコンソールに。開発用ページのため簡素化。
        console.error('confirmPayment error', error);
      }
    } finally {
      setSubmitting(false);
    }
  }, [stripe, elements, returnUrl]);

  return (
    <div className="space-y-3">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        onClick={onConfirm}
        disabled={!stripe || !elements || submitting}
        className="px-4 py-2 rounded bg-pink-600 text-white disabled:opacity-50"
      >
        3-2) 決済を確認（confirmPayment）
      </button>
    </div>
  );
}
