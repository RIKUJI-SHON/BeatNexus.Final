import { useState, useRef, useEffect, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

// 圧縮プロファイル定義（音声品質保持、映像強圧縮）
interface CompressionProfile {
  name: string;
  videoBitrate: string;
  audioBitrate: string;
  crf: number;
  maxSize: number; // MB単位
  resolution: string;
}

const COMPRESSION_PROFILES: Record<string, CompressionProfile> = {
  light: {
    name: 'light',
    videoBitrate: '1500k',  // 1.5Mbps
    audioBitrate: '128k',   // 音声品質保持
    crf: 23,               // 高品質
    maxSize: 20,
    resolution: '1280:720' // 720p
  },
  medium: {
    name: 'medium',
    videoBitrate: '1200k',  // 1.2Mbps
    audioBitrate: '128k',   // 音声品質保持
    crf: 25,               // 標準品質
    maxSize: 25,
    resolution: '1280:720' // 720p
  },
  heavy: {
    name: 'heavy',
    videoBitrate: '1000k',  // 1Mbps
    audioBitrate: '128k',   // 音声品質保持
    crf: 28,               // 圧縮優先
    maxSize: 30,
    resolution: '1280:720' // 720p
  },
  extreme: {
    name: 'extreme',
    videoBitrate: '800k',   // 800kbps
    audioBitrate: '128k',   // 音声品質は維持
    crf: 30,               // 最強圧縮
    maxSize: 20,
    resolution: '1280:720' // 720p
  }
};

// 圧縮プロファイル選択関数
const getCompressionProfile = (fileSize: number): CompressionProfile => {
  const sizeMB = fileSize / (1024 * 1024);
  
  console.log(`📊 Selecting compression profile for ${sizeMB.toFixed(1)}MB file`);
  
  if (sizeMB < 30) {
    console.log(`✅ Using 'light' profile for small file`);
    return COMPRESSION_PROFILES.light;
  } else if (sizeMB < 100) {
    console.log(`✅ Using 'medium' profile for medium file`);
    return COMPRESSION_PROFILES.medium;
  } else if (sizeMB < 200) {
    console.log(`✅ Using 'heavy' profile for large file`);
    return COMPRESSION_PROFILES.heavy;
  } else {
    console.log(`✅ Using 'extreme' profile for very large file`);
    return COMPRESSION_PROFILES.extreme;
  }
};

// iOS最適化されたFFmpegコマンド構築
const buildFFmpegCommand = (
  profile: CompressionProfile, 
  inputFileName: string, 
  outputFileName: string
): string[] => {
  return [
    '-i', inputFileName,
    // ビデオコーデック設定（強力圧縮、iOS互換性確保）
    '-c:v', 'libx264',
    '-profile:v', 'baseline',  // iOS互換性最大化
    '-level', '3.1',           // iOS互換性レベル
    '-crf', profile.crf.toString(),
    '-b:v', profile.videoBitrate,
    '-maxrate', `${parseInt(profile.videoBitrate) * 1.5}k`,
    '-bufsize', `${parseInt(profile.videoBitrate) * 2}k`,
    // 解像度制限（720p固定）
    '-vf', `scale=${profile.resolution}:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
    // オーディオ設定（高品質維持）
    '-c:a', 'aac',
    '-b:a', profile.audioBitrate,  // 音声品質保持
    '-ar', '44100',               // サンプルレート維持
    '-ac', '2',                   // ステレオ維持
    // iOS最適化
    '-movflags', '+faststart',    // ストリーミング最適化
    '-pix_fmt', 'yuv420p',        // iOS互換ピクセルフォーマット
    // パフォーマンス設定
    '-preset', 'medium',          // バランス重視
    '-threads', '4',              // マルチスレッド
    // バッファ設定
    '-max_muxing_queue_size', '2048',
    '-bufsize', '2M',
    // 出力
    outputFileName
  ];
};

// 設定値は一元管理（圧縮強化版）
const CONFIG = {
  CORE_URL: '/ffmpeg/ffmpeg-core.js',
  WASM_URL: '/ffmpeg/ffmpeg-core.wasm',
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
  COMPRESSION_THRESHOLD: 10 * 1024 * 1024, // 10MB（大幅に引き下げ）
  CRF_VALUE: '28', // より強い圧縮
  TARGET_RESOLUTION: '1280:720', // 720p固定
};

// 圧縮サイズ推定関数
const estimateCompressedSize = (
  originalSize: number,
  resolution: { width: number; height: number },
  duration: number,
  crfValue: string,
  targetScale: string
): { estimatedSize: number; compressionRatio: number } => {
  console.log('📊 Estimating compressed size...', {
    originalSize: (originalSize / 1024 / 1024).toFixed(1) + 'MB',
    resolution,
    duration: duration + 's',
    crfValue,
    targetScale
  });

  // CRF値による基本圧縮率 (CRF値が高いほど圧縮率が高い)
  const crfCompressionRates: { [key: string]: number } = {
    '22': 0.3,  // 高品質: 約30%に圧縮
    '28': 0.15, // 中品質: 約15%に圧縮
    '30': 0.1,  // 低品質: 約10%に圧縮
  };

  // 解像度による追加圧縮率
  const resolutionCompressionRates: { [key: string]: number } = {
    '1920:-1': 1.0,    // フルHD: 圧縮率変化なし
    'scale=1280:-1': 0.6, // HD: 60%に削減
    'scale=960:-1': 0.35,  // SD: 35%に削減
  };

  // 動画長による調整（長い動画ほど圧縮効果が高い）
  const durationFactor = Math.min(1.0, Math.max(0.7, duration / 60));

  const baseCrfRate = crfCompressionRates[crfValue] || 0.3;
  const resolutionRate = resolutionCompressionRates[targetScale] || 1.0;
  
  // 最終圧縮率を計算
  const finalCompressionRatio = baseCrfRate * resolutionRate * durationFactor;
  const estimatedSize = originalSize * finalCompressionRatio;

  console.log('📈 Size estimation result:', {
    baseCrfRate,
    resolutionRate,
    durationFactor,
    finalCompressionRatio: (finalCompressionRatio * 100).toFixed(1) + '%',
    estimatedSize: (estimatedSize / 1024 / 1024).toFixed(1) + 'MB'
  });

  return {
    estimatedSize,
    compressionRatio: finalCompressionRatio
  };
};

export const useVideoProcessor = () => {
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const ffmpegRef = useRef(new FFmpeg());

  const load = useCallback(async () => {
    // 既に準備中または準備完了なら何もしない
    if (isLoading || isReady) return;

    console.log('🚀 Starting FFmpeg initialization...');
    setIsLoading(true);
    const ffmpeg = ffmpegRef.current;
    
    // プログレス監視の改善
    ffmpeg.on('progress', ({ progress, time }) => {
      const progressPercent = (progress * 100).toFixed(1);
      const timeSeconds = (time / 1000000).toFixed(1); // マイクロ秒を秒に変換
      console.log(`📊 FFmpeg Progress: ${progressPercent}%, Time: ${timeSeconds}s`);
      setProgress(Math.round(progress * 100));
      
      // 大容量ファイルの場合、より詳細なステージ情報を表示
      if (progress > 0.2 && progress < 0.9) {
        setCurrentStage(`動画を圧縮中... (${progressPercent}%)`);
      }
    });
    
    ffmpeg.on('log', ({ type, message }) => {
      console.log(`📝 FFmpeg ${type}: ${message}`);
    });
    
    try {
      console.log('⬇️ Loading FFmpeg core files...');
      await ffmpeg.load({
        coreURL: await toBlobURL(CONFIG.CORE_URL, 'text/javascript'),
        wasmURL: await toBlobURL(CONFIG.WASM_URL, 'application/wasm'),
      });

      console.log('✅ FFmpeg loaded successfully');
      setIsReady(true);
      setIsLoading(false);
    } catch (loadError) {
      console.error('❌ FFmpeg loading failed:', loadError);
      setIsLoading(false);
      throw loadError;
    }
  }, [isLoading, isReady]);

  // 初期化はコンポーネントマウント時に一度だけ行う
  useEffect(() => {
    load();
  }, [load]);

  // 動画のメタデータを取得する関数
  const getVideoMetadata = async (file: File): Promise<{
    width: number;
    height: number;
    duration: number;
  }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        const metadata = {
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration
        };
        window.URL.revokeObjectURL(video.src);
        resolve(metadata);
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // 圧縮前にサイズを推定する関数
  const estimateCompressionSize = async (videoFile: File): Promise<{
    estimatedSize: number;
    compressionRatio: number;
    willCompress: boolean;
  }> => {
    console.log('🔍 Estimating compression size for file:', videoFile.name);
    
    // 圧縮対象外の場合
    if (videoFile.size < CONFIG.COMPRESSION_THRESHOLD) {
      return {
        estimatedSize: videoFile.size,
        compressionRatio: 1.0,
        willCompress: false
      };
    }

    try {
      const metadata = await getVideoMetadata(videoFile);
      
      // ファイルサイズによる設定を決定
      const isLargeFile = videoFile.size > 500 * 1024 * 1024;
      const isVeryLargeFile = videoFile.size > 800 * 1024 * 1024;
      
      const crfValue = isVeryLargeFile ? '30' : (isLargeFile ? '28' : CONFIG.CRF_VALUE);
      const targetScale = isVeryLargeFile ? 'scale=960:-1' : (isLargeFile ? 'scale=1280:-1' : `scale=${CONFIG.TARGET_RESOLUTION}`);
      
      const { estimatedSize, compressionRatio } = estimateCompressedSize(
        videoFile.size,
        { width: metadata.width, height: metadata.height },
        metadata.duration,
        crfValue,
        targetScale
      );
      
      setEstimatedSize(estimatedSize);
      
      return {
        estimatedSize,
        compressionRatio,
        willCompress: true
      };
      
    } catch (error) {
      console.warn('⚠️ Failed to estimate compression size:', error);
      // エラーの場合は保守的な推定値を返す
      return {
        estimatedSize: videoFile.size * 0.3, // 30%に圧縮と仮定
        compressionRatio: 0.3,
        willCompress: true
      };
    }
  };

  const processVideo = async (videoFile: File): Promise<Blob | File> => {
    console.log('🎬 ProcessVideo called with file:', {
      name: videoFile.name,
      size: (videoFile.size / 1024 / 1024).toFixed(1) + 'MB',
      type: videoFile.type
    });

    // ルート分岐ロジック（圧縮閾値大幅引き下げ）
    if (videoFile.size > CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File is too large. Max size is ${CONFIG.MAX_FILE_SIZE / 1024 / 1024 / 1024}GB.`);
    }
    
    // 10MB未満でも圧縮を実行（iOS最適化のため）
    const shouldCompress = videoFile.size > CONFIG.COMPRESSION_THRESHOLD;
    
    if (!shouldCompress) {
      console.log('📦 File size is below 10MB, applying light compression for iOS optimization...');
      // 小さいファイルでも軽い圧縮を適用
    } else {
      console.log('🔄 File size requires compression, selecting optimal profile...');
    }

    if (!isReady) {
      console.error('❌ FFmpeg is not ready');
      throw new Error('FFmpeg is not ready. Please wait.');
    }
    
    console.log('🔄 Starting enhanced compression process...');
    setIsLoading(true);
    setProgress(0);
    const ffmpeg = ffmpegRef.current;
    const inputFileName = `input-${Date.now()}.${videoFile.name.split('.').pop()}`;
    const outputFileName = `output-${Date.now()}.mp4`;

    // 圧縮プロファイル選択
    const profile = getCompressionProfile(videoFile.size);
    console.log(`📋 Selected compression profile: ${profile.name}`);
    console.log(`🎯 Target settings: ${profile.videoBitrate} video, ${profile.audioBitrate} audio, CRF=${profile.crf}`);
    console.log(`📏 Target resolution: ${profile.resolution}`);
    console.log(`🎯 Target max size: ${profile.maxSize}MB`);

    try {
      console.log('📝 Writing file to FFmpeg memory...');
      setCurrentStage('ファイルをメモリに読み込み中...');
      setProgress(5);
      
      // ファイルを書き込み
      try {
        const arrayBuffer = await videoFile.arrayBuffer();
        console.log('✅ ArrayBuffer created successfully');
        setCurrentStage('ファイルをFFmpegに書き込み中...');
        setProgress(10);
        
        await ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer));
        console.log('✅ File written to FFmpeg successfully');
        setCurrentStage('iOS最適化圧縮を実行中...');
        setProgress(15);
      } catch (writeError) {
        console.error('❌ Failed to write file to FFmpeg:', writeError);
        throw new Error(`Failed to load file into memory: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
      }

      // iOS最適化された圧縮コマンド実行
      const ffmpegArgs = buildFFmpegCommand(profile, inputFileName, outputFileName);
      
      console.log('🔧 Enhanced FFmpeg command:', ffmpegArgs.join(' '));
      setCurrentStage(`${profile.name}プロファイルで圧縮実行中...`);
      setProgress(20);

      // タイムアウトなしで実行（大容量ファイル対応）
      console.log(`⏱️ Starting enhanced compression...`);
      
      await ffmpeg.exec(ffmpegArgs);
      console.log('✅ Enhanced FFmpeg compression completed');
      setCurrentStage('圧縮ファイルを読み取り中...');
      setProgress(90);

      const data = await ffmpeg.readFile(outputFileName);
      console.log('📖 Reading compressed file from FFmpeg...');
      setCurrentStage('圧縮結果を検証中...');
      setProgress(95);
      
      const compressedBlob = new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' });
      
      // サイズチェック
      const compressedSizeMB = compressedBlob.size / (1024 * 1024);
      const originalSizeMB = videoFile.size / (1024 * 1024);
      const reductionPercent = ((1 - compressedBlob.size / videoFile.size) * 100).toFixed(1);
      
      console.log(`🎉 Enhanced compression completed successfully:`, {
        profile: profile.name,
        originalSize: originalSizeMB.toFixed(1) + 'MB',
        compressedSize: compressedSizeMB.toFixed(1) + 'MB',
        compressionRatio: reductionPercent + '%',
        targetExceeded: compressedSizeMB > profile.maxSize
      });
      
      // ターゲットサイズを超えている場合の2回目圧縮
      if (compressedSizeMB > profile.maxSize * 1.2 && profile.name !== 'extreme') {
        console.log('🔄 Target size exceeded, applying second pass compression...');
        setCurrentStage('追加圧縮を実行中...');
        setProgress(85);
        
        // より強力な圧縮プロファイルで再圧縮
        const strongerProfile = COMPRESSION_PROFILES.extreme;
        const secondPassCommand = buildFFmpegCommand(strongerProfile, inputFileName, outputFileName);
        
        await ffmpeg.writeFile(inputFileName, data);
        await ffmpeg.exec(secondPassCommand);
        
        const secondPassData = await ffmpeg.readFile(outputFileName);
        const secondPassBlob = new Blob([(secondPassData as Uint8Array).buffer], { type: 'video/mp4' });
        
        console.log(`✅ Second pass completed: ${(secondPassBlob.size / 1024 / 1024).toFixed(1)}MB`);
        
        // クリーンアップ
        try {
          await ffmpeg.deleteFile(inputFileName);
          await ffmpeg.deleteFile(outputFileName);
          console.log('🧹 Temporary files cleaned up (second pass)');
        } catch (cleanupError) {
          console.warn('⚠️ Cleanup failed:', cleanupError);
        }

        setProgress(100);
        setCurrentStage('');
        return secondPassBlob;
      }
      
      // iOS向け最終チェック（50MB以下を推奨）
      if (compressedSizeMB > 50) {
        console.warn(`⚠️ Compressed file size (${compressedSizeMB.toFixed(1)}MB) may cause issues on iOS devices`);
      }
      
      // クリーンアップ
      try {
        await ffmpeg.deleteFile(inputFileName);
        await ffmpeg.deleteFile(outputFileName);
        console.log('🧹 Temporary files cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup failed:', cleanupError);
      }

      setProgress(100);
      setCurrentStage('');
      return compressedBlob;

    } catch (error) {
      console.error('❌ Compression failed:', error);
      
      // クリーンアップ（エラー時も実行）
      try {
        await ffmpeg.deleteFile(inputFileName);
        await ffmpeg.deleteFile(outputFileName);
        console.log('🧹 Error cleanup completed');
      } catch (cleanupError) {
        console.warn('⚠️ Error cleanup failed:', cleanupError);
      }
      
      // より詳細なエラーメッセージ
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('memory') || error.message.includes('Memory')) {
          errorMessage = 'メモリ不足です。ブラウザを再起動してから再度お試しください。';
        } else if (error.message.includes('SIGKILL') || error.message.includes('killed')) {
          errorMessage = 'システムによって処理が中断されました。ファイルサイズを小さくしてお試しください。';
        }
      }
      
      throw new Error(`Video compression failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStage('');
      console.log('🏁 ProcessVideo function completed');
    }
  };

  return { 
    isReady, 
    isLoading, 
    progress, 
    currentStage, 
    estimatedSize,
    processVideo, 
    estimateCompressionSize 
  };
}; 