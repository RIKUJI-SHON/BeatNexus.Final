import React, { useState, useEffect } from 'react';
import { X, MailCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

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
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmationEmailModal, setShowConfirmationEmailModal] = useState(false);
  
  const { signIn, signUp } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    setLocalMode(initialMode);
  }, [initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        await signIn(email, password, rememberMe);
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
                Sign In
              </button>
              <button
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  mode === 'signup'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => switchMode('signup')}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                    placeholder="Choose a username"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                {mode === 'signup' && (
                  <p className="text-gray-400 text-sm mt-2">Password must be at least 6 characters long</p>
                )}
              </div>

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
                    Remember me
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
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
                  </div>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
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
          title="Confirm Your Email"
          size="sm"
        >
          <div className="text-center"><MailCheck className="mx-auto h-16 w-16 text-green-500 mb-4" /></div>
          <p className="text-gray-300 text-center mb-6">
            We've sent a confirmation link to <strong className="text-cyan-400">{email}</strong>. 
            Please check your inbox (and spam folder) to complete your registration.
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
            Got it!
          </Button>
        </Modal>
      )}
    </>
  );
};