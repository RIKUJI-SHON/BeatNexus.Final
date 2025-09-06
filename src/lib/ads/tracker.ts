// tracker.ts
// 広告計測統合ユーティリティ: impression バッチ / click 即時 + retry / offline queue
// 要件: FR-1..FR-7

interface PendingImpression {
  token: string;
  anon?: string;
  userId?: string;
  meta?: Record<string, unknown>;
  queuedAt: number;
}

const IMP_BATCH_MAX = 5;
const IMP_BATCH_DELAY = 2000; // ms
const IMP_VISIBILITY_RESEND_WINDOW = 30_000; // 前回送信から 30s は同 token skip
const CLICK_RESEND_WINDOW = 5_000;
const OFFLINE_KEY = 'ad_offline_queue_v1';

// 重複防止用メモリキャッシュ
const recentMap: Map<string, number> = new Map();
function recentKey(token: string, type: 'impression'|'click', userOrAnon: string){
  return `${token}:${type}:${userOrAnon}`;
}

const queue: PendingImpression[] = [];
let flushTimer: number | null = null;
let initialized = false;

// ---- Debug 支援 -----------------------------------------------------------
declare global { interface Window { __AD_DEBUG_ENABLED?: boolean } }
const ENV_DEBUG = (import.meta as unknown as { env?: { VITE_AD_DEBUG?: string }}).env?.VITE_AD_DEBUG === '1';
function isDebug(){ return ENV_DEBUG || (typeof window !== 'undefined' && window.__AD_DEBUG_ENABLED); }
function dbg(...args: unknown[]){ if (isDebug()) console.debug('[ad-debug]', ...args); }

function now(){ return Date.now(); }

function scheduleFlush(){
  if (flushTimer != null) return;
  flushTimer = window.setTimeout(()=>{ flushImpressions(); }, IMP_BATCH_DELAY);
}

function loadOfflineQueue(){
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    if (!raw) return [] as PendingImpression[];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr as PendingImpression[];
  } catch (e) {
    // ignore parse errors
    console.debug('[tracker] offline queue parse failed', e);
  }
  return [] as PendingImpression[];
}

function saveOfflineQueue(items: PendingImpression[]){
  try {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(items.slice(-50)));
  } catch (e) {
    console.debug('[tracker] save offline queue failed', e);
  }
}

function restoreOffline(){
  const items = loadOfflineQueue();
  if (items.length) {
    queue.push(...items);
    saveOfflineQueue([]);
    scheduleFlush();
  }
}

function initGlobal(){
  if (initialized) return;
  initialized = true;
  // location クエリ ?adDebug=1 で有効化
  try {
    if (typeof window !== 'undefined'){
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('adDebug') === '1') window.__AD_DEBUG_ENABLED = true;
    }
  } catch { /* noop */ }
  window.addEventListener('online', ()=> restoreOffline());
  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState === 'hidden') {
      flushImpressions();
    }
  });
  restoreOffline();
  dbg('initialized tracker global');
}

// API エンドポイント解決: Vercel 配信側の相対パスでは Edge Function に到達しない可能性があるため
// 常に Supabase プロジェクト URL 優先 (vite 環境変数)
interface ImportMetaEnvLike { VITE_SUPABASE_URL?: string }
function resolveAdTrackUrls(){
  const meta = (import.meta as unknown as { env?: ImportMetaEnvLike });
  const base = meta.env?.VITE_SUPABASE_URL;
  const urls: string[] = [];
  if (base) {
    urls.push(base.replace(/\/$/, '') + '/functions/v1/ad-track');
  }
  // フォールバック (ローカル開発時のプロキシ / Next.js rewrite 等)
  urls.push('/functions/v1/ad-track','/ad/track');
  return urls;
}

async function postJson(payload: {token: string; event_type: string; timestamp: string; anon_session_id?: string; userId?: string; client_meta?: unknown}, attempt=0): Promise<Response>{
  const urlCandidates = resolveAdTrackUrls();
  let lastErr: unknown;
  for (const base of urlCandidates){
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${payload.token}`
        },
        body: JSON.stringify({
          type: payload.event_type,
          anon: payload.anon_session_id,
          userId: payload.userId,
          client_meta: payload.client_meta
        }),
        keepalive: true,
      });
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e){ lastErr = e; }
  }
  if (attempt < 2) { // retry 3 回 (0,1,2)
    const backoff = Math.pow(2, attempt) * 1000; // 1s,2s
    await new Promise(r=> setTimeout(r, backoff));
    return postJson(payload, attempt+1);
  }
  throw lastErr ?? new Error('request failed');
}

export function queueImpression(token: string, options: { anon: string; userId?: string; meta?: Record<string, unknown> }){
  initGlobal();
  const userOrAnon = options.userId || options.anon;
  const key = recentKey(token, 'impression', userOrAnon);
  const expiry = recentMap.get(key);
  if (expiry && expiry > now()) { dbg('skip duplicate impression', { token: token.slice(0,16), userOrAnon }); return; }
  queue.push({ token, anon: options.anon, userId: options.userId, meta: options.meta, queuedAt: now() });
  dbg('queue impression', { size: queue.length, token: token.slice(0,16), userOrAnon });
  if (queue.length >= IMP_BATCH_MAX) {
    flushImpressions();
  } else {
    scheduleFlush();
  }
}

export async function flushImpressions(){
  if (!queue.length) { if (flushTimer){ clearTimeout(flushTimer); flushTimer=null; } return; }
  const batch = queue.splice(0, queue.length);
  if (flushTimer){ clearTimeout(flushTimer); flushTimer=null; }
  dbg('flush start', { count: batch.length });
  if (!navigator.onLine){
    // offline 保存
    saveOfflineQueue([...batch, ...loadOfflineQueue()]);
    dbg('offline store', { stored: batch.length });
    return;
  }
  try {
    // まとめ送信: API は単一イベント想定の可能性があるため、順次送信 (MVP)。将来: bulk endpoint
    for (const item of batch){
      try {
        const payload = {
          token: item.token,
          event_type: 'impression',
          timestamp: new Date().toISOString(),
          anon_session_id: item.anon,
          userId: item.userId,
          client_meta: item.meta
        };
        const res = await postJson(payload);
        if (res.ok){
          const userOrAnon = item.userId || item.anon || 'anon';
          recentMap.set(recentKey(item.token, 'impression', userOrAnon), now()+IMP_VISIBILITY_RESEND_WINDOW);
          dbg('sent impression ok', { token: item.token.slice(0,16), userOrAnon });
        }
    } catch {
        // 失敗: オフライン queue に戻す
        saveOfflineQueue([...loadOfflineQueue(), { token: item.token, anon: item.anon, userId: item.userId, meta: item.meta, queuedAt: now() }]);
        dbg('impression send failed -> queued offline', { token: item.token.slice(0,16) });
      }
    }
  } catch {
    // 全体失敗: 全バッチを offline queue
    saveOfflineQueue([...loadOfflineQueue(), ...batch]);
    dbg('flush error, batch stored offline', { count: batch.length });
  }
}

export function trackClick(token: string, options: { anon: string; userId?: string; meta?: Record<string, unknown> }){
  initGlobal();
  const userOrAnon = options.userId || options.anon;
  const key = recentKey(token, 'click', userOrAnon);
  const expiry = recentMap.get(key);
  if (expiry && expiry > now()) return;

  const payload = {
    token,
    event_type: 'click',
    timestamp: new Date().toISOString(),
    anon_session_id: options.anon,
    userId: options.userId,
    client_meta: options.meta
  };

  // fetch を使用（sendBeacon は Authorization ヘッダーを設定できないため）
  postJson(payload).catch(()=>{
    // クリックは再試行しない (UX 優先) が offline なら一応保管
    if (!navigator.onLine){
      saveOfflineQueue([...loadOfflineQueue(), { token, anon: options.anon, userId: options.userId, meta: options.meta, queuedAt: now() }]);
    }
  });
  
  recentMap.set(key, now()+CLICK_RESEND_WINDOW);
  dbg('click queued/sent', { token: token.slice(0,16), userOrAnon });
}

export function getTrackerDebug(){
  return { queueSize: queue.length, recentSize: recentMap.size };
}
