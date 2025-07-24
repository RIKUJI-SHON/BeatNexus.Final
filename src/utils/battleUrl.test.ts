/**
 * バトルURL機能のユニットテスト
 * 実行方法: `npx tsx src/utils/battleUrl.test.ts`
 */

import { 
  sanitizeUsername, 
  generateBattleUrl, 
  extractBattleIdFromUrl, 
  isLegacyBattleUrl,
  getBattleIdFromPath,
  getBattleUrlFromBattle
} from './battleUrl';

// テスト用のバトルID
const TEST_BATTLE_ID = 'a1b2c3d4-e5f6-7890-abcd-1234567890ab';

console.log('🧪 バトルURL機能テスト開始\n');

// 1. sanitizeUsername のテスト
console.log('1. sanitizeUsername テスト:');
console.log('  通常のユーザー名:', sanitizeUsername('TakumiBeats')); // → takumibeats
console.log('  特殊文字含む:', sanitizeUsername('Takumi🎵Beats-123')); // → takumibeats-123
console.log('  日本語:', sanitizeUsername('田中太郎')); // → player
console.log('  空文字:', sanitizeUsername('')); // → player
console.log('  null:', sanitizeUsername(null)); // → player
console.log('  長い名前:', sanitizeUsername('VeryLongUserNameThatExceedsTheLimit')); // → verylongusernameth（20文字切り捨て）
console.log('  連続ハイフン:', sanitizeUsername('user--name---test')); // → user-name-test
console.log('  前後ハイフン:', sanitizeUsername('-user-name-')); // → user-name
console.log('');

// 2. generateBattleUrl のテスト
console.log('2. generateBattleUrl テスト:');
console.log('  通常:', generateBattleUrl('TakumiBeats', 'RyujiFlow', TEST_BATTLE_ID));
console.log('  特殊文字:', generateBattleUrl('Takumi🎵', 'Ryuji_Flow', TEST_BATTLE_ID));
console.log('  日本語:', generateBattleUrl('田中太郎', '山田花子', TEST_BATTLE_ID));
console.log('  null/undefined:', generateBattleUrl(null, undefined, TEST_BATTLE_ID));
console.log('');

// 3. extractBattleIdFromUrl のテスト
console.log('3. extractBattleIdFromUrl テスト:');
const testUrl1 = 'takumibeats-vs-ryujiflow-' + TEST_BATTLE_ID;
const testUrl2 = 'player-vs-player-' + TEST_BATTLE_ID;
const invalidUrl = 'takumibeats-vs-ryujiflow-invalid';
console.log('  正常URL:', extractBattleIdFromUrl(testUrl1)); // → TEST_BATTLE_ID
console.log('  player URL:', extractBattleIdFromUrl(testUrl2)); // → TEST_BATTLE_ID
console.log('  無効URL:', extractBattleIdFromUrl(invalidUrl)); // → null
console.log('');

// 4. isLegacyBattleUrl のテスト
console.log('4. isLegacyBattleUrl テスト:');
console.log('  レガシー形式:', isLegacyBattleUrl(TEST_BATTLE_ID)); // → true
console.log('  新形式:', isLegacyBattleUrl(testUrl1)); // → false
console.log('  無効形式:', isLegacyBattleUrl('invalid-format')); // → false
console.log('');

// 5. getBattleIdFromPath のテスト
console.log('5. getBattleIdFromPath テスト:');
console.log('  レガシー形式:', getBattleIdFromPath(TEST_BATTLE_ID)); // → TEST_BATTLE_ID
console.log('  新形式:', getBattleIdFromPath(testUrl1)); // → TEST_BATTLE_ID
console.log('  無効形式:', getBattleIdFromPath('invalid')); // → null
console.log('  空文字:', getBattleIdFromPath('')); // → null
console.log('');

// 6. getBattleUrlFromBattle のテスト
console.log('6. getBattleUrlFromBattle テスト:');
const testBattle1 = {
  id: TEST_BATTLE_ID,
  contestant_a: { username: 'TakumiBeats' },
  contestant_b: { username: 'RyujiFlow' }
};
const testBattle2 = {
  original_battle_id: TEST_BATTLE_ID,
  player1_username: 'Takumi',
  player2_username: 'Ryuji'
};
console.log('  アクティブバトル:', getBattleUrlFromBattle(testBattle1));
console.log('  アーカイブバトル:', getBattleUrlFromBattle(testBattle2));
console.log('');

console.log('✅ すべてのテストが完了しました。');
