import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// 環境診断関数
function diagnoseEnvironment() {
  const diagnostics = {
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false,
    isSecureContext: typeof isSecureContext !== 'undefined' ? isSecureContext : false,
    userAgent: navigator.userAgent,
    location: window.location.href,
    headers: {
      coep: document.querySelector('meta[http-equiv="Cross-Origin-Embedder-Policy"]')?.getAttribute('content') || 'not set',
      coop: document.querySelector('meta[http-equiv="Cross-Origin-Opener-Policy"]')?.getAttribute('content') || 'not set'
    }
  };
  
  console.log('=== Environment Diagnostics ===');
  console.log('SharedArrayBuffer available:', diagnostics.sharedArrayBuffer);
  console.log('Cross-Origin Isolated:', diagnostics.crossOriginIsolated);
  console.log('Secure Context:', diagnostics.isSecureContext);
  console.log('User Agent:', diagnostics.userAgent);
  console.log('Location:', diagnostics.location);
  console.log('COEP Header:', diagnostics.headers.coep);
  console.log('COOP Header:', diagnostics.headers.coop);
  
  // 問題の特定
  const issues = [];
  const warnings = [];
  
  if (!diagnostics.sharedArrayBuffer) {
    issues.push('SharedArrayBuffer is not available');
  }
  if (!diagnostics.crossOriginIsolated) {
    warnings.push('Cross-Origin Isolation is not enabled');
  }
  if (!diagnostics.isSecureContext && !diagnostics.location.includes('localhost')) {
    issues.push('Not in secure context (HTTPS required)');
  }
  
  // 警告レベルの問題も記録
  if (warnings.length > 0) {
    console.warn('Environment warnings (may cause FFmpeg issues):', warnings);
  }
  
  if (issues.length > 0) {
    console.warn('Critical environment issues detected:', issues);
    return { success: false, issues: [...issues, ...warnings] };
  }
  
  // 警告があっても成功とするが、FFmpeg初期化で失敗する可能性を示唆
  return { success: true, issues: warnings, hasWarnings: warnings.length > 0 };
}

// FFmpegインスタンスのシングルトン
let ffmpeg: FFmpeg | null = null;

// FFmpeg初期化の試行回数を追跡（セッションごとにリセット）
let ffmpegInitAttempts = 0;
const MAX_FFMPEG_INIT_ATTEMPTS = 2; // 2回まで試行

// FFmpeg初期化試行回数をリセットする関数
export function resetFFmpegInitAttempts() {
  ffmpegInitAttempts = 0;
  console.log('FFmpeg init attempts reset');
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export interface CompressionProgress {
  phase: 'initializing' | 'analyzing' | 'compressing' | 'finalizing';
  progress: number;
}

export async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) {
    return ffmpeg;
  }

  console.log('Initializing FFmpeg...');
  ffmpegInitAttempts++;
  
  // 環境診断
  const diagnosis = diagnoseEnvironment();
  if (!diagnosis.success) {
    throw new Error(`FFmpeg環境要件が満たされていません: ${diagnosis.issues.join(', ')}`);
  }
  
  // 警告がある場合は通知
  if (diagnosis.hasWarnings) {
    console.warn('FFmpeg初期化に警告があります。失敗する可能性があります:', diagnosis.issues);
  }
  
  ffmpeg = new FFmpeg();
  
  try {
    // ログとプログレスのハンドラーを設定
    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg log:', message);
    });
    
    ffmpeg.on('progress', ({ progress }) => {
      console.log('FFmpeg progress:', Math.round(progress * 100) + '%');
    });
    
    // 複数のCDNを試行（より安定したバージョンを使用）
    const cdnUrls = [
      'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd',
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.4/dist/umd',
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
    ];
    
    let lastError: Error | null = null;
    
    for (const baseURL of cdnUrls) {
      try {
        console.log('Trying CDN:', baseURL);
        
        // タイムアウト付きでファイルをロード
        const coreURL = await Promise.race([
          toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Core JS load timeout')), 30000)
          )
        ]);
        
        const wasmURL = await Promise.race([
          toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('WASM load timeout')), 30000)
          )
        ]);
        
        console.log('Files loaded successfully from:', baseURL);
        console.log('Core URL:', coreURL.substring(0, 50) + '...');
        console.log('WASM URL:', wasmURL.substring(0, 50) + '...');
        
        // FFmpegの初期化もタイムアウト付きで実行（短いタイムアウトで早期に失敗検出）
        await Promise.race([
          ffmpeg!.load({ coreURL, wasmURL }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('FFmpeg load timeout')), 30000) // 30秒に短縮
          )
        ]);
        
        console.log('FFmpeg initialized successfully with CDN:', baseURL);
        return ffmpeg!;
        
      } catch (error) {
        console.warn('Failed to load from CDN:', baseURL, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 次のCDNを試行する前にFFmpegインスタンスをリセット
        try {
          if (ffmpeg) {
            ffmpeg.terminate();
          }
        } catch (terminateError) {
          console.warn('Error terminating FFmpeg:', terminateError);
        }
        
        ffmpeg = new FFmpeg();
        
        // ログとプログレスのハンドラーを再設定
        ffmpeg.on('log', ({ message }) => {
          console.log('FFmpeg log:', message);
        });
        
        ffmpeg.on('progress', ({ progress }) => {
          console.log('FFmpeg progress:', Math.round(progress * 100) + '%');
        });
        
        continue;
      }
    }
    
    // すべてのCDNで失敗した場合
    throw lastError || new Error('All CDNs failed');
    
  } catch (error) {
    console.error('FFmpeg initialization failed:', error);
    
    // FFmpegインスタンスをクリーンアップ
    if (ffmpeg) {
      try {
        ffmpeg.terminate();
      } catch (terminateError) {
        console.warn('Error terminating FFmpeg:', terminateError);
      }
    }
    
    ffmpeg = null; // リセットして再試行可能にする
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`FFmpeg初期化に失敗しました: ${errorMessage}`);
  }
}

export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  console.log('Getting video metadata for:', file.name);
  
  // HTML5 Video要素を使用してメタデータを取得（より確実）
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      const metadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      
      console.log('Video metadata:', metadata);
      URL.revokeObjectURL(video.src);
      resolve(metadata);
    };
    
    video.onerror = (error) => {
      console.error('Video metadata error:', error);
      URL.revokeObjectURL(video.src);
      reject(new Error('動画のメタデータを取得できませんでした'));
    };
    
    try {
      video.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Error creating object URL:', error);
      reject(new Error('動画ファイルの処理に失敗しました'));
    }
  });
}

export function calculateOptimalBitrate(
  fileSizeBytes: number,
  durationSeconds: number,
  targetSizeMB: number = 40
): number {
  // 目標サイズをビットに変換
  const targetSizeBits = targetSizeMB * 1024 * 1024 * 8;
  
  // 音声ビットレート（128kbps固定）
  const audioBitrate = 128 * 1000;
  
  // 総ビットレートを計算
  const totalBitrate = targetSizeBits / durationSeconds;
  
  // 映像ビットレートを計算
  const videoBitrate = Math.max(500000, totalBitrate - audioBitrate);
  
  // 最大8Mbpsに制限
  const finalBitrate = Math.min(videoBitrate, 8000000);
  
  console.log('Bitrate calculation:', {
    fileSizeMB: (fileSizeBytes / 1024 / 1024).toFixed(1),
    durationSeconds,
    targetSizeMB,
    totalBitrate: Math.round(totalBitrate / 1000) + 'kbps',
    videoBitrate: Math.round(finalBitrate / 1000) + 'kbps'
  });
  
  return finalBitrate;
}

export function calculateOptimalResolution(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = 1280,
  maxHeight: number = 720
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  
  // 最大解像度を超える場合は縮小
  if (newWidth > maxWidth || newHeight > maxHeight) {
    if (aspectRatio > 1) {
      // 横長
      newWidth = maxWidth;
      newHeight = Math.round(maxWidth / aspectRatio);
    } else {
      // 縦長
      newHeight = maxHeight;
      newWidth = Math.round(maxHeight * aspectRatio);
    }
  }
  
  // 偶数に調整（H.264の要件）
  newWidth = Math.round(newWidth / 2) * 2;
  newHeight = Math.round(newHeight / 2) * 2;
  
  console.log('Resolution calculation:', {
    original: `${originalWidth}x${originalHeight}`,
    final: `${newWidth}x${newHeight}`,
    aspectRatio: aspectRatio.toFixed(2)
  });
  
  return { width: newWidth, height: newHeight };
}

// 代替圧縮機能（Canvas + MediaRecorder）
export async function compressVideoFallback(
  file: File,
  onProgress?: (progress: CompressionProgress) => void
): Promise<File> {
  console.log('=== Starting fallback video compression ===');
  console.log('File:', file.name, 'Size:', formatFileSize(file.size));
  
  try {
    onProgress?.({ phase: 'initializing', progress: 0 });
    
    // メモリ使用量チェック（大容量ファイル対応）
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 1536) {
      console.warn('Very large file detected:', fileSizeMB.toFixed(1) + 'MB');
    }
    
    // 動画要素を作成
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    
    // メタデータを取得
    const metadata = await getVideoMetadata(file);
    onProgress?.({ phase: 'analyzing', progress: 20 });
    
    // 最適な解像度を計算（大容量ファイルの場合はより小さく）
    let maxWidth = 1280;
    let maxHeight = 720;
    
    if (fileSizeMB > 1536) {
      maxWidth = 960;
      maxHeight = 540;
      console.log('Using reduced resolution for very large file (>1.5GB)');
    }
    
    const optimalResolution = calculateOptimalResolution(metadata.width, metadata.height, maxWidth, maxHeight);
    
    // キャンバスを作成
    const canvas = document.createElement('canvas');
    canvas.width = optimalResolution.width;
    canvas.height = optimalResolution.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context could not be created');
    }
    
    onProgress?.({ phase: 'analyzing', progress: 40 });
    
    // 動画を読み込み
    const videoURL = URL.createObjectURL(file);
    video.src = videoURL;
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = (e) => reject(new Error('Video loading failed: ' + e));
      
      // タイムアウト処理（大容量ファイル用）
      setTimeout(() => reject(new Error('Video loading timeout')), 30000);
    });
    
    onProgress?.({ phase: 'compressing', progress: 60 });
    
    // 目標ビットレートを計算（大容量ファイル用に調整）
    let targetBitrate = calculateOptimalBitrate(file.size, metadata.duration, 45);
    
    // 大容量ファイルの場合はより低いビットレートを使用
    if (fileSizeMB > 1536) {
      targetBitrate = Math.min(targetBitrate, 2000000); // 最大2Mbps
    }
    
    console.log('Fallback compression settings:', {
      originalSize: formatFileSize(file.size),
      targetBitrate: Math.round(targetBitrate / 1000) + 'kbps',
      resolution: `${optimalResolution.width}x${optimalResolution.height}`,
      duration: metadata.duration.toFixed(1) + 's',
      estimatedOutputSize: formatFileSize((targetBitrate * metadata.duration) / 8)
    });
    
    // キャンバスからストリームを作成
    const canvasStream = canvas.captureStream(30); // 30fps
    
    // 音声ストリームを安全に追加
    let hasAudio = false;
    try {
      // 音声付きストリームを取得
      const videoStream = (video as any).captureStream ? (video as any).captureStream() : null;
      if (videoStream) {
        const audioTracks = videoStream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks.forEach((track: MediaStreamTrack) => {
            canvasStream.addTrack(track);
            hasAudio = true;
          });
          console.log('Audio tracks added:', audioTracks.length);
        }
      }
    } catch (audioError) {
      console.warn('Audio processing failed, continuing without audio:', audioError);
    }
    
    // MediaRecorderの設定
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    
    let selectedMimeType = 'video/webm';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }
    
    const recorderOptions = {
      mimeType: selectedMimeType,
      videoBitsPerSecond: Math.round(targetBitrate * 0.8), // 80%を映像に
      audioBitsPerSecond: hasAudio ? 128000 : undefined // 128kbps
    };
    
    console.log('MediaRecorder options:', recorderOptions);
    
    // MediaRecorderを作成
    const mediaRecorder = new MediaRecorder(canvasStream, recorderOptions);
    const chunks: Blob[] = [];
    let recordingStartTime = Date.now();
    
    // データ収集の改善
    let totalDataReceived = 0;
    mediaRecorder.ondataavailable = (event) => {
      console.log('Data available, size:', event.data.size);
      if (event.data.size > 0) {
        chunks.push(event.data);
        totalDataReceived += event.data.size;
        console.log('Total data received so far:', formatFileSize(totalDataReceived));
      } else {
        console.warn('Received empty data chunk');
      }
    };
    
    // 定期的にデータを要求（大容量ファイル対応）
    const dataRequestInterval = setInterval(() => {
      if (mediaRecorder.state === 'recording') {
        console.log('Requesting data from MediaRecorder...');
        mediaRecorder.requestData();
      }
    }, 1000); // 1秒間隔
    
    // 録画開始
    console.log('Starting recording...');
    console.log('MediaRecorder options:', recorderOptions);
    mediaRecorder.start(500); // 500ms間隔でデータを分割（より頻繁に）
    
    // 動画再生開始
    video.currentTime = 0;
    
    // 動画が実際に再生可能になるまで待つ
    await new Promise<void>((resolve, reject) => {
      let resolved = false;
      
      const handleCanPlay = () => {
        if (!resolved) {
          resolved = true;
          console.log('Video can play through');
          video.removeEventListener('canplaythrough', handleCanPlay);
          video.removeEventListener('error', handleError);
          resolve();
        }
      };
      
      const handleError = (e: Event) => {
        if (!resolved) {
          resolved = true;
          console.error('Video error:', e);
          video.removeEventListener('canplaythrough', handleCanPlay);
          video.removeEventListener('error', handleError);
          reject(new Error('Video playback error'));
        }
      };
      
      video.addEventListener('canplaythrough', handleCanPlay);
      video.addEventListener('error', handleError);
      
      // タイムアウト処理
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          video.removeEventListener('canplaythrough', handleCanPlay);
          video.removeEventListener('error', handleError);
          reject(new Error('Video loading timeout'));
        }
      }, 10000);
    });
    
    console.log('Starting video playback...');
    await video.play();
    
    // 動画を再生しながらキャンバスに描画
    let frameCount = 0;
    const startTime = performance.now();
    let lastFrameTime = 0;
    
    const renderFrame = () => {
      if (video.ended || video.paused || video.currentTime >= video.duration) {
        console.log('Video ended or paused, stopping frame rendering');
        return;
      }
      
      try {
        // 実際に新しいフレームがあるかチェック
        if (video.currentTime !== lastFrameTime) {
          // キャンバスに描画
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frameCount++;
          lastFrameTime = video.currentTime;
          
          // 進捗更新
          const progress = Math.min(80 + (video.currentTime / video.duration) * 15, 95);
          onProgress?.({ phase: 'compressing', progress });
        }
        
        // パフォーマンス監視
        if (frameCount % 150 === 0) { // 5秒ごとにログ
          const elapsed = (performance.now() - startTime) / 1000;
          const fps = frameCount / elapsed;
          console.log(`Rendering: ${frameCount} frames, ${fps.toFixed(1)} fps, ${video.currentTime.toFixed(1)}s/${video.duration.toFixed(1)}s`);
        }
        
        requestAnimationFrame(renderFrame);
      } catch (drawError) {
        console.error('Frame rendering error:', drawError);
        // エラーが発生してもレンダリングを続行
        requestAnimationFrame(renderFrame);
      }
    };
    
    renderFrame();
    
    // 録画の開始と停止を制御
    const compressedBlob = await new Promise<Blob>((resolve, reject) => {
      let resolved = false;
      
      // タイムアウト設定（動画の長さ + 余裕時間）
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error('Recording timeout reached');
          reject(new Error('Recording timeout - video processing took too long'));
        }
      }, (metadata.duration + 30) * 1000); // 30秒の余裕時間
      
      // 動画が終了したときの処理
      video.onended = () => {
        console.log('Video playback ended');
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            console.log('Stopping MediaRecorder after video ended');
            mediaRecorder.stop();
          }
        }, 1000); // 1秒の余裕時間
      };
      
      // 手動での停止処理（フェイルセーフ）
      const stopRecordingTimeout = setTimeout(() => {
        console.log('Timeout reached, forcing recorder stop...');
        if (mediaRecorder.state === 'recording') {
          console.log('Force stopping MediaRecorder');
          mediaRecorder.stop();
        }
      }, (metadata.duration + 15) * 1000); // 動画の長さ + 15秒
      
      // 録画停止時の処理を改善
      mediaRecorder.onstop = () => {
        if (resolved) {
          console.log('Recording already resolved, ignoring stop event');
          return;
        }
        
        resolved = true;
        clearTimeout(timeout);
        clearTimeout(stopRecordingTimeout);
        clearInterval(dataRequestInterval);
        
        console.log('Recording stopped, chunks:', chunks.length);
        console.log('Chunks sizes:', chunks.map(c => c.size));
        
        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log('Total chunks size:', formatFileSize(totalSize));
        
        if (chunks.length === 0 || totalSize === 0) {
          reject(new Error('No data recorded - MediaRecorder failed to capture video'));
          return;
        }
        
        try {
          const blob = new Blob(chunks, { type: selectedMimeType });
          console.log('Final blob size:', formatFileSize(blob.size));
          
          // 最終的なサイズチェック
          if (blob.size === 0) {
            reject(new Error('Generated blob has zero size'));
            return;
          }
          
          resolve(blob);
        } catch (error) {
          console.error('Error creating blob:', error);
          reject(new Error('Failed to create compressed video blob'));
        }
      };
      
      // エラーハンドリングを改善
      mediaRecorder.onerror = (event) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          clearTimeout(stopRecordingTimeout);
          clearInterval(dataRequestInterval);
          console.error('MediaRecorder error:', event);
          reject(new Error('MediaRecorder encountered an error during recording'));
        }
      };
    });
    
    onProgress?.({ phase: 'finalizing', progress: 95 });
    
    // クリーンアップ
    URL.revokeObjectURL(videoURL);
    canvasStream.getTracks().forEach(track => track.stop());
    
    // 結果の検証
    if (compressedBlob.size === 0) {
      throw new Error('Compressed video has zero size - compression failed');
    }
    
    // ファイルを作成
    const compressedFile = new File([compressedBlob], file.name, { 
      type: compressedBlob.type 
    });
    
    onProgress?.({ phase: 'finalizing', progress: 100 });
    
    console.log('=== Fallback compression completed ===');
    console.log('Results:', {
      originalSize: formatFileSize(file.size),
      compressedSize: formatFileSize(compressedFile.size),
      compressionRatio: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`,
      mimeType: selectedMimeType,
      hasAudio: hasAudio,
      processingTime: `${((Date.now() - recordingStartTime) / 1000).toFixed(1)}s`
    });
    
    return compressedFile;
    
  } catch (error) {
    console.error('=== Fallback compression failed ===');
    console.error('Error details:', error);
    
    // 詳細なエラー情報を追加
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw new Error(`代替圧縮に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// メイン圧縮関数を更新
export async function compressVideo(
  file: File,
  onProgress?: (progress: CompressionProgress) => void
): Promise<File> {
  console.log('=== Starting video compression ===');
  console.log('File:', file.name, 'Size:', formatFileSize(file.size));
  
  // ファイルサイズチェック
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > 2000) { // 2GB以上
    console.warn('File too large for processing:', fileSizeMB.toFixed(1) + 'MB');
    throw new Error('ファイルサイズが大きすぎます（2GB以上）。より小さなファイルを使用してください。');
  }
  
  // 環境診断を最初に実行
  const diagnosis = diagnoseEnvironment();
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // 詳細なログ出力
  console.log('=== Compression Method Selection ===');
  console.log('File size:', formatFileSize(file.size), `(${fileSizeMB.toFixed(1)}MB)`);
  console.log('Environment diagnosis:', diagnosis.success ? 'OK' : 'Issues detected');
  console.log('Environment warnings:', diagnosis.hasWarnings ? 'Yes' : 'No');
  console.log('FFmpeg init attempts:', ffmpegInitAttempts, '/', MAX_FFMPEG_INIT_ATTEMPTS);
  console.log('Hostname:', window.location.hostname);
  console.log('Is localhost:', isLocalhost);
  
  // 代替圧縮を使用する条件（ローカル環境を追加）
  const shouldUseFallback = 
    (!diagnosis.success) ||                      // 環境に致命的な問題がある
    (fileSizeMB > 1536) ||                      // 1.5GB以上の大きなファイル
    (isLocalhost);                              // ローカル環境では代替圧縮を優先
  
  console.log('Should use fallback?', {
    environmentIssues: !diagnosis.success,
    isLargeFile: fileSizeMB > 1536,
    isLocalhost: isLocalhost,
    ffmpegInitAttempts: ffmpegInitAttempts,
    maxAttempts: MAX_FFMPEG_INIT_ATTEMPTS
  });
  
  if (shouldUseFallback) {
    console.log('Using fallback compression');
    if (!diagnosis.success) {
      console.warn('Environment issues detected:', diagnosis.issues);
    }
    if (fileSizeMB > 1536) {
      console.warn('Large file detected (>1.5GB), using fallback compression');
    }
    if (isLocalhost) {
      console.log('Localhost detected, using fallback compression for better compatibility');
    }
    return await compressVideoFallback(file, onProgress);
  }
  
  // FFmpeg初期化の試行回数が上限に達している場合のみ代替圧縮を使用
  if (ffmpegInitAttempts >= MAX_FFMPEG_INIT_ATTEMPTS) {
    console.log('FFmpeg initialization attempts exceeded, using fallback compression');
    return await compressVideoFallback(file, onProgress);
  }
  
  console.log('Attempting FFmpeg compression for optimal quality');
  
  try {
    // 初期化フェーズ
    console.log('Phase: Initializing FFmpeg');
    onProgress?.({ phase: 'initializing', progress: 0 });
    
    const ffmpeg = await initFFmpeg();
    onProgress?.({ phase: 'initializing', progress: 25 });
    
    // ファイルをFFmpegに書き込み
    console.log('Writing file to FFmpeg filesystem...');
    const inputData = await fetchFile(file);
    console.log('Input data size:', inputData instanceof Uint8Array ? inputData.byteLength : 'unknown');
    
    // データの妥当性チェック
    if (!inputData || (inputData instanceof Uint8Array && inputData.byteLength === 0)) {
      throw new Error('入力ファイルが空です');
    }
    
    await ffmpeg.writeFile('input.mp4', inputData);
    onProgress?.({ phase: 'initializing', progress: 50 });
    
    // 解析フェーズ
    console.log('Phase: Analyzing video');
    onProgress?.({ phase: 'analyzing', progress: 60 });
    
    const metadata = await getVideoMetadata(file);
    onProgress?.({ phase: 'analyzing', progress: 80 });
    
    // 最適なビットレートと解像度を計算
    const optimalBitrate = calculateOptimalBitrate(file.size, metadata.duration);
    const optimalResolution = calculateOptimalResolution(metadata.width, metadata.height);
    
    console.log('Compression settings:', {
      originalSize: formatFileSize(file.size),
      targetBitrate: Math.round(optimalBitrate / 1000) + 'kbps',
      resolution: `${optimalResolution.width}x${optimalResolution.height}`,
      duration: metadata.duration.toFixed(1) + 's'
    });
    
    // 圧縮フェーズ
    console.log('Phase: Compressing video');
    onProgress?.({ phase: 'compressing', progress: 85 });
    
    // 進捗監視のセットアップ
    let compressionStarted = false;
    ffmpeg.on('progress', ({ progress }) => {
      if (!compressionStarted) {
        compressionStarted = true;
        console.log('Compression started');
      }
      
      const currentProgress = Math.min(85 + (progress * 10), 95);
      console.log('Compression progress:', Math.round(progress * 100) + '%');
      onProgress?.({ phase: 'compressing', progress: currentProgress });
    });
    
    // FFmpegコマンドを実行
    const ffmpegCommand = [
      '-i', 'input.mp4',
      '-c:v', 'libx264',
      '-b:v', `${Math.round(optimalBitrate / 1000)}k`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-vf', `scale=${optimalResolution.width}:${optimalResolution.height}`,
      '-preset', 'veryfast',
      '-crf', '28',
      '-movflags', '+faststart',
      '-y',
      'output.mp4'
    ];
    
    console.log('Executing FFmpeg command:', ffmpegCommand.join(' '));
    
    // タイムアウト付きでFFmpegコマンドを実行（大きなファイルの場合は時間がかかる）
    const timeoutMinutes = Math.max(10, Math.ceil(file.size / (1024 * 1024 * 10))); // 10MB/分として計算
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    console.log(`Setting timeout to ${timeoutMinutes} minutes for file size ${formatFileSize(file.size)}`);
    
    await Promise.race([
      ffmpeg.exec(ffmpegCommand),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`FFmpeg execution timeout (${timeoutMinutes} minutes)`)), timeoutMs)
      )
    ]);
    
    // 最終処理フェーズ
    console.log('Phase: Finalizing');
    onProgress?.({ phase: 'finalizing', progress: 95 });
    
    // 圧縮されたファイルを読み取り
    console.log('Reading compressed file...');
    const compressedData = await ffmpeg.readFile('output.mp4');
    
    // 出力データの妥当性チェック
    if (!compressedData || (compressedData instanceof Uint8Array && compressedData.byteLength === 0)) {
      console.error('FFmpeg produced empty output');
      throw new Error('圧縮されたファイルが空です - FFmpeg処理に失敗しました');
    }
    
    console.log('Compressed data size:', compressedData instanceof Uint8Array ? compressedData.byteLength : 'unknown');
    
    // 圧縮結果が異常に小さい場合は警告
    if (compressedData instanceof Uint8Array && compressedData.byteLength < 1024) {
      console.warn('Compressed file is very small:', compressedData.byteLength, 'bytes');
      throw new Error('圧縮結果が異常に小さいです - 処理に問題があります');
    }
    
    // ファイルオブジェクトを作成
    const compressedBlob = new Blob([compressedData], { type: 'video/mp4' });
    const compressedFile = new File([compressedBlob], file.name, { type: 'video/mp4' });
    
    // 最終的なサイズチェック
    if (compressedFile.size === 0) {
      throw new Error('圧縮されたファイルのサイズが0です');
    }
    
    // 一時ファイルを削除
    try {
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp4');
      console.log('Temporary files cleaned up');
    } catch (error) {
      console.warn('Failed to clean up temporary files:', error);
    }
    
    onProgress?.({ phase: 'finalizing', progress: 100 });
    
    console.log('=== FFmpeg compression completed successfully ===');
    console.log('Results:', {
      originalSize: formatFileSize(file.size),
      compressedSize: formatFileSize(compressedFile.size),
      compressionRatio: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`,
      sizeDifference: formatFileSize(file.size - compressedFile.size)
    });
    
    return compressedFile;
    
  } catch (error) {
    console.error('=== FFmpeg compression failed ===');
    console.error('Error details:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // FFmpegが失敗した場合で、まだ試行回数に余裕がある場合は代替手段を試行
    console.log('FFmpeg failed, attempting fallback compression...');
    try {
      return await compressVideoFallback(file, onProgress);
    } catch (fallbackError) {
      console.error('Fallback compression also failed:', fallbackError);
      throw new Error(`動画圧縮に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function shouldCompressVideo(file: File): boolean {
  // 50MB以上の場合は圧縮が必要
  const maxSizeBytes = 50 * 1024 * 1024;
  const shouldCompress = file.size > maxSizeBytes;
  
  console.log('Compression check:', {
    fileSize: formatFileSize(file.size),
    threshold: formatFileSize(maxSizeBytes),
    shouldCompress
  });
  
  return shouldCompress;
} 