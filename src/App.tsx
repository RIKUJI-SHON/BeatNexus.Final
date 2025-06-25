import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

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

// Google Analytics
import { initializeGA } from './utils/analytics';
import { useAnalytics, usePerformanceTracking } from './hooks/useAnalytics';

// Onboarding
import OnboardingModal from './components/onboarding/OnboardingModal';
import { useOnboardingStore } from './store/onboardingStore';
import { useAuthStore } from './store/authStore';

// Pages
import HomePage from './pages/HomePage';
import BattlesPage from './pages/BattlesPage';
import BattleViewPage from './pages/BattleViewPage';
import BattleReplayPage from './pages/BattleReplayPage';
import PostPage from './pages/PostPage';
import ProfilePage from './pages/ProfilePage';
import RankingPage from './pages/RankingPage';
import RatingTestPage from './pages/RatingTestPage';
import CommunityPage from './pages/CommunityPage';
import MyBattlesPage from './pages/MyBattlesPage';
import SubscriptionPage from './pages/SubscriptionPage';
import SettingsPage from './pages/SettingsPage';
import TournamentPage from './pages/TournamentPage';
import FAQPage from './pages/FAQPage';
import NotificationTestPage from './pages/NotificationTestPage';
import CommunityDetailPage from './pages/CommunityDetailPage';

// CSS for animations
import './tailwind.extensions.css';
import { useBattleStore } from './store/battleStore';
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
            <Route path="/" element={<HomePage />} />
            <Route path="/battles" element={<BattlesPage />} />
            <Route path="/my-battles" element={<MyBattlesPage />} />
            <Route path="/battle/:id" element={<BattleViewPage />} />
            <Route path="/battle-replay/:id" element={<BattleReplayPage />} />
            <Route path="/post" element={<PostPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/rating-test" element={<RatingTestPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/community/:id" element={<CommunityDetailPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/tournament" element={<TournamentPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/notifications/test" element={<NotificationTestPage />} />
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
  
  // 言語設定の初期化
  useLanguageInitialization();

  useEffect(() => {
    // Google Analytics初期化
    initializeGA();
    
    // バトルのリアルタイム更新は廃止しました（UX改善のため）
    
    // 通知のリアルタイム更新を購読
    const unsubscribeNotifications = subscribeToNotifications();
    
    // 初期の通知データを取得
    fetchNotifications();

    // クリーンアップ
    return () => {
      unsubscribeNotifications();
    };
  }, [subscribeToNotifications, fetchNotifications]);

  // 注意: オンボーディング表示は AuthProvider で新規アカウント作成時のみトリガーされる
  // ここでは手動でのオンボーディング表示制御はしない

  return (
    <Router>
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
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <I18nextProvider i18n={i18n}>
        <AppContent />
      </I18nextProvider>
    </AuthProvider>
  );
}

export default App;