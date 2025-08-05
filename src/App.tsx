import { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Layouts
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

// Toast System
import ToastContainer from './components/ui/ToastContainer';
import { useToastStore } from './store/toastStore';

// PWA Components
import { OfflineIndicator } from './components/ui/OfflineIndicator';

// Auth
import { AuthProvider, useAuthModal } from './components/auth/AuthProvider';
import { AuthModal } from './components/auth/AuthModal';

// Language Initialization
import { useLanguageInitialization } from './hooks/useLanguageInitialization';
import { useOnboardingInitialization } from './hooks/useOnboardingInitialization';

// Google Analytics
import { initializeGA, trackError } from './utils/analytics';
import { useAnalytics, usePerformanceTracking } from './hooks/useAnalytics';

// Error Boundary
import { ErrorBoundary } from './components/ErrorBoundary';

// Onboarding
import OnboardingModal from './components/onboarding/OnboardingModal';
import { useAuthStore } from './store/authStore';

// Battle Result Modal
import { BattleResultModal } from './components/ui/BattleResultModal';
import { useBattleResultStore } from './store/battleResultStore';

// Battle Matched Modal
import { BattleMatchedModal } from './components/ui/BattleMatchedModal';
import { useBattleMatchedStore } from './store/battleMatchedStore';

// New Season Modal
import { NewSeasonModal } from './components/ui/NewSeasonModal';

// Pages
import HomePage from './pages/HomePage';
import HomepageTestPage from './pages/HomepageTestPage';
import BattlesPage from './pages/BattlesPage';
import BattleViewPage from './pages/BattleViewPage';
import BattleReplayPage from './pages/BattleReplayPage';
import PostPage from './pages/PostPage';
import ProfilePage from './pages/ProfilePage';
import RankingPage from './pages/RankingPage';
import RatingTestPage from './pages/RatingTestPage';
import CommunityComingSoonPage from './pages/CommunityComingSoonPage';
import MyBattlesPage from './pages/MyBattlesPage';
import SubscriptionPage from './pages/SubscriptionPage';
import SettingsPage from './pages/SettingsPage';
import TournamentPage from './pages/TournamentPage';
import FAQPage from './pages/FAQPage';
import TermsPage from './pages/TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import NotificationTestPage from './pages/NotificationTestPage';
import CommunityDetailPage from './pages/CommunityDetailPage';
import BattleResultTestPage from './pages/BattleResultTestPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// CSS for animations
import './tailwind.extensions.css';
import { useNotificationStore } from './store/notificationStore';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// Router内で使用するコンポーネント（useLocationが使える）
function RouterContent() {
  // Google Analytics初期化とページトラッキング（Router内で実行）
  useAnalytics();
  usePerformanceTracking();

  return (
    <>
      <div className="min-h-screen">
        <Header />
        <main id="main-content" className="w-full pt-16" role="main">
          <Routes>
            <Route path="/" element={<HomepageTestPage />} />
            <Route path="/old-homepage" element={<HomePage />} />
            <Route path="/battles" element={<BattlesPage />} />
            <Route path="/my-battles" element={<MyBattlesPage />} />
            <Route path="/battle/:battlePath" element={<BattleViewPage />} />
            <Route path="/battle-replay/:battlePath" element={<BattleReplayPage />} />
            <Route path="/post" element={<PostPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/rating-test" element={<RatingTestPage />} />
            <Route path="/community" element={<CommunityComingSoonPage />} />
            <Route path="/community/:id" element={<CommunityDetailPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/tournament" element={<TournamentPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/notifications/test" element={<NotificationTestPage />} />
            <Route path="/result-test" element={<BattleResultTestPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </>
  );
}

function AppContent() {
  const { toasts, removeToast } = useToastStore();
  // const subscribeToRealTimeUpdates = useBattleStore(state => state.subscribeToRealTimeUpdates); // 廃止済み
  const { fetchNotifications, subscribeToNotifications } = useNotificationStore();
  const { user } = useAuthStore();
  // オンボーディングは AuthProvider で管理されているため、ここでは不要
  const { isAuthModalOpen, authModalMode, closeAuthModal } = useAuthModal();
  
  // Battle Result Modal
  const { pendingResult, isModalOpen, closeResultModal } = useBattleResultStore();
  
  // Battle Matched Modal
  const { pendingMatch, isModalOpen: isMatchModalOpen, closeMatchModal } = useBattleMatchedStore();
  
  useEffect(() => {
    console.log('🎯 [App] BattleResultStore state:', { pendingResult, isModalOpen });
  }, [pendingResult, isModalOpen]);
  
  useEffect(() => {
    console.log('⚡ [App] BattleMatchedStore state change detected:', { 
      isMatchModalOpen, 
      hasPendingMatch: !!pendingMatch,
      pendingMatchData: pendingMatch 
    });
  }, [isMatchModalOpen, pendingMatch]);
  
  // 言語設定の初期化
  useLanguageInitialization();
  
  // オンボーディング状況の初期化
  useOnboardingInitialization();

  useEffect(() => {
    // Google Analytics初期化
    initializeGA();
    
    // バトルのリアルタイム更新は廃止しました（UX改善のため）
    
    // ユーザーがログインしている場合のみ通知関連の処理を実行
    if (user) {
      console.log('🔄 [App] User authenticated, starting notification system for user:', user.id);
      
      // 通知のリアルタイム更新を購読
      const unsubscribeNotifications = subscribeToNotifications();
      
      // 初期の通知データを取得
      fetchNotifications();

      // クリーンアップ
      return () => {
        console.log('🧹 [App] Cleaning up notification subscription');
        unsubscribeNotifications();
      };
    } else {
      console.log('🚫 [App] No authenticated user, skipping notification system');
    }
  }, [user, subscribeToNotifications, fetchNotifications]); // checkForNewSeason, fetchActiveSeasonを依存配列から削除

  // 注意: オンボーディング表示は AuthProvider で新規アカウント作成時のみトリガーされる
  // ここでは手動でのオンボーディング表示制御はしない

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RouterContent />
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* PWA Components */}
      <OfflineIndicator />
      
      {/* Onboarding Modal */}
      <OnboardingModal />
      
      {/* Auth Modal - Global Level */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalMode}
        setMode={() => {}} // モード変更は不要（Context経由で管理）
      />
      
      {/* Battle Result Modal - Global Level */}
      <BattleResultModal
        isOpen={isModalOpen}
        onClose={closeResultModal}
        result={pendingResult}
      />
      
      {/* Battle Matched Modal - Global Level */}
      <BattleMatchedModal
        isOpen={isMatchModalOpen}
        onClose={closeMatchModal}
        matchData={pendingMatch}
      />
      
      {/* New Season Modal - Global Level */}
      <NewSeasonModal />
    </Router>
  );
}

function App() {
  // グローバルエラーハンドリング
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      trackError('Unhandled Promise Rejection', event.reason?.toString());
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      trackError('Global Error', `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <I18nextProvider i18n={i18n}>
          <HelmetProvider>
            <AppContent />
          </HelmetProvider>
        </I18nextProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;