// anonSession.ts
// 単純な役割: ブラウザに匿名セッションID (UUID v4) を1度生成して localStorage に保存し、以後取得する。
// なぜ必要?: 未ログインユーザーでも日次キャップや頻度分析を安定させるため、"同じ人" をある程度一貫して識別したいから。
// 厳格な個人識別ではなく、再インストールや別ブラウザで変わることは許容する。プライバシー上の懸念を低減しつつ頻度制御の基盤を作る目的。

const STORAGE_KEY = 'bnx_anon_session_id_v1';

function generateUuidV4(): string {
  // 簡易 UUID v4 実装 (暗号学的でなくても MVP 可。将来 crypto.randomUUID() へ置換可能)
  // x をランダム16進に置換し、y は 8..b のバリアント。
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getAnonSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const id = generateUuidV4();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage が利用不可 (Safari プライベート等) の場合は null
    return null;
  }
}
