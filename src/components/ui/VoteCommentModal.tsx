import React, { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
// import { SuperTipVoteModal } from '../voting/SuperTipVoteModal'; // Temporarily disabled - will be reimplemented

interface VoteCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVote: (comment: string, scoreSheet?: { skills: {A:number;B:number}; musicality:{A:number;B:number}; originality:{A:number;B:number} }) => void;
  onSimpleVote: (player: 'A' | 'B', scoreSheet?: { skills: {A:number;B:number}; musicality:{A:number;B:number}; originality:{A:number;B:number} }) => void;
  player: 'A' | 'B';
  isLoading?: boolean;
  battleId?: string;
  recipientUserId?: string; // 決済時の受け取り先
  onRefreshVoteStatus?: () => Promise<void>;
  initialSupportOn?: boolean; // 追加: 初期状態で支援ONにする
}

export const VoteCommentModal: React.FC<VoteCommentModalProps> = ({
  isOpen,
  onClose,
  onVote,
  onSimpleVote,
  player,
  isLoading = false,
  battleId,
  recipientUserId,
  onRefreshVoteStatus,
  initialSupportOn = false,
}) => {
  const { t } = useTranslation();
  const [comment, setComment] = useState('');
  const [showError, setShowError] = useState(false);
  // const [showSuperTipModal, setShowSuperTipModal] = useState(false);

  // --- Super Tip (opt-in) ---
  const [superTipOn, setSuperTipOn] = useState(initialSupportOn);
  const [amount, setAmount] = useState<number>(300);
  const [piClientSecret, setPiClientSecret] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [tipError, setTipError] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const [showTipCommentError, setShowTipCommentError] = useState(false);

  // --- Score Sheet (local-only UI) ---
  const [useScoreSheet, setUseScoreSheet] = useState(false);
  type ScoreState = {
    skillA: number; skillB: number;
    musicalityA: number; musicalityB: number;
    originalityA: number; originalityB: number;
  };
  const [scoreSheet, setScoreSheet] = useState<ScoreState>({
    skillA: 0,
    skillB: 0,
    musicalityA: 0,
    musicalityB: 0,
    originalityA: 0,
    originalityB: 0,
  });

  const clamp100 = (n: number) => {
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  const totalA = scoreSheet.skillA + scoreSheet.musicalityA + scoreSheet.originalityA;
  const totalB = scoreSheet.skillB + scoreSheet.musicalityB + scoreSheet.originalityB;

  type ScoreKey = 'skills' | 'musicality' | 'originality';
  const getValue = React.useCallback((key: ScoreKey, player: 'A'|'B') => {
    switch (key) {
      case 'skills': return player === 'A' ? scoreSheet.skillA : scoreSheet.skillB;
      case 'musicality': return player === 'A' ? scoreSheet.musicalityA : scoreSheet.musicalityB;
      case 'originality': return player === 'A' ? scoreSheet.originalityA : scoreSheet.originalityB;
    }
  }, [scoreSheet]);
  const setValue = React.useCallback((key: ScoreKey, player: 'A'|'B', v: number) => {
    setScoreSheet(prev => {
      const next: ScoreState = { ...prev };
      if (key === 'skills') {
        if (player === 'A') next.skillA = v; else next.skillB = v;
      }
      if (key === 'musicality') {
        if (player === 'A') next.musicalityA = v; else next.musicalityB = v;
      }
      if (key === 'originality') {
        if (player === 'A') next.originalityA = v; else next.originalityB = v;
      }
      return next;
    });
  }, []);

  // バックエンドのエラーコードをユーザー向けの日本語に変換
  const mapBackendError = useCallback((code?: string, fallback?: string) => {
    if (!code) return fallback || t('superTip.errors.generic');
    switch (code) {
      case 'INVALID_REQUEST':
        return t('superTip.errors.invalidRequest');
      case 'SELF_TIP_NOT_ALLOWED':
        return t('superTip.errors.selfTipNotAllowed');
      case 'INVALID_AMOUNT':
        return t('superTip.errors.invalidAmount');
      case 'VOTE_NOT_ALLOWED_WITHOUT_BATTLE':
        return t('superTip.errors.voteNotAllowedWithoutBattle');
      case 'BATTLE_NOT_FOUND':
        return t('superTip.errors.battleNotFound');
      case 'BATTLE_NOT_ACTIVE':
        return t('superTip.errors.battleNotActive');
      case 'ALREADY_TIPPED_IN_BATTLE':
        return t('superTip.errors.alreadyTippedInBattle');
      case 'RECIPIENT_NOT_READY':
        return t('superTip.errors.recipientNotReady');
      case 'PI_CREATION_FAILED':
        return t('superTip.errors.piCreationFailed');
      case 'TIP_INSERT_FAILED':
        return t('superTip.errors.tipInsertFailed');
      case 'DUP_CHECK_FAILED':
        return t('superTip.errors.dupCheckFailed');
      case 'INTERNAL_SERVER_ERROR':
        return t('superTip.errors.internal');
      default:
        return fallback || t('superTip.errors.generic');
    }
  }, [t]);

  const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;
  const TIP_PRESETS = [100, 300, 500, 1000, 3000];

  const canStartTip = useMemo(() => {
    const a = Number(amount);
    return superTipOn ? a >= 100 && a <= 10000 && comment.trim().length > 0 : true;
  }, [amount, comment, superTipOn]);

  const buildScoreSheetPayload = () => {
    if (!useScoreSheet) return undefined;
    return {
      skills: { A: scoreSheet.skillA, B: scoreSheet.skillB },
      musicality: { A: scoreSheet.musicalityA, B: scoreSheet.musicalityB },
      originality: { A: scoreSheet.originalityA, B: scoreSheet.originalityB },
    } as const;
  };

  const handleCommentVote = () => {
    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      setShowError(true);
      return;
    }
    onVote(trimmedComment, buildScoreSheetPayload());
  };

  const handleSimpleVote = () => {
    onSimpleVote(player, buildScoreSheetPayload());
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    if (showError && e.target.value.trim()) {
      setShowError(false);
    }
    if (showTipCommentError && e.target.value.trim()) {
      setShowTipCommentError(false);
    }
  };

  const createPaymentIntent = useCallback(async () => {
    setTipError(null);
    if (!superTipOn) return; // ガード
    if (!canStartTip) {
  if (comment.trim().length === 0) setShowTipCommentError(true);
      setTipError(t('superTip.modal.errors.checkAmountAndComment'));
      return;
    }
    if (!battleId) {
      setTipError(t('superTip.modal.errors.missingBattle'));
      return;
    }
    if (!recipientUserId) {
      setTipError(t('superTip.modal.errors.missingRecipient'));
      return;
    }
    setTipLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const senderUserId = userData.user?.id;
      if (!senderUserId) {
        setTipError(t('superTip.modal.errors.loginRequired'));
        return;
      }

      const payload = {
        battle_id: battleId,
        sender_user_id: senderUserId,
        recipient_user_id: recipientUserId,
        vote: player,
        amount_jpy: Number(amount),
        comment: comment.trim(),
      };

    type TipPIResponse = { success: boolean; client_secret?: string; recommended_return_url?: string; error?: string } | null;
  const { data, error } = await supabase.functions.invoke('vote-with-super-tip-vote', { body: payload });
      if (error) {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vote-with-super-tip-vote`;
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
            setPiClientSecret(parsed.client_secret);
            setReturnUrl(parsed.recommended_return_url || null);
          } else {
            setTipError(mapBackendError(parsed?.error || undefined, t('superTip.errors.http', { code: r.status }))); 
          }
        } catch {
          setTipError(t('superTip.errors.http', { code: r.status }));
        }
        return;
      }
      const resp = data as TipPIResponse;
      if (resp && resp.success && resp.client_secret) {
        setPiClientSecret(resp.client_secret);
        setReturnUrl(resp.recommended_return_url || null);
      } else {
        setTipError(mapBackendError(resp?.error || undefined, t('superTip.errors.unknown')));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTipError(msg);
    } finally {
      setTipLoading(false);
    }
  }, [amount, battleId, canStartTip, comment, mapBackendError, player, recipientUserId, superTipOn, t]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-md md:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${player === 'A' ? 'bg-cyan-400' : 'bg-pink-400'}`}></div>
              <h2 className="text-xl font-bold text-white">{t('voteCommentModal.title')}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
              disabled={isLoading}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {/* SuperTip Opt-in */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-200">{t('superTip.modal.supportOption')}</label>
                <button
                  type="button"
                  onClick={() => {
                    setSuperTipOn((v) => !v);
                    setTipError(null);
                    setPiClientSecret(null);
                    setShowTipCommentError(false);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${superTipOn ? 'bg-amber-500' : 'bg-gray-600'}`}
                  aria-pressed={superTipOn}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${superTipOn ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              {superTipOn && (
                <div className="mt-3 space-y-3">
                  {!STRIPE_PUBLISHABLE_KEY && (
                    <div className="text-xs text-red-400">{t('superTip.modal.errors.publishableKeyMissing')}</div>
                  )}
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">{t('superTip.modal.presets')}</div>
                    <div className="flex flex-wrap gap-2">
                      {TIP_PRESETS.map(v => (
                        <button
                          key={v}
                          onClick={() => setAmount(v)}
                          className={`px-3 py-1.5 rounded text-xs border ${amount === v ? 'bg-amber-600 border-amber-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-100'} hover:brightness-110`}
                        >
                          ¥{v.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-gray-400">{t('superTip.modal.amountLabel')}</label>
                    <input
                      type="number"
                      min={100}
                      max={10000}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full rounded bg-gray-800 border border-gray-600 text-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="text-xs text-gray-400">{t('superTip.modal.feeNote')}</div>
                  {tipError && <div className="text-sm text-red-400">{tipError}</div>}
                </div>
              )}
            </div>

            {/* Score Sheet Opt-in (under Super Tip) */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-200">{t('voteCommentModal.useScoreSheet')}</label>
                <button
                  type="button"
                  onClick={() => setUseScoreSheet(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${useScoreSheet ? 'bg-cyan-500' : 'bg-gray-600'}`}
                  aria-pressed={useScoreSheet}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${useScoreSheet ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {useScoreSheet && (
                <div className="mt-3 space-y-4">
                  <div className="text-xs text-gray-400">{t('voteCommentModal.scoreSheetNote')}</div>

                  {/* Rows: Skills, Musicality, Originality */}
                  {([{
                    key: 'skills',
                    label: t('voteCommentModal.section.skills')
                  }, {
                    key: 'musicality',
                    label: t('voteCommentModal.section.musicality')
                  }, {
                    key: 'originality',
                    label: t('voteCommentModal.section.originality')
                  }] as { key: ScoreKey; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="border border-gray-700 rounded-lg p-3 bg-gray-900">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-200">{label}</span>
                        <span className="text-[10px] text-gray-500">{t('voteCommentModal.scoreRange', '0-100')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Player A */}
                        <div>
                          <label className="block text-xs text-cyan-300 mb-1">{t('common.playerA', 'Player A')}</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={getValue(key, 'A')}
                            onChange={(e) => setValue(key, 'A', clamp100(Number(e.target.value)))}
                            className="w-full rounded bg-gray-800 border border-gray-600 text-white px-3 py-2 text-sm"
                          />
                        </div>
                        {/* Player B */}
                        <div>
                          <label className="block text-xs text-pink-300 mb-1">{t('common.playerB', 'Player B')}</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={getValue(key, 'B')}
                            onChange={(e) => setValue(key, 'B', clamp100(Number(e.target.value)))}
                            className="w-full rounded bg-gray-800 border border-gray-600 text-white px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="flex items-center justify-center gap-4">
                    <div className="px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-sm">
                      <span className="text-cyan-300 font-semibold mr-2">{t('common.playerA', 'Player A')}</span>
                      <span className="text-white font-bold">{totalA}</span>
                      <span className="text-gray-400 text-xs ml-1">{t('voteCommentModal.maxTotal', { max: 300, defaultValue: '/ 300' })}</span>
                    </div>
                    <div className="px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-sm">
                      <span className="text-pink-300 font-semibold mr-2">{t('common.playerB', 'Player B')}</span>
                      <span className="text-white font-bold">{totalB}</span>
                      <span className="text-gray-400 text-xs ml-1">{t('voteCommentModal.maxTotal', { max: 300, defaultValue: '/ 300' })}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {superTipOn ? t('voteCommentModal.commentLabelRequired') : t('voteCommentModal.commentLabel')}
              </label>
              <textarea
                value={comment}
                onChange={handleCommentChange}
                placeholder={t('voteCommentModal.commentPlaceholder')}
                className={`w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 border resize-none ${
                  (showError || (superTipOn && showTipCommentError)) ? 'border-red-500 focus:ring-red-500/50' : 'border-gray-600 focus:ring-cyan-500/50'
                }`}
                rows={3}
                disabled={isLoading}
                maxLength={500}
                required={superTipOn}
                aria-required={superTipOn}
              />
              <div className="mt-1 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {t('voteCommentModal.characterCount', { count: comment.length })}
                </div>
                {showError && !superTipOn && (
                  <div className="text-xs text-red-400">{t('voteCommentModal.commentRequired')}</div>
                )}
                {superTipOn && showTipCommentError && (
                  <div className="text-xs text-red-400">{t('voteCommentModal.commentRequiredForSupport')}</div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {!superTipOn ? (
                <>
                  {/* Comment Vote Button */}
                  <button
                    onClick={() => {
                      handleCommentVote();
                    }}
                    disabled={isLoading}
                    className={`cursor-pointer transition-all text-white px-6 py-3 rounded-lg border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed ${
                      player === 'A' 
                        ? 'bg-cyan-500 border-cyan-600' 
                        : 'bg-pink-500 border-pink-600'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('voteCommentModal.voting')}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>💬 {t('voteCommentModal.commentVote')} ({t('voteCommentModal.commentVotePoints')})</span>
                      </div>
                    )}
                  </button>

                  {/* Simple Vote Button */}
                  <button
                    onClick={() => {
                      handleSimpleVote();
                    }}
                    disabled={isLoading}
                    className="cursor-pointer transition-all text-white px-6 py-3 rounded-lg border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed bg-gray-600 border-gray-700"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('voteCommentModal.voting')}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>👍 {t('voteCommentModal.simpleVote')} ({t('voteCommentModal.simpleVotePoints')})</span>
                      </div>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Super Tip: Start or Confirm Payment */}
                  {!piClientSecret ? (
                    <button
                      onClick={createPaymentIntent}
                      disabled={isLoading || tipLoading || !canStartTip}
                      className={`cursor-pointer transition-all text-white px-6 py-3 rounded-lg border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed ${
                        player === 'A' 
                          ? 'bg-cyan-500 border-cyan-600' 
                          : 'bg-pink-500 border-pink-600'
                      }`}
                    >
            {tipLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {t('superTip.modal.processing')}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
              <span>💸 {t('superTip.modal.startPaymentAndVote')}</span>
                        </div>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      {stripePromise ? (
                        <Elements options={{ clientSecret: piClientSecret }} stripe={stripePromise}>
                          <PaymentSection
                            onComplete={async () => {
                              // 決済完了後はwebhookで反映 → 一覧再取得
                              try {
                                if (typeof onRefreshVoteStatus === 'function') {
                                  await onRefreshVoteStatus();
                                }
                              } finally {
                                onClose();
                              }
                            }}
                            returnUrl={returnUrl || window.location.origin}
                          />
                        </Elements>
                      ) : (
                        <div className="text-sm text-red-400">{t('superTip.modal.errors.publishableKeyMissing')}</div>
                      )}
                    </div>
                  )}

                  {/* Secondary: vote only */}
                  <button
                    onClick={handleSimpleVote}
                    disabled={isLoading}
                    className="cursor-pointer transition-all text-white px-6 py-3 rounded-lg border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed bg-gray-600 border-gray-700"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>{t('superTip.modal.voteOnlyNow')}</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

  {/* SuperTip Modal removed as requested */}
    </>
  );
};

function PaymentSection({ onComplete, returnUrl }: { onComplete?: () => Promise<void> | void; returnUrl: string }) {
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
        if (onComplete) await onComplete();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }, [elements, onComplete, returnUrl, stripe, t]);

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
