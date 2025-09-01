import React, { useCallback, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Modal } from '../ui/Modal';
import { useTranslation } from 'react-i18next';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

export interface SupportTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  battleId: string; // バトルの文脈での単独支援（voteは付けない）
  recipientUserId: string; // 支援先
  recipientName?: string; // 表示用
  onSuccess?: () => Promise<void> | void; // 決済フロー完了後のUI更新用
}

const TIP_PRESETS = [100, 300, 500, 1000, 3000];

export const SupportTipModal: React.FC<SupportTipModalProps> = ({
  isOpen,
  onClose,
  battleId,
  recipientUserId,
  recipientName,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<number>(300);
  const [comment, setComment] = useState<string>(t('superTip.modal.defaultComment'));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  const handlePresetClick = (v: number) => {
    setAmount(v);
  };

  const canSubmit = useMemo(() => {
    const a = Number(amount);
    return a >= 100 && a <= 10000 && comment.trim().length > 0;
  }, [amount, comment]);

  const createPaymentIntent = useCallback(async () => {
    setError(null);
    if (!canSubmit) {
      setError(t('superTip.modal.errors.checkAmountAndComment'));
      return;
    }
    setLoading(true);
    try {
      // 現在のユーザーID（sender）を取得
      const { data: userData } = await supabase.auth.getUser();
      const senderUserId = userData.user?.id;
      if (!senderUserId) {
        setError(t('superTip.modal.errors.loginRequired'));
        return;
      }
      // Edge Function を呼び出して PaymentIntent を作成
      const payload = {
        battle_id: battleId,
        sender_user_id: senderUserId,
        recipient_user_id: recipientUserId,
        // vote は付けない（単独支援）
        amount_jpy: Number(amount),
        comment: comment.trim(),
      };

      type TipPIResponse = { success: boolean; client_secret?: string; recommended_return_url?: string; error?: string } | null;
  const { data, error } = await supabase.functions.invoke('vote-with-super-tip', { body: payload });
      if (error) {
        // fetchフォールバック
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vote-with-super-tip`;
        const r = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const txt = await r.text();
        try {
          const parsed = JSON.parse(txt) as TipPIResponse;
          if (parsed && parsed.success && parsed.client_secret) {
            setClientSecret(parsed.client_secret);
            setReturnUrl(parsed.recommended_return_url || null);
          } else {
    setError(parsed?.error || t('superTip.errors.http', { code: r.status }));
          }
        } catch {
      setError(t('superTip.errors.http', { code: r.status }));
        }
        return;
      }
      const resp = data as TipPIResponse;
      if (resp && resp.success && resp.client_secret) {
        setClientSecret(resp.client_secret);
        setReturnUrl(resp.recommended_return_url || null);
      } else {
    setError(resp?.error || t('superTip.errors.unknown'));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [amount, battleId, canSubmit, comment, recipientUserId, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={recipientName ? t('superTip.supportModal.titleWithName', { name: recipientName }) : t('superTip.supportModal.titleGeneric')}
      size="lg"
      backgroundOpacity="normal"
    >
      <div className="space-y-4">
          {!STRIPE_PUBLISHABLE_KEY && (
            <div className="text-sm text-red-400">{t('superTip.modal.errors.publishableKeyMissing')}</div>
          )}

          {/* 金額プリセット */}
          <div className="space-y-2">
            <div className="text-sm text-gray-300">{t('superTip.modal.presets')}</div>
            <div className="flex flex-wrap gap-2">
              {TIP_PRESETS.map((v) => (
                <button
                  key={v}
                  onClick={() => handlePresetClick(v)}
                  className={`px-3 py-1.5 rounded text-sm border ${amount === v ? 'bg-amber-600 border-amber-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-100'} hover:brightness-110`}
                >
                  ¥{v.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* 金額手動入力 */}
          <div className="space-y-1">
            <label className="block text-sm text-gray-300">{t('superTip.modal.amountLabel')}</label>
            <input
              type="number"
              min={100}
              max={10000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded bg-gray-800 border border-gray-600 text-white px-3 py-2"
            />
          </div>

          {/* コメント入力 */}
          <div className="space-y-1">
            <label className="block text-sm text-gray-300">{t('superTip.supportModal.commentLabel')}</label>
            <textarea
              rows={3}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded bg-gray-800 border border-gray-600 text-white px-3 py-2 resize-none"
            />
            <div className="text-xs text-gray-500 text-right">{comment.length} / 500</div>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          {/* 送信ボタン or PaymentElement */}
          {!clientSecret ? (
            <button
              disabled={!canSubmit || loading}
              onClick={createPaymentIntent}
              className="w-full px-4 py-3 rounded bg-amber-600 text-white font-semibold disabled:opacity-50"
            >
              {loading ? t('superTip.modal.processing') : t('superTip.supportModal.startSupport')}
            </button>
          ) : (
            <div className="space-y-3">
              {stripePromise ? (
                <Elements options={{ clientSecret }} stripe={stripePromise}>
                  <PaymentArea onSuccess={onSuccess} returnUrl={returnUrl || window.location.origin} />
                </Elements>
              ) : (
                <div className="text-sm text-red-400">{t('superTip.modal.errors.publishableKeyMissing')}</div>
              )}
            </div>
          )}
      </div>
    </Modal>
  );
};

function PaymentArea({ onSuccess, returnUrl }: { onSuccess?: () => Promise<void> | void; returnUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { t } = useTranslation();

  const onConfirm = useCallback(async () => {
    if (!stripe || !elements) return;
    setErr(null);
    setSubmitting(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
      });
      if (error) {
        setErr(error.message || t('superTip.modal.errors.paymentFailedGeneric'));
      } else {
        if (onSuccess) await onSuccess();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }, [elements, onSuccess, returnUrl, stripe, t]);

  return (
    <div className="space-y-3">
      <PaymentElement />
      {err && <div className="text-sm text-red-400">{err}</div>}
      <button
        onClick={onConfirm}
        disabled={!stripe || !elements || submitting}
        className={`pay-btn w-full ${submitting ? 'is-loading' : ''}`}
        aria-label={submitting ? t('superTip.modal.confirming') : t('superTip.modal.confirmPayment')}
      >
        <span className="pay-btn__content">
          <span className="pay-btn__icon" aria-hidden="true" />
          <span className="pay-btn__label">{submitting ? t('superTip.modal.confirming') : t('superTip.modal.confirmPayment')}</span>
        </span>
      </button>
    </div>
  );
}
