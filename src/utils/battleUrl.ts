/**
 * バトルURL生成・解析ユーティリティ
 * PlayerA-vs-PlayerB-battleID 形式のフレンドリーURLを扱う
 */

/**
 * ユーザー名をURL安全な形式に正規化
 * @param username - 正規化対象のユーザー名
 * @returns URL安全な文字列（英数字・ハイフンのみ、最大20文字）
 */
export function sanitizeUsername(username: string | null | undefined): string {
  if (!username) return 'player';
  
  return username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '') // 英数字とハイフンのみ許可
    .replace(/-+/g, '-') // 連続するハイフンを1つに
    .replace(/^-|-$/g, '') // 前後のハイフンを削除
    .substring(0, 20) // 最大20文字
    .replace(/^$/, 'player'); // 空文字の場合はplayerに
}

/**
 * バトル用のフレンドリーURLを生成
 * @param playerA - プレイヤーAのユーザー名
 * @param playerB - プレイヤーBのユーザー名
 * @param battleId - バトルのUUID
 * @returns PlayerA-vs-PlayerB-battleID 形式の文字列
 */
export function generateBattleUrl(
  playerA: string | null | undefined,
  playerB: string | null | undefined, 
  battleId: string
): string {
  const sanitizedA = sanitizeUsername(playerA);
  const sanitizedB = sanitizeUsername(playerB);
  return `${sanitizedA}-vs-${sanitizedB}-${battleId}`;
}

/**
 * フレンドリーURLからバトルIDを抽出
 * @param battlePath - PlayerA-vs-PlayerB-battleID 形式の文字列
 * @returns バトルUUID または null（抽出できない場合）
 */
export function extractBattleIdFromUrl(battlePath: string): string | null {
  // UUIDパターン（ハイフン区切りの8-4-4-4-12文字）にマッチ
  const match = battlePath.match(/-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
  return match ? match[1] : null;
}

/**
 * レガシー形式（純粋なUUID）かどうかを判定
 * @param battlePath - 判定対象の文字列
 * @returns レガシー形式の場合 true
 */
export function isLegacyBattleUrl(battlePath: string): boolean {
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  return uuidRegex.test(battlePath);
}

/**
 * バトルパスからバトルIDを取得（新旧両形式に対応）
 * @param battlePath - URLパス部分
 * @returns バトルUUID または null
 */
export function getBattleIdFromPath(battlePath: string): string | null {
  if (!battlePath) return null;
  
  // レガシー形式（純粋なUUID）の場合
  if (isLegacyBattleUrl(battlePath)) {
    return battlePath;
  }
  
  // 新形式からバトルIDを抽出
  return extractBattleIdFromUrl(battlePath);
}

/**
 * バトルオブジェクトからフレンドリーURLを生成
 * @param battle - バトルオブジェクト（active_battles または archived_battles）
 * @returns フレンドリーURL文字列
 */
export function getBattleUrlFromBattle(battle: {
  id?: string;
  original_battle_id?: string;
  contestant_a?: { username?: string };
  contestant_b?: { username?: string };
  player1_username?: string;
  player2_username?: string;
}): string {
  const playerA = battle.contestant_a?.username || battle.player1_username;
  const playerB = battle.contestant_b?.username || battle.player2_username;
  const battleId = battle.id || battle.original_battle_id;
  
  return generateBattleUrl(playerA, playerB, battleId || '');
}
