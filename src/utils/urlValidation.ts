/**
 * URL検証ユーティリティ
 * セキュリティを考慮した安全なURL検証を行います
 */

/**
 * URLが安全かどうかを検証する
 * @param url - 検証対象のURL
 * @returns 安全なURLの場合はtrue、危険な場合はfalse
 */
export function isValidAndSafeUrl(url: string): boolean {
  try {
    // 空文字や長すぎるURLは拒否
    if (!url || url.length > 2048) {
      return false;
    }

    // URLオブジェクトを作成して構文チェック
    const parsedUrl = new URL(url);

    // 許可するプロトコルを制限（HTTPSとHTTPのみ）
    const allowedProtocols = ['https:', 'http:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return false;
    }

    // 危険なプロトコルを明示的に拒否
    const dangerousProtocols = [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'ftp:',
    ];
    
    for (const protocol of dangerousProtocols) {
      if (url.toLowerCase().startsWith(protocol)) {
        return false;
      }
    }

    // ホスト名が存在することを確認
    if (!parsedUrl.hostname) {
      return false;
    }

    // ローカルホストやプライベートIPアドレスの制限（本番環境では）
    const hostname = parsedUrl.hostname.toLowerCase();
    const restrictedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
    ];

    // 開発環境でない場合はローカルホストを拒否
    if (process.env.NODE_ENV === 'production') {
      if (restrictedHosts.includes(hostname)) {
        return false;
      }
      
      // プライベートIPアドレス範囲をチェック
      if (hostname.match(/^10\./) || 
          hostname.match(/^192\.168\./) || 
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
        return false;
      }
    }

    return true;
  } catch {
    // URL構文エラーの場合は無効として扱う
    return false;
  }
}

/**
 * URLをサニタイズ（無害化）する
 * @param url - サニタイズ対象のURL
 * @returns サニタイズされたURL（無効な場合は空文字）
 */
export function sanitizeUrl(url: string): string {
  if (!isValidAndSafeUrl(url)) {
    return '';
  }

  try {
    const parsedUrl = new URL(url);
    // URLを正規化して返す
    return parsedUrl.toString();
  } catch {
    return '';
  }
}

/**
 * ユーザー指定のハンドルネームが安全かどうかを検証する
 * @param username - 検証対象のユーザー名
 * @returns 安全なユーザー名の場合はtrue
 */
export function isValidUsername(username: string): boolean {
  if (!username || username.length === 0) {
    return false;
  }

  // 長すぎるユーザー名を拒否
  if (username.length > 50) {
    return false;
  }

  // 危険な文字を含むユーザー名を拒否
  const dangerousChars = /[<>'"&\\/]/;
  
  if (dangerousChars.test(username)) {
    return false;
  }

  // 制御文字をチェック
  for (let i = 0; i < username.length; i++) {
    const charCode = username.charCodeAt(i);
    if ((charCode >= 0 && charCode <= 31) || (charCode >= 127 && charCode <= 159)) {
      return false;
    }
  }

  // アンダースコアから始まるユーザー名を拒否（システム予約）
  if (username.startsWith('_')) {
    return false;
  }

  // 数字だけのユーザー名を拒否
  if (/^\d+$/.test(username)) {
    return false;
  }

  // 予約語をチェック
  const reservedNames = [
    'admin', 'administrator', 'root', 'moderator', 'mod',
    'support', 'help', 'contact', 'info', 'mail',
    'api', 'www', 'ftp', 'blog', 'forum',
    'user', 'guest', 'anonymous', 'system', 'service',
    'deleted', 'removed', 'banned', 'null', 'undefined',
    '404', '500', 'error', 'test', 'demo'
  ];

  if (reservedNames.includes(username.toLowerCase())) {
    return false;
  }

  return true;
}
