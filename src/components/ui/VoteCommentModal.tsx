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
  onVote: (comment: string) => void;
  onSimpleVote: (player: 'A' | 'B') => void;
  player: 'A' | 'B';
  playerName?: string;
  isLoading?: boolean;
  battleId?: string;
  recipientUserId?: string; // 決済時の受け取り先
  onRefreshVoteStatus?: () => Promise<void>;
}

export const VoteCommentModal: React.FC<VoteCommentModalProps> = ({
  isOpen,
  onClose,
  onVote,
  onSimpleVote,
  player,
  playerName,
  isLoading = false,
  battleId,
  recipientUserId,
  onRefreshVoteStatus,
}) => {
  const { t } = useTranslation();
  const [comment, setComment] = useState('');
  const [showError, setShowError] = useState(false);
  // const [showSuperTipModal, setShowSuperTipModal] = useState(false);

  // --- Super Tip (opt-in) ---
  const [superTipOn, setSuperTipOn] = useState(false);
  const [amount, setAmount] = useState<number>(300);
  const [piClientSecret, setPiClientSecret] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [tipError, setTipError] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);

  // バックエンドのエラーコードをユーザー向けの日本語に変換
  const mapBackendError = useCallback((code?: string, fallback?: string) => {
    if (!code) return fallback || 'エラーが発生しました。時間をおいて再度お試しください。';
    switch (code) {
      case 'INVALID_REQUEST':
        return '入力内容が不足しています。金額・コメント・受け取り先を確認してください。';
      case 'SELF_TIP_NOT_ALLOWED':
        return '自分自身へのSuper Tipは行えません。';
      case 'INVALID_AMOUNT':
        return '金額は¥100〜¥10,000の範囲で指定してください。';
      case 'VOTE_NOT_ALLOWED_WITHOUT_BATTLE':
        return 'バトル未指定での投票はできません。';
      case 'BATTLE_NOT_FOUND':
        return '対象のバトルが見つかりませんでした。';
      case 'BATTLE_NOT_ACTIVE':
        return 'このバトルは現在投票できません。';
      case 'ALREADY_TIPPED_IN_BATTLE':
        return 'このバトルでは既にSuper Tipを実行済みです。';
      case 'RECIPIENT_NOT_READY':
        return '受け取り先の設定が完了していないため、決済できません。';
      case 'PI_CREATION_FAILED':
        return '決済の作成に失敗しました。別の支払い方法でお試しください。';
      case 'TIP_INSERT_FAILED':
        return '内部エラーにより記録に失敗しました。しばらくしてから再度お試しください。';
      case 'DUP_CHECK_FAILED':
        return '重複チェックでエラーが発生しました。時間をおいて再度お試しください。';
      case 'INTERNAL_SERVER_ERROR':
        return 'サーバーで問題が発生しました。時間をおいて再度お試しください。';
      default:
        return fallback || 'エラーが発生しました。時間をおいて再度お試しください。';
    }
  }, []);

  const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;
  const TIP_PRESETS = [100, 300, 500, 1000, 3000];

  const canStartTip = useMemo(() => {
    const a = Number(amount);
    return superTipOn ? a >= 100 && a <= 10000 && comment.trim().length > 0 : true;
  }, [amount, comment, superTipOn]);

  const handleCommentVote = () => {
    const trimmedComment = comment.trim();
    
    if (!trimmedComment) {
      setShowError(true);
      return;
    }
    
    onVote(trimmedComment);
  };

  const handleSimpleVote = () => {
    onSimpleVote(player);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    if (showError && e.target.value.trim()) {
      setShowError(false);
    }
  };

  const createPaymentIntent = useCallback(async () => {
    setTipError(null);
    if (!superTipOn) return; // ガード
    if (!canStartTip) {
      setTipError('金額とコメントを確認してください');
      return;
    }
    if (!battleId) {
      setTipError('バトル情報が取得できません');
      return;
    }
    if (!recipientUserId) {
      setTipError('受け取り先ユーザーを特定できません');
      return;
    }
    setTipLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const senderUserId = userData.user?.id;
      if (!senderUserId) {
        setTipError('この操作にはログインが必要です');
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
            setTipError(mapBackendError(parsed?.error || undefined, `エラーが発生しました (HTTP ${r.status})`));
          }
        } catch {
          setTipError(`エラーが発生しました (HTTP ${r.status})`);
        }
        return;
      }
      const resp = data as TipPIResponse;
      if (resp && resp.success && resp.client_secret) {
        setPiClientSecret(resp.client_secret);
        setReturnUrl(resp.recommended_return_url || null);
      } else {
        setTipError(mapBackendError(resp?.error || undefined, '不明なエラーが発生しました'));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTipError(msg);
    } finally {
      setTipLoading(false);
    }
  }, [amount, battleId, canStartTip, comment, mapBackendError, player, recipientUserId, superTipOn]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-md md:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${player === 'A' ? 'bg-cyan-400' : 'bg-pink-400'}`}></div>
              <h2 className="text-xl font-bold text-white">
                {t('voteCommentModal.title')} {playerName || `Player ${player}`}
              </h2>
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
                <label className="text-sm font-medium text-gray-200">応援オプション（Super Tip）</label>
                <button
                  type="button"
                  onClick={() => {
                    setSuperTipOn((v) => !v);
                    setTipError(null);
                    setPiClientSecret(null);
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
                    <div className="text-xs text-red-400">VITE_STRIPE_PUBLISHABLE_KEY が未設定です。決済を利用できません。</div>
                  )}
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">プリセット</div>
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
                    <label className="block text-xs text-gray-400">金額（¥100〜¥10,000）</label>
                    <input
                      type="number"
                      min={100}
                      max={10000}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full rounded bg-gray-800 border border-gray-600 text-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="text-xs text-gray-400">プラットフォーム手数料（約10%）が含まれます。</div>
                  {tipError && <div className="text-sm text-red-400">{tipError}</div>}
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('voteCommentModal.commentLabel')}
              </label>
              <textarea
                value={comment}
                onChange={handleCommentChange}
                placeholder={t('voteCommentModal.commentPlaceholder', { player: playerName || `Player ${player}` })}
                className={`w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 border resize-none ${
                  showError ? 'border-red-500 focus:ring-red-500/50' : 'border-gray-600 focus:ring-cyan-500/50'
                }`}
                rows={3}
                disabled={isLoading}
                maxLength={500}
              />
              <div className="mt-1 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {t('voteCommentModal.characterCount', { count: comment.length })}
                </div>
                {showError && (
                  <div className="text-xs text-red-400">
                    {t('voteCommentModal.commentRequired')}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {!superTipOn ? (
                <>
                  {/* Comment Vote Button */}
                  <button
                    onClick={handleCommentVote}
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
                    onClick={handleSimpleVote}
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
                          処理中…
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <span>💸 決済を開始して投票する</span>
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
                        <div className="text-sm text-red-400">Stripeの公開キーが設定されていないため、決済を続行できません。</div>
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
                      <span>今回は投票だけ</span>
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
        setErr(error.message || '決済エラーが発生しました');
      } else {
        if (onComplete) await onComplete();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }, [elements, onComplete, returnUrl, stripe]);

  return (
    <div className="space-y-3">
      <PaymentElement />
      {err && <div className="text-sm text-red-400">{err}</div>}
      <button
        onClick={onConfirm}
        disabled={!stripe || !elements || submitting}
        className={`pay-btn w-full ${submitting ? 'is-loading' : ''}`}
        aria-label={submitting ? '決済を確認中' : '決済を確定する'}
      >
        <span className="pay-btn__content">
          <span className="pay-btn__icon" aria-hidden="true" />
          <span className="pay-btn__label">{submitting ? '確認中…' : '決済を確定する'}</span>
        </span>
      </button>
    </div>
  );
}
