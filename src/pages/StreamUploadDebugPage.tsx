import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// (翻訳は不要なので未使用の t を避ける)
import { useAuthStore } from '../store/authStore';
import { useStreamUpload } from '../hooks/useStreamUpload';
import { getVideoDuration } from '../utils/videoSupport';
import { Button } from '../components/ui/Button';
import { AlertCircle, Upload, Loader2, CheckCircle, Video, RefreshCcw } from 'lucide-react';

// Battle formats used in production PostPage
type BattleFormat = 'MAIN_BATTLE' | 'MINI_BATTLE' | 'THEME_CHALLENGE';

const formatOptions: { value: BattleFormat; label: string; maxSec: number }[] = [
  { value: 'MAIN_BATTLE', label: 'MAIN_BATTLE (<=120s)', maxSec: 120 },
  { value: 'MINI_BATTLE', label: 'MINI_BATTLE (<=60s)', maxSec: 60 },
  { value: 'THEME_CHALLENGE', label: 'THEME_CHALLENGE (<=120s)', maxSec: 120 }
];

const StreamUploadDebugPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { uploadVideo, progress, isUploading, error, uploadStage } = useStreamUpload();

  const [battleFormat, setBattleFormat] = useState<BattleFormat>('MAIN_BATTLE');
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [streamVideoId, setStreamVideoId] = useState<string | null>(null);
  // 追加の Edge 応答データ保持は現状不要（必要になれば復活）
  const [statusMsg, setStatusMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Force enable debug flags for this page
  useEffect(() => {
    try {
      localStorage.setItem('STREAM_DEBUG', '1');
      localStorage.setItem('DISABLE_STREAM_FALLBACK', '1');
    } catch { /* noop */ }
  }, []);

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-200">
        <p className="mb-4">ログインが必要です。</p>
        <Button onClick={() => navigate('/login')}>ログインへ</Button>
      </div>
    );
  }

  const onSelectFile = async (f: File) => {
    setFile(f);
    setDuration(null);
    setStreamVideoId(null);
    setStatusMsg('メタデータ解析中...');
    try {
      const d = await getVideoDuration(f);
      setDuration(d);
      setStatusMsg('準備完了');
    } catch (e) {
      setStatusMsg('動画長の取得に失敗');
      console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onSelectFile(f);
  };

  const startUpload = async () => {
    if (!file) return;
    setStatusMsg('Edge Function 呼び出し中...');
    try {
      // Hook 内で debug header が付与される (localStorage flag)
      const id = await uploadVideo(file, battleFormat);
      setStreamVideoId(id);
      setStatusMsg('アップロード完了 / エンコード待ち');
    } catch (e) {
      setStatusMsg('失敗: ' + (e instanceof Error ? e.message : 'unknown'));
    }
  };

  const resetAll = () => {
    setFile(null);
    setDuration(null);
    setStreamVideoId(null);
    setStatusMsg('リセット完了');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Cloudflare Stream Upload Debug</h1>
          <Button variant="ghost" onClick={() => navigate(-1)}>戻る</Button>
        </div>

        <div className="mb-6 p-4 border border-cyan-700/40 rounded-lg bg-slate-900/60 text-sm leading-relaxed">
          <p className="font-semibold mb-1">目的:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>マッチング / submission 作成を行わず Cloudflare へのアップロードのみ検証</li>
            <li>fallback を強制無効化 (Supabase Storage へは保存しません)</li>
            <li>Edge Function の x-debug ログを有効化 (STREAM_DEBUG=1)</li>
          </ul>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Battle Format</label>
              <select
                value={battleFormat}
                onChange={e => setBattleFormat(e.target.value as BattleFormat)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {formatOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">動画ファイル</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500"
              />
              {file && (
                <div className="mt-2 text-xs text-slate-300 space-y-1">
                  <div>名前: {file.name}</div>
                  <div>サイズ: {(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  <div>推定長さ: {duration ? duration.toFixed(2) + 's' : '取得中 / 不明'}</div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button disabled={!file || isUploading} onClick={startUpload} leftIcon={isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}>開始</Button>
              <Button variant="secondary" disabled={isUploading} onClick={resetAll} leftIcon={<RefreshCcw className="h-4 w-4" />}>リセット</Button>
            </div>
            {uploadStage && (
              <div className="text-xs text-slate-400">ステージ: {uploadStage}</div>
            )}
            {isUploading && (
              <div className="w-full bg-slate-800 rounded h-2 overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            {statusMsg && <div className="text-sm mt-1">{statusMsg}</div>}
            {error && (
              <div className="mt-2 p-3 rounded bg-red-900/40 border border-red-600 text-sm flex gap-2 items-start">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div>
                  <div className="font-semibold">エラー</div>
                  <div className="break-all text-red-200 text-xs">{error}</div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded bg-slate-900/70 border border-slate-700">
              <h2 className="font-semibold mb-2 flex items-center gap-2 text-cyan-300 text-sm"><Video className="h-4 w-4" /> 結果</h2>
              {!streamVideoId && <p className="text-xs text-slate-400">未アップロード</p>}
              {streamVideoId && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-1 text-green-400"><CheckCircle className="h-3 w-3" /> アップロード要求完了</div>
                  <div><span className="text-slate-400">Stream Video ID:</span> <code className="break-all text-cyan-400">{streamVideoId}</code></div>
                  <div className="text-slate-400">HLS: <code className="break-all">https://videodelivery.net/{streamVideoId}/manifest/video.m3u8</code></div>
                  <div className="text-slate-400">サムネイル: <code className="break-all">https://videodelivery.net/{streamVideoId}/thumbnails/thumbnail.jpg</code></div>
                  <div className="text-slate-400">MP4: <code className="break-all">https://videodelivery.net/{streamVideoId}/mp4</code></div>
                  <div className="mt-2 text-[10px] text-slate-500">※ エンコード中は再生不可 / Cloudflare ダッシュボードで状態確認</div>
                </div>
              )}
            </div>
            <div className="p-4 rounded bg-slate-900/70 border border-slate-700">
              <h2 className="font-semibold mb-2 text-cyan-300 text-sm">ブラウザコンソールの活用</h2>
              <ul className="text-xs list-disc ml-4 space-y-1 text-slate-300">
                <li>このページは自動で STREAM_DEBUG=1 を設定</li>
                <li>ネットワークタブで direct_upload POST と Cloudflare への実ファイル POST を確認</li>
                <li>失敗時は [StreamDebug] ログと XHR ステータスを共有してください</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamUploadDebugPage;
