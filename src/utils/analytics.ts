import ReactGA from 'react-ga4';

// Google Analytics トラッキング ID
const GA_TRACKING_ID = 'G-P7Q1HTZNNW';

// 開発環境かどうかの判定（複数条件でより確実に判定）
const isDevelopment = import.meta.env.DEV || 
                      import.meta.env.MODE === 'development' ||
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.port === '3000';

// User IDの重複設定を防ぐためのトラッキング
let currentSetUserId: string | null = null;
let sessionStartTime: number | null = null;

/**
 * Google Analytics の初期化
 */
export const initializeGA = (): void => {
  // 開発環境の詳細ログ
  console.log('GA Environment Check:', {
    'import.meta.env.DEV': import.meta.env.DEV,
    'import.meta.env.MODE': import.meta.env.MODE,
    'window.location.hostname': window.location.hostname,
    'window.location.port': window.location.port,
    'isDevelopment': isDevelopment
  });

  if (!isDevelopment) {
    try {
      ReactGA.initialize(GA_TRACKING_ID, {
        gtagOptions: {
          // プライバシー設定
          anonymize_ip: true,
          cookie_flags: 'SameSite=Strict;Secure',
        },
      });
      console.log('🚀 Google Analytics initialized for PRODUCTION');
    } catch (error) {
      console.error('❌ Failed to initialize Google Analytics:', error);
    }
  } else {
    // 開発環境ではログのみ出力
    console.log('🛠️ Google Analytics: Development mode - tracking DISABLED');
    console.log('📍 Running on:', window.location.origin);
    
    // 開発環境でのGAスクリプト読み込みも防ぐ
    if (typeof window !== 'undefined') {
      (window as any).gtag = (window as any).gtag || function() {
        console.log('🚫 gtag call blocked in development:', arguments);
      };
    }
  }
};

/**
 * ページビューのトラッキング
 * @param path - ページのパス
 * @param title - ページのタイトル（オプション）
 */
export const trackPageView = (path: string, title?: string): void => {
  if (!isDevelopment) {
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: title,
    });
    console.log(`GA: Page view tracked - ${path}`);
  } else {
    console.log(`GA [DEV]: Page view would be tracked - ${path}`);
  }
};

/**
 * カスタムイベントのトラッキング
 * @param action - イベントのアクション
 * @param category - イベントのカテゴリ
 * @param label - イベントのラベル（オプション）
 * @param value - イベントの値（オプション）
 */
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
): void => {
  if (!isDevelopment) {
    ReactGA.event({
      action,
      category,
      label,
      value,
    });
    console.log(`GA: Event tracked - ${category}:${action}${label ? ` (${label})` : ''}`);
  } else {
    console.log(`GA [DEV]: Event would be tracked - ${category}:${action}${label ? ` (${label})` : ''}`);
  }
};

/**
 * BeatNexus固有のイベントトラッキング関数
 */
export const trackBeatNexusEvents = {
  // バトル関連
  activeBattleView: (battleId: string) => trackEvent('view_active_battle', 'battle', battleId),
  archivedBattleView: (battleId: string) => trackEvent('view_archived_battle', 'battle', battleId),
  battleVote: (battleId: string) => trackEvent('vote_battle', 'battle', battleId),
  battleShare: (battleId: string) => trackEvent('share_battle', 'battle', battleId),
  
  // 投稿関連
  videoSubmit: (battleFormat: string) => trackEvent('submit_video', 'submission', battleFormat),
  videoUpload: (uploadMethod: string) => trackEvent('upload_video', 'submission', uploadMethod),
  
  // ユーザー関連
  profileView: (userId: string) => trackEvent('view_profile', 'user', userId),
  profileEdit: () => trackEvent('edit_profile', 'user'),
  userRegister: () => trackEvent('register', 'user'),
  userLogin: () => trackEvent('login', 'user'), // 常にログインイベントを発火
  userLogout: () => trackEvent('logout', 'user'),
  
  // ランキング関連
  rankingView: (rankingType: 'rating' | 'voter', subType?: string) => {
    const label = subType ? `${rankingType}_${subType}` : rankingType;
    trackEvent('view_ranking', 'ranking', label);
  },
  
  // コミュニティ関連
  postCreate: () => trackEvent('create_post', 'community'),
  postLike: (postId: string) => trackEvent('like_post', 'community', postId),
  commentCreate: (postId: string) => trackEvent('create_comment', 'community', postId),
  
  // 設定関連
  languageChange: (language: string) => trackEvent('change_language', 'settings', language),
  
  // その他
  searchPerform: (query: string) => trackEvent('search', 'navigation', query),
  linkClick: (linkUrl: string, linkText: string) => trackEvent('click_link', 'navigation', `${linkText}|${linkUrl}`),
};

/**
 * ユーザー情報の設定（プライバシー保護）
 * @param userId - ユーザーID（ハッシュ化されたもの）
 * @param isNewLogin - 新規ログインかどうか（デフォルト: false）
 */
export const setUserProperties = (userId: string, isNewLogin: boolean = false): void => {
  // 同じUser IDが既に設定されている場合はスキップ
  if (currentSetUserId === userId) {
    console.log(`GA: User ID already set for user ${userId}, skipping duplicate setting`);
    return;
  }

  // セッション開始から短時間内（10秒以内）での重複設定を防ぐ
  const now = Date.now();
  if (sessionStartTime && (now - sessionStartTime) < 10000) {
    console.log(`GA: Preventing duplicate User ID setting within session start period`);
    return;
  }

  if (!isDevelopment) {
    ReactGA.set({ user_id: userId });
    currentSetUserId = userId;
    sessionStartTime = now;
    console.log(`GA: User properties set for user ${userId}`);
    
    // 新規ログインの場合のみログインイベントを発火
    if (isNewLogin) {
      trackBeatNexusEvents.userLogin();
    }
  } else {
    currentSetUserId = userId;
    sessionStartTime = now;
    console.log(`GA [DEV]: User properties would be set for user ${userId}`);
    
    if (isNewLogin) {
      console.log(`GA [DEV]: Login event would be tracked for user ${userId}`);
    }
  }
};

/**
 * ユーザーログアウト時のUser IDクリア
 */
export const clearUserProperties = (): void => {
  currentSetUserId = null;
  sessionStartTime = null;
  if (!isDevelopment) {
    ReactGA.set({ user_id: undefined });
    console.log('GA: User properties cleared (logged out)');
  } else {
    console.log('GA [DEV]: User properties would be cleared (logged out)');
  }
};

/**
 * エラーイベントのトラッキング
 * @param error - エラー情報
 * @param errorInfo - 追加のエラー情報
 */
export const trackError = (error: string, errorInfo?: string): void => {
  if (!isDevelopment) {
    trackEvent('error', 'application', `${error}${errorInfo ? ` - ${errorInfo}` : ''}`);
  } else {
    console.log(`GA [DEV]: Error would be tracked - ${error}${errorInfo ? ` - ${errorInfo}` : ''}`);
  }
};

/**
 * タイミングイベントのトラッキング（パフォーマンス計測）
 * @param name - タイミング名
 * @param value - タイミング値（ミリ秒）
 * @param category - タイミングカテゴリ
 */
export const trackTiming = (name: string, value: number, category: string = 'performance'): void => {
  if (!isDevelopment) {
    ReactGA.gtag('event', 'timing_complete', {
      name,
      value,
      event_category: category,
    });
    console.log(`GA: Timing tracked - ${category}:${name} (${value}ms)`);
  } else {
    console.log(`GA [DEV]: Timing would be tracked - ${category}:${name} (${value}ms)`);
  }
}; 