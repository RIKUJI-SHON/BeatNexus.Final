import { 
  isValidAndSafeUrl, 
  sanitizeUrl, 
  isValidUsername 
} from './urlValidation';

/**
 * URL検証機能のテスト
 * ブラウザのコンソールで実行して動作確認できます
 */
export function testUrlValidation() {
  console.log('🔍 URL検証機能のテスト開始');

  // 安全なURLのテスト
  const safeUrls = [
    'https://example.com',
    'http://example.com/path',
    'https://subdomain.example.com/path?query=value'
  ];

  console.log('\n✅ 安全なURLのテスト:');
  safeUrls.forEach(url => {
    const result = isValidAndSafeUrl(url);
    console.log(`${url} -> ${result ? '✅ 安全' : '❌ 危険'}`);
  });

  // 危険なURLのテスト
  const dangerousUrls = [
    'javascript:alert("XSS")',
    'data:text/html,<script>alert("XSS")</script>',
    'vbscript:msgbox("XSS")',
    'file:///etc/passwd',
    'ftp://malicious.com',
    '',
    'not-a-url',
    'https://' + 'a'.repeat(3000) // 長すぎるURL
  ];

  console.log('\n❌ 危険なURLのテスト:');
  dangerousUrls.forEach(url => {
    const result = isValidAndSafeUrl(url);
    console.log(`${url.length > 50 ? url.substring(0, 50) + '...' : url} -> ${result ? '✅ 安全' : '❌ 危険'}`);
  });

  // URLサニタイズのテスト
  console.log('\n🧹 URLサニタイズのテスト:');
  const urlsToSanitize = [
    'https://example.com/path?query=value',
    'javascript:alert("XSS")',
    'HTTPS://EXAMPLE.COM/PATH'
  ];

  urlsToSanitize.forEach(url => {
    const sanitized = sanitizeUrl(url);
    console.log(`${url} -> "${sanitized}"`);
  });
}

/**
 * ユーザー名検証機能のテスト
 */
export function testUsernameValidation() {
  console.log('\n👤 ユーザー名検証機能のテスト開始');

  // 安全なユーザー名のテスト
  const safeUsernames = [
    'john_doe',
    'user123',
    'beatboxer-pro',
    'MyUserName'
  ];

  console.log('\n✅ 安全なユーザー名のテスト:');
  safeUsernames.forEach(username => {
    const result = isValidUsername(username);
    console.log(`${username} -> ${result ? '✅ 有効' : '❌ 無効'}`);
  });

  // 危険/無効なユーザー名のテスト
  const dangerousUsernames = [
    'admin',           // 予約語
    '_system',         // アンダースコアで開始
    '12345',          // 数字のみ
    'user<script>',   // 危険な文字
    'user"name',      // 危険な文字
    '',               // 空文字
    'a'.repeat(100),  // 長すぎる
    'user\x00name'    // 制御文字
  ];

  console.log('\n❌ 危険/無効なユーザー名のテスト:');
  dangerousUsernames.forEach(username => {
    const result = isValidUsername(username);
    const displayName = username.length > 20 ? username.substring(0, 20) + '...' : username;
    console.log(`${displayName} -> ${result ? '✅ 有効' : '❌ 無効'}`);
  });
}

/**
 * すべてのテストを実行
 */
export function runAllSecurityTests() {
  console.log('🛡️ セキュリティ機能の総合テスト開始\n');
  
  testUrlValidation();
  testUsernameValidation();
  
  console.log('\n🎉 すべてのテストが完了しました！');
  console.log('💡 ブラウザの開発者ツールでこのテストを実行できます:');
  console.log('   import { runAllSecurityTests } from "./path/to/securityTests";');
  console.log('   runAllSecurityTests();');
}
