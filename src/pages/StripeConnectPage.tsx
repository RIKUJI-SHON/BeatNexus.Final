import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { ExternalLink, Loader2, Settings, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSuperTips } from '../hooks/useSuperTips';
import { SuperTipCommentCard } from '../components/ui/SuperTipCommentCard';

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function StripeConnectPage() {
  const { t } = useTranslation();
  const [user, setUser] = useState<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<JsonValue | null>(null);
  const [, setLogs] = useState<string[]>([]);
  const [, setOnboardingUrl] = useState<string | null>(null);
  
  // Super Tips受信履歴のhook
  const { receivedTips, loading: tipsLoading, error: tipsError, refetch: refetchTips } = useSuperTips();

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

  // 初期表示時の自動ステータス取得は、関数定義後に設定

  const callSetupReceiving = useCallback(async () => {
    if (!isAuthed) return;
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
          type OnboardingShape = { onboarding_url: string };
          const hasOnboarding = (v: JsonValue): v is OnboardingShape =>
            typeof v === 'object' && v !== null && 'onboarding_url' in v &&
            typeof (v as Record<string, unknown>).onboarding_url === 'string';
          if (hasOnboarding(json)) {
            setOnboardingUrl(json.onboarding_url);
            window.open(json.onboarding_url, '_blank');
            appendLog('onboarding_url を受信（fetch）');
          }
          setStatus(json);
        } catch {
          appendLog('JSON parse 失敗');
        }
        return;
      }
      if (data?.onboarding_url) {
        setOnboardingUrl(data.onboarding_url as string);
        window.open(data.onboarding_url as string, '_blank');
        appendLog('onboarding_url を受信');
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
  }, [appendLog, isAuthed]);

  const callGetStatus = useCallback(async () => {
    if (!isAuthed) return;
    setLoading(true);
    setStatus(null);
    try {
      appendLog('get-connect-account-status を呼び出し');
      const res = await supabase.functions.invoke('get-connect-account-status');
      if (res.error) {
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
  }, [appendLog, isAuthed]);

  // 初期表示時に自動でステータス取得
  useEffect(() => {
    if (isAuthed) {
      callGetStatus();
    }
  }, [isAuthed, callGetStatus]);

  const openExpressDashboard = useCallback(async () => {
    if (!isAuthed) return;
    setLoading(true);
    try {
      appendLog('get-express-login-link を呼び出し');
      type LoginLinkResp = { success: boolean; url?: string } | null;
      const { data, error } = (await supabase.functions.invoke('get-express-login-link')) as {
        data: LoginLinkResp;
        error: { message: string } | null;
      };
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

  const parsedStatus = useMemo(() => {
    const s = status as JsonValue;
    let charges: boolean | null = null;
    let acct: string | null = null;
    if (typeof s === 'object' && s !== null) {
      const o = s as Record<string, unknown>;
      if (typeof o.charges_enabled === 'boolean') charges = o.charges_enabled;
      if (typeof o.stripe_connect_account_id === 'string') acct = o.stripe_connect_account_id as string;
      else if (typeof o.account_id === 'string') acct = o.account_id as string;
    }
    return { charges_enabled: charges, account_id: acct } as { charges_enabled: boolean | null; account_id: string | null };
  }, [status]);

  const isReceivingReady = parsedStatus.charges_enabled === true;
  const StatusIcon = isReceivingReady ? CheckCircle2 : AlertCircle;
  const statusPillClass = isReceivingReady
    ? 'bg-emerald-500/20 text-emerald-300'
    : 'bg-amber-500/20 text-amber-300';
  const statusText = isReceivingReady ? t('superTip.connect.status.ready') : t('superTip.connect.status.needSetup');

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
      <Helmet>
        <title>{t('superTip.connect.headTitle')}</title>
      </Helmet>

      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-cyan-400" />
        <h1 className="text-3xl font-bold text-cyan-400">{t('superTip.connect.title')}</h1>
      </div>
      <p className="text-sm text-gray-300">{t('superTip.connect.subtitle')}</p>

      {/* 受け取り可否ステータス */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          ) : (
            <StatusIcon className={isReceivingReady ? 'h-5 w-5 text-emerald-300' : 'h-5 w-5 text-amber-300'} />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{t('superTip.connect.status.label')}</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusPillClass}`}>
                {loading ? t('superTip.connect.status.checking') : statusText}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-300">
              {isReceivingReady
                ? t('superTip.connect.status.descriptionReady')
                : t('superTip.connect.status.descriptionNeedSetup')}
            </p>
          </div>
        </div>
      </div>

      {/* アクションのみ表示（ログ/生データは非表示） */}

      <div className="grid sm:grid-cols-2 gap-3">
        {!isReceivingReady && (
          <button
            disabled={!isAuthed || loading}
            onClick={callSetupReceiving}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 transition text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('superTip.connect.actions.startOrResume')}
          </button>
        )}
        <button
          disabled={!isAuthed || loading}
          onClick={openExpressDashboard}
          className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 transition text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <ExternalLink className="h-4 w-4" /> {t('superTip.connect.actions.openExpressDashboard')}
        </button>
      </div>

      {/* Super Tip 説明セクション */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3">
        <h2 className="text-lg font-semibold">{t('superTip.connect.whatIs.title')}</h2>
        <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
          <li>{t('superTip.connect.whatIs.point1')}</li>
          <li>{t('superTip.connect.whatIs.point2')}</li>
          <li>{t('superTip.connect.whatIs.point3')}</li>
          <li>{t('superTip.connect.whatIs.point4')}</li>
        </ul>
        <p className="text-xs text-gray-400">{t('superTip.connect.related')}: <a href="/legal/tokushoho" className="text-cyan-300 underline">{t('superTip.connect.links.tokushoho')}</a></p>
      </div>

      {/* 受け取り開始の流れ */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3 mb-12">
        <h2 className="text-lg font-semibold">{t('superTip.connect.howToStart.title')}</h2>
        <ol className="list-decimal list-inside text-sm text-gray-300 space-y-1">
          <li>{t('superTip.connect.howToStart.step1')}</li>
          <li>{t('superTip.connect.howToStart.step2')}</li>
          <li>{t('superTip.connect.howToStart.step3')}</li>
        </ol>
        {/* 追加案内：アカウント作成時に必要な情報（明記） */}
        <h3 className="text-md font-semibold mt-2">{t('superTip.connect.howToStart.requiredInfoTitle')}</h3>
        <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
          <li>{t('superTip.connect.howToStart.requiredInfo.emailPhone')}</li>
          <li>{t('superTip.connect.howToStart.requiredInfo.nameDobAddress')}</li>
          <li>{t('superTip.connect.howToStart.requiredInfo.industry')}</li>
          <li>
            {t('superTip.connect.howToStart.requiredInfo.websiteLabel')}: <a href="https://beatnexus.app" className="text-cyan-300 underline" target="_blank" rel="noreferrer">{t('superTip.connect.howToStart.requiredInfo.websiteValue')}</a>
          </li>
          <li>{t('superTip.connect.howToStart.requiredInfo.productDesc')}</li>
          <li>{t('superTip.connect.howToStart.requiredInfo.bank')}</li>
          <li>{t('superTip.connect.howToStart.requiredInfo.id')}</li>
        </ul>
        <p className="text-xs text-gray-400">{t('superTip.connect.howToStart.dashboardNote')}</p>
      </div>

      {/* Super Tips受信履歴セクション */}
      {isReceivingReady && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-black" />
            </div>
            <h2 className="text-lg font-semibold">{t('superTip.connect.receivedTips.title')}</h2>
            <button
              onClick={refetchTips}
              disabled={tipsLoading}
              className="ml-auto px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition disabled:opacity-50"
            >
              {tipsLoading ? t('superTip.connect.receivedTips.refreshing') : t('superTip.connect.receivedTips.refresh')}
            </button>
          </div>

          {tipsError ? (
            <div className="text-center py-4 text-red-400">
              <p>{t('superTip.connect.receivedTips.errorPrefix')}{tipsError}</p>
            </div>
          ) : tipsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('superTip.connect.receivedTips.loading')}
              </div>
            </div>
          ) : receivedTips.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('superTip.connect.receivedTips.noTips')}</p>
              <p className="text-sm mt-1">{t('superTip.connect.receivedTips.noTipsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {receivedTips.map((tip) => (
                <SuperTipCommentCard key={tip.id} superTip={tip} />
              ))}
            </div>
          )}
        </div>
      )}

  {/* ステータス/ログの可視化は行わない（内部的には初回ロードで取得） */}
      </div>
    </div>
  );
}
