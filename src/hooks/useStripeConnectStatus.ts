import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

interface StripeConnectStatus {
  charges_enabled: boolean | null;
  account_id: string | null;
  has_account: boolean;
  details_submitted: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const useStripeConnectStatus = () => {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // まず認証状況を確認
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError('認証が必要です');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        setError('セッションが無効です');
        return;
      }

      // Stripe Connect状況を取得
      const res = await supabase.functions.invoke('get-connect-account-status');
      
      if (res.error) {
        // invoke失敗時はfetchでリトライ
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const r = await fetch(`${SUPABASE_URL}/functions/v1/get-connect-account-status`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
          },
        });
        
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        
        const data = await r.json() as JsonValue;
        setStatus(parseConnectStatus(data));
      } else {
        setStatus(parseConnectStatus(res.data as JsonValue));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Stripe Connect status fetch error:', e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回ロード時に自動で取得
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
    isReceivingReady: status?.charges_enabled === true,
  };
};

// Stripe Connect APIレスポンスを標準形式にパース
const parseConnectStatus = (data: JsonValue): StripeConnectStatus => {
  let charges: boolean | null = null;
  let acct: string | null = null;
  let hasAccount = false;
  let detailsSubmitted = false;
  let requirements: StripeConnectStatus['requirements'] = undefined;

  if (typeof data === 'object' && data !== null) {
    const o = data as Record<string, unknown>;
    
    if (typeof o.charges_enabled === 'boolean') {
      charges = o.charges_enabled;
    }
    
    if (typeof o.stripe_connect_account_id === 'string') {
      acct = o.stripe_connect_account_id;
    } else if (typeof o.account_id === 'string') {
      acct = o.account_id;
    }
    
    if (typeof o.has_account === 'boolean') {
      hasAccount = o.has_account;
    }
    
    if (typeof o.details_submitted === 'boolean') {
      detailsSubmitted = o.details_submitted;
    }
    
    if (typeof o.requirements === 'object' && o.requirements !== null) {
      const req = o.requirements as Record<string, unknown>;
      if (Array.isArray(req.currently_due) && Array.isArray(req.eventually_due) && Array.isArray(req.past_due)) {
        requirements = {
          currently_due: req.currently_due as string[],
          eventually_due: req.eventually_due as string[],
          past_due: req.past_due as string[],
        };
      }
    }
  }

  return {
    charges_enabled: charges,
    account_id: acct,
    has_account: hasAccount,
    details_submitted: detailsSubmitted,
    requirements,
  };
};
