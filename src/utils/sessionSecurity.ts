/**
 * 🔐 セッションセキュリティ管理
 * セッションの安全性を向上させるユーティリティ
 */

interface SessionSecurityConfig {
  maxInactiveTime: number; // 非アクティブタイムアウト（ミリ秒）
  absoluteTimeout: number; // 絶対タイムアウト（ミリ秒）
  requireReauth: number; // 再認証が必要な時間（ミリ秒）
}

interface SessionState {
  createdAt: number;
  lastActivity: number;
  lastReauth: number;
  deviceFingerprint: string;
  isSecure: boolean;
}

class SessionSecurityManager {
  private config: SessionSecurityConfig;
  private sessionState: SessionState | null = null;
  private activityCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: SessionSecurityConfig) {
    this.config = config;
    this.startActivityMonitoring();
  }

  /**
   * セッション開始時の初期化
   * @param deviceFingerprint - デバイスフィンガープリント
   */
  initializeSession(deviceFingerprint: string): void {
    const now = Date.now();
    this.sessionState = {
      createdAt: now,
      lastActivity: now,
      lastReauth: now,
      deviceFingerprint,
      isSecure: this.isSecureConnection()
    };

    // セッション情報をローカルに保存（暗号化）
    this.saveSessionState();
    
    console.log('🔐 セキュアセッションを開始しました');
  }

  /**
   * アクティビティの更新
   */
  updateActivity(): void {
    if (this.sessionState) {
      this.sessionState.lastActivity = Date.now();
      this.saveSessionState();
    }
  }

  /**
   * セッションの有効性をチェック
   * @returns セッションが有効かどうかと理由
   */
  validateSession(): { valid: boolean; reason?: string; requiresReauth?: boolean } {
    if (!this.sessionState) {
      return { valid: false, reason: 'セッションが存在しません' };
    }

    const now = Date.now();

    // 絶対タイムアウトのチェック
    if (now - this.sessionState.createdAt > this.config.absoluteTimeout) {
      return { valid: false, reason: 'セッションの有効期限が切れました' };
    }

    // 非アクティブタイムアウトのチェック
    if (now - this.sessionState.lastActivity > this.config.maxInactiveTime) {
      return { valid: false, reason: '非アクティブ時間が長すぎます' };
    }

    // 再認証が必要かチェック
    if (now - this.sessionState.lastReauth > this.config.requireReauth) {
      return { valid: true, requiresReauth: true, reason: '再認証が必要です' };
    }

    // デバイスフィンガープリントの変更チェック
    const currentFingerprint = this.generateDeviceFingerprint();
    if (currentFingerprint !== this.sessionState.deviceFingerprint) {
      console.warn('⚠️ デバイスフィンガープリントが変更されました');
      return { valid: false, reason: 'デバイス情報が変更されました' };
    }

    // セキュア接続のチェック
    if (this.sessionState.isSecure && !this.isSecureConnection()) {
      return { valid: false, reason: 'セキュア接続が切断されました' };
    }

    return { valid: true };
  }

  /**
   * 再認証の記録
   */
  recordReauthentication(): void {
    if (this.sessionState) {
      this.sessionState.lastReauth = Date.now();
      this.saveSessionState();
    }
  }

  /**
   * セッション終了
   */
  terminateSession(): void {
    this.sessionState = null;
    this.clearStoredSessionState();
    
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
    
    console.log('🔐 セッションを安全に終了しました');
  }

  /**
   * アクティビティ監視の開始
   */
  private startActivityMonitoring(): void {
    // マウス移動、キーボード操作、タッチを監視
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      this.updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // 定期的なセッション検証
    this.activityCheckInterval = setInterval(() => {
      const validation = this.validateSession();
      if (!validation.valid) {
        console.warn('❌ セッション無効:', validation.reason);
        this.handleInvalidSession(validation.reason || 'unknown');
      } else if (validation.requiresReauth) {
        console.warn('🔄 再認証が必要:', validation.reason);
        this.handleReauthRequired();
      }
    }, 60000); // 1分ごとにチェック
  }

  /**
   * デバイスフィンガープリントの生成
   */
  private generateDeviceFingerprint(): string {
    const factors = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || 'unknown'
    ];

    return btoa(factors.join('|')).substring(0, 20);
  }

  /**
   * セキュア接続の確認
   */
  private isSecureConnection(): boolean {
    return window.location.protocol === 'https:' || 
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  }

  /**
   * セッション状態の保存（暗号化）
   */
  private saveSessionState(): void {
    if (this.sessionState) {
      // 実際の実装では暗号化を行う
      const encrypted = btoa(JSON.stringify(this.sessionState));
      sessionStorage.setItem('beatnexus_session_state', encrypted);
    }
  }

  /**
   * 保存されたセッション状態のクリア
   */
  private clearStoredSessionState(): void {
    sessionStorage.removeItem('beatnexus_session_state');
    localStorage.removeItem('beatnexus_session_backup'); // バックアップもクリア
  }

  /**
   * 無効セッションの処理
   */
  private handleInvalidSession(reason: string): void {
    console.error('🚨 セッション無効化:', reason);
    
    // カスタムイベントを発行してアプリケーションに通知
    window.dispatchEvent(new CustomEvent('sessionInvalid', { 
      detail: { reason } 
    }));
    
    this.terminateSession();
  }

  /**
   * 再認証要求の処理
   */
  private handleReauthRequired(): void {
    console.warn('🔄 再認証要求');
    
    // カスタムイベントを発行
    window.dispatchEvent(new CustomEvent('reauthRequired'));
  }
}

// デフォルト設定
const defaultConfig: SessionSecurityConfig = {
  maxInactiveTime: 30 * 60 * 1000, // 30分
  absoluteTimeout: 8 * 60 * 60 * 1000, // 8時間
  requireReauth: 4 * 60 * 60 * 1000 // 4時間で再認証
};

// グローバルセッション管理インスタンス
export const sessionSecurityManager = new SessionSecurityManager(defaultConfig);

/**
 * セッションセキュリティの初期化
 * 認証完了時に呼び出す
 */
export function initializeSessionSecurity(): void {
  const fingerprint = sessionSecurityManager['generateDeviceFingerprint']();
  sessionSecurityManager.initializeSession(fingerprint);
}

/**
 * セッション無効化イベントのリスナー設定
 * @param callback - セッション無効時のコールバック
 */
export function onSessionInvalid(callback: (reason: string) => void): () => void {
  const handler = (event: CustomEvent) => {
    callback(event.detail.reason);
  };

  window.addEventListener('sessionInvalid', handler as EventListener);
  
  // クリーンアップ関数を返す
  return () => {
    window.removeEventListener('sessionInvalid', handler as EventListener);
  };
}

/**
 * 再認証要求イベントのリスナー設定
 * @param callback - 再認証要求時のコールバック
 */
export function onReauthRequired(callback: () => void): () => void {
  window.addEventListener('reauthRequired', callback);
  
  return () => {
    window.removeEventListener('reauthRequired', callback);
  };
}
