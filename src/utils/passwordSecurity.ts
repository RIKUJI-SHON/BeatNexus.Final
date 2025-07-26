/**
 * 🔐 パスワードセキュリティ強化ユーティリティ
 * 安全なパスワードの検証とセキュリティ強化機能
 */

export interface PasswordStrength {
  score: number; // 0-100のスコア
  level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  isValid: boolean;
}

/**
 * パスワード強度を詳細に評価する関数
 * @param password - 評価対象のパスワード
 * @returns パスワード強度情報
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // 長さのチェック
  if (password.length < 8) {
    feedback.push('パスワードは8文字以上にしてください');
  } else if (password.length >= 8) {
    score += 20;
  }
  
  if (password.length >= 12) {
    score += 10; // 長いパスワードにボーナス
  }

  // 文字種類のチェック
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  if (hasLowercase) score += 15;
  if (hasUppercase) score += 15;
  if (hasNumbers) score += 15;
  if (hasSpecialChars) score += 15;

  // 文字種類の多様性チェック
  const charTypeCount = [hasLowercase, hasUppercase, hasNumbers, hasSpecialChars].filter(Boolean).length;
  if (charTypeCount < 3) {
    feedback.push('英大文字、英小文字、数字、記号のうち少なくとも3種類を使用してください');
  } else {
    score += 10;
  }

  // 危険なパターンのチェック
  const commonPatterns = [
    /^(.)\1+$/, // 同じ文字の繰り返し (aaaa, 1111など)
    /123456|654321/, // 連続する数字
    /qwerty|asdfgh|zxcvbn/i, // キーボード配列
    /password|admin|user|login/i, // 一般的な単語
  ];

  let hasCommonPattern = false;
  commonPatterns.forEach(pattern => {
    if (pattern.test(password)) {
      hasCommonPattern = true;
      feedback.push('一般的すぎるパターンは避けてください（連続文字、キーボード配列など）');
    }
  });

  if (hasCommonPattern) {
    score -= 20;
  }

  // 辞書攻撃対策：一般的なパスワードリスト
  const commonPasswords = [
    'password', '12345678', 'qwerty123', 'abc12345',
    'password123', 'admin123', 'user1234', '87654321'
  ];

  if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
    feedback.push('よく使われるパスワードの一部が含まれています');
    score -= 15;
  }

  // スコアの正規化
  score = Math.max(0, Math.min(100, score));

  // レベルの決定
  let level: PasswordStrength['level'];
  if (score < 20) level = 'very-weak';
  else if (score < 40) level = 'weak';
  else if (score < 60) level = 'fair';
  else if (score < 80) level = 'good';
  else level = 'strong';

  // 最低要件の確認
  const isValid = password.length >= 8 && charTypeCount >= 3 && !hasCommonPattern;

  // 改善提案の追加
  if (feedback.length === 0 && isValid) {
    feedback.push('安全性の高いパスワードです！');
  }

  return {
    score,
    level,
    feedback,
    isValid
  };
}

/**
 * パスワード強度レベルに応じた色とメッセージを取得
 * @param level - パスワード強度レベル
 * @returns UI表示用の色とメッセージ
 */
export function getPasswordStrengthDisplay(level: PasswordStrength['level']) {
  const displays = {
    'very-weak': {
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      message: '非常に弱い',
      icon: '❌'
    },
    'weak': {
      color: 'text-orange-500',
      bgColor: 'bg-orange-500', 
      message: '弱い',
      icon: '⚠️'
    },
    'fair': {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      message: '普通',
      icon: '⚡'
    },
    'good': {
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      message: '良い',
      icon: '✅'
    },
    'strong': {
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      message: '強力',
      icon: '🛡️'
    }
  };

  return displays[level];
}

/**
 * 侵害されたパスワードかどうかを確認（オプション機能）
 * 実際の実装では HaveIBeenPwned API を使用することを推奨
 * @param password - チェック対象のパスワード
 * @returns 侵害されている可能性があるかどうか
 */
export async function checkPasswordBreach(password: string): Promise<boolean> {
  // セキュリティ考慮：実際のパスワードは送信せず、SHA-1ハッシュの先頭5文字のみ送信
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const prefix = hashHex.substring(0, 5).toUpperCase();
    const suffix = hashHex.substring(5).toUpperCase();

    // HaveIBeenPwned API呼び出し（実装例）
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    
    if (!response.ok) {
      // API エラーの場合は安全側に倒してfalseを返す
      return false;
    }

    const text = await response.text();
    const lines = text.split('\n');
    
    return lines.some(line => line.startsWith(suffix));
  } catch (error) {
    console.warn('パスワード侵害チェックでエラーが発生しました:', error);
    return false; // エラー時は安全側に倒す
  }
}

/**
 * パスワード強度メーターのプログレスバー幅を計算
 * @param score - パスワードスコア (0-100)
 * @returns プログレスバーの幅（パーセンテージ）
 */
export function getPasswordStrengthWidth(score: number): number {
  return Math.max(5, Math.min(100, score)); // 最小5%、最大100%
}
