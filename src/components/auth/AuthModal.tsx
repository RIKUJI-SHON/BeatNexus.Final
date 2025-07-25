import React, { useState, useEffect } from 'react';
import { X, MailCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useTranslation, Trans } from 'react-i18next';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  setMode: React.Dispatch<React.SetStateAction<'login' | 'signup'>>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  setMode: setParentMode
}) => {
  const [mode, setLocalMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmationEmailModal, setShowConfirmationEmailModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; dial: string }>({ code: 'JP', dial: '+81' });
  const countryOptions = [
    { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
    { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
    { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
    { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
    { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
    { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
    { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
    { code: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
    { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
    { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
    { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
    { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
    { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
    { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
    // ... add more as needed
  ];
  
  const { signIn, signUp } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    setLocalMode(initialMode);
  }, [initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup' && !phoneVerified) {
      setError(t('auth.error.invalidPhone'));
      setLoading(false);
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError(t('auth.passwordRequirement'));
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        await signIn(email, password);
        onClose();
        navigate('/');
      } else {
        const result = await signUp(email, password, username);
        if (result && result.user && !result.user.email_confirmed_at) {
          setShowConfirmationEmailModal(true);
        } else if (result && result.user) {
          onClose();
          navigate('/');
        } else {
          setError('An unexpected error occurred during sign up.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    setLocalMode(newMode);
    setParentMode(newMode);
    setError(null);
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleSendOtp = async () => {
    let formattedPhone = phoneNumber.trim().replace(/-/g, '').replace(/\s+/g, '');
    formattedPhone = `${selectedCountry.dial}${formattedPhone.replace(/^0+/, '')}`;

    if (!formattedPhone) {
      setError(t('auth.error.invalidPhone'));
      return;
    }
    setSendingOtp(true);
    setError(null);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/phone-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({ action: 'send_code', phoneNumber: formattedPhone })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
      } else {
        setError(data.error || t('auth.error.verificationFailed', { error: '' }));
      }
    } catch (err) {
      setError(t('auth.error.verificationFailed', { error: (err as Error).message }));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) return;
    setVerifyingOtp(true);
    setError(null);
    try {
      let formattedPhone = phoneNumber.trim().replace(/-/g, '').replace(/\s+/g, '');
      formattedPhone = `${selectedCountry.dial}${formattedPhone.replace(/^0+/, '')}`;

      const res = await fetch(`${supabaseUrl}/functions/v1/phone-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({ action: 'verify_code', phoneNumber: formattedPhone, code: otpCode })
      });
      const data = await res.json();
      if (data.success) {
        setPhoneVerified(true);
      } else {
        setError(data.error || t('auth.error.verificationFailed', { error: '' }));
      }
    } catch (err) {
      setError(t('auth.error.verificationFailed', { error: (err as Error).message }));
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 py-8 overflow-y-auto">
        <div className="onboarding-card w-full max-w-md my-auto min-h-fit">
          <div className="onboarding-content">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Tab Navigation */}
            <div className="flex mb-8 border-b border-gray-700">
              <button
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'login'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => switchMode('login')}
              >
                {t('auth.signIn')}
              </button>
              <button
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'signup'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => switchMode('signup')}
              >
                {t('auth.createAccount')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                    {t('auth.username')}
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                    placeholder={t('auth.usernamePlaceholder') as string}
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  placeholder={t('auth.emailPlaceholder') as string}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('auth.password')}
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  placeholder={t('auth.passwordPlaceholder') as string}
                  required
                  minLength={6}
                />
                {mode === 'signup' && (
                  <p className="text-gray-400 text-sm mt-2">{t('auth.passwordRequirement')}</p>
                )}
              </div>

              {/* Country dropdown removed: integrated with phone input */}

              {/* Phone Number (Signup only) */}
              {mode === 'signup' && (
                <>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                      {t('auth.phoneNumber')}
                    </label>
                    <div className="flex w-full">
                      <select
                        id="country"
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const opt = countryOptions.find((c) => c.code === e.target.value);
                          if (opt) setSelectedCountry({ code: opt.code, dial: opt.dial });
                        }}
                        className="px-3 py-3 bg-gray-800/50 border border-r-0 border-gray-600 rounded-l-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors w-28 truncate"
                      >
                        {countryOptions.map((c) => (
                          <option key={c.code} value={c.code}>{`${c.flag ?? c.code} ${c.dial}`}</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        id="phone"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="000-1234-5678"
                        className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm text-center">
                    {t('auth.phoneRequirement')}
                  </p>

                  {!otpSent && !phoneVerified && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="w-full mt-3 transition-all bg-cyan-500 text-white px-6 py-3 rounded-lg border-cyan-600 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-60 disabled:hover:translate-y-0 font-semibold"
                    >
                      {sendingOtp ? t('auth.sending') : t('auth.phoneVerify')}
                    </button>
                  )}

                  {/* OTP input */}
                  {otpSent && !phoneVerified && (
                    <div className="mt-3 space-y-3">
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder={t('auth.phoneVerifyCodePlaceholder') as string}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp}
                        className="w-full transition-all bg-cyan-500 text-white px-6 py-3 rounded-lg border-cyan-600 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-60 disabled:hover:translate-y-0 font-semibold"
                      >
                        {verifyingOtp ? t('auth.verifying') : t('auth.phoneVerifyCodeButton')}
                      </button>
                    </div>
                  )}

                  {phoneVerified && (
                    <p className="text-green-400 text-center mt-2">
                      {t('auth.phoneVerified')}
                    </p>
                  )}
                </>
              )}

              {mode === 'login' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800/50 text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-300">
                    {t('auth.rememberMe')}
                  </label>
                </div>
              )}

              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full cursor-pointer transition-all bg-cyan-500 text-white px-6 py-3 rounded-lg border-cyan-600 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:translate-y-0 disabled:hover:border-b-[4px] disabled:active:translate-y-0 disabled:active:border-b-[4px] font-semibold text-lg"
                disabled={loading || (mode === 'signup' && !phoneVerified)}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {mode === 'login' ? t('auth.signingIn') : t('auth.creatingAccount')}
                  </div>
                ) : (
                  mode === 'login' ? t('auth.signIn') : t('auth.createAccount')
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Confirmation Email Modal */}
      {showConfirmationEmailModal && (
        <Modal 
          isOpen={showConfirmationEmailModal}
          onClose={() => {
            setShowConfirmationEmailModal(false);
            onClose();
            navigate('/');
          }}
          title={t('auth.confirmEmailTitle')}
          size="sm"
        >
          <div className="text-center"><MailCheck className="mx-auto h-16 w-16 text-green-500 mb-4" /></div>
          <p className="text-gray-300 text-center mb-6">
            <Trans
              i18nKey="auth.confirmEmailDescription"
              values={{ email }}
              components={{ strong: <strong className="text-cyan-400" /> }}
            />
          </p>
          <Button 
            variant="primary" 
            onClick={() => {
              setShowConfirmationEmailModal(false);
              onClose();
              navigate('/');
            }}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            {t('auth.gotIt')}
          </Button>
        </Modal>
      )}
    </>
  );
};