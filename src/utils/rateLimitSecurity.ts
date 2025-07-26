/**
 * 🛡️ レート制限・ブルートフォース攻撃対策
 * クライアントサイドでの基本的な制限機能
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // ミリ秒
  blockDurationMs: number; // ミリ秒 
}

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private attempts: Map<string, AttemptRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * レート制限をチェックし、試行を記録
   * @param identifier - 制限対象の識別子（IPアドレス、ユーザーIDなど）
   * @returns 制限に引っかかった場合はfalse
   */
  checkLimit(identifier: string): { allowed: boolean; remainingAttempts?: number; retryAfter?: number } {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    // ブロック期間中かチェック
    if (record?.blockedUntil && now < record.blockedUntil) {
      return {
        allowed: false,
        retryAfter: Math.ceil((record.blockedUntil - now) / 1000) // 秒単位
      };
    }

    // ウィンドウ外の場合はリセット
    if (!record || (now - record.firstAttempt) > this.config.windowMs) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return {
        allowed: true,
        remainingAttempts: this.config.maxAttempts - 1
      };
    }

    // 試行回数をインクリメント
    record.count++;
    record.lastAttempt = now;

    // 制限に引っかかった場合
    if (record.count > this.config.maxAttempts) {
      record.blockedUntil = now + this.config.blockDurationMs;
      console.warn(`Rate limit exceeded for identifier: ${identifier}`);
      
      return {
        allowed: false,
        retryAfter: Math.ceil(this.config.blockDurationMs / 1000)
      };
    }

    return {
      allowed: true,
      remainingAttempts: this.config.maxAttempts - record.count
    };
  }

  /**
   * 成功時に制限をリセット
   * @param identifier - 制限対象の識別子
   */
  resetLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * 古いレコードを定期的にクリーンアップ
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.attempts.forEach((record, key) => {
      // ウィンドウ外 + ブロック期間外のレコードを削除
      const isWindowExpired = (now - record.firstAttempt) > this.config.windowMs;
      const isBlockExpired = !record.blockedUntil || now > record.blockedUntil;
      
      if (isWindowExpired && isBlockExpired) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.attempts.delete(key));
  }
}

// ログイン試行のレート制限
export const loginRateLimiter = new RateLimiter({
  maxAttempts: 5, // 5回まで
  windowMs: 15 * 60 * 1000, // 15分間
  blockDurationMs: 30 * 60 * 1000 // 30分間ブロック
});

// パスワードリセット試行のレート制限
export const passwordResetRateLimiter = new RateLimiter({
  maxAttempts: 3, // 3回まで
  windowMs: 60 * 60 * 1000, // 1時間
  blockDurationMs: 60 * 60 * 1000 // 1時間ブロック
});

// OTP送信のレート制限
export const otpSendRateLimiter = new RateLimiter({
  maxAttempts: 3, // 3回まで 
  windowMs: 10 * 60 * 1000, // 10分間
  blockDurationMs: 10 * 60 * 1000 // 10分間ブロック
});

/**
 * ブラウザフィンガープリントの生成
 * 同一デバイスからの攻撃を検出するため
 */
export function generateBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('BeatNexus Security Check', 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 'unknown',
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 'unknown'
  ].join('|');

  // ハッシュ化して返す
  return btoa(fingerprint).substring(0, 20);
}

/**
 * セキュリティ遅延
 * 攻撃者が試行間隔を特定することを防ぐ
 */
export function securityDelay(baseDelay: number = 1000): Promise<void> {
  // ランダムな追加遅延（500ms〜1500ms）
  const randomDelay = Math.random() * 1000 + 500;
  const totalDelay = baseDelay + randomDelay;
  
  return new Promise(resolve => setTimeout(resolve, totalDelay));
}

/**
 * 定期クリーンアップの開始
 */
export function startRateLimitCleanup(): void {
  // 10分ごとにクリーンアップを実行
  setInterval(() => {
    loginRateLimiter.cleanup();
    passwordResetRateLimiter.cleanup();
    otpSendRateLimiter.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * 疑わしい活動の検出
 * @param _identifier - ユーザー識別子（将来の拡張用）
 * @param _action - 実行されたアクション（将来の拡張用）
 */
export function detectSuspiciousActivity(_identifier: string, _action: string): boolean {
  // 短時間での大量アクセスの検出ロジック
  // 実際の実装では、より詳細な分析を行う
  
  const suspiciousPatterns = [
    /bot|crawler|spider/i.test(navigator.userAgent),
    (navigator as Navigator & { webdriver?: boolean }).webdriver === true, // 自動化ツールの検出
    !window.navigator.onLine, // オフライン状態での試行
  ];

  return suspiciousPatterns.some(Boolean);
}
