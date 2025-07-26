import { useState, useRef, useEffect, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

// 設定値は一元管理
const CONFIG = {
  CORE_URL: '/ffmpeg/ffmpeg-core.js',
  WASM_URL: '/ffmpeg/ffmpeg-core.wasm',
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
  COMPRESSION_THRESHOLD: 300 * 1024 * 1024, // 300MB（しきい値を上げる）
  CRF_VALUE: '22',
  TARGET_RESOLUTION: '1920:-1',
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

    // ルート分岐ロジック
    if (videoFile.size > CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File is too large. Max size is ${CONFIG.MAX_FILE_SIZE / 1024 / 1024 / 1024}GB.`);
    }
    if (videoFile.size < CONFIG.COMPRESSION_THRESHOLD) {
      console.log('✅ File size is small enough, skipping compression.');
      return videoFile; // 圧縮せず元のファイルを返す
    }

    if (!isReady) {
      console.error('❌ FFmpeg is not ready');
      throw new Error('FFmpeg is not ready. Please wait.');
    }
    
    console.log('🔄 Starting compression process...');
    setIsLoading(true);
    setProgress(0);
    const ffmpeg = ffmpegRef.current;
    const inputFileName = `input-${Date.now()}.${videoFile.name.split('.').pop()}`;
    const outputFileName = `output-${Date.now()}.mp4`;

    console.log(`📊 Starting compression: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(1)}MB)`);

    try {
      // 大容量ファイルの場合、事前チェック
      const isLargeFile = videoFile.size > 500 * 1024 * 1024; // 500MB以上
      const isVeryLargeFile = videoFile.size > 800 * 1024 * 1024; // 800MB以上
      
      if (isVeryLargeFile) {
        console.warn('⚠️ Very large file detected. Using aggressive compression settings.');
        setCurrentStage('大容量ファイルを検出しました。最適な設定で圧縮します...');
      } else if (isLargeFile) {
        setCurrentStage('大きなファイルです。圧縮に時間がかかる場合があります...');
      }

      console.log('📝 Writing file to FFmpeg memory...');
      setCurrentStage('ファイルをメモリに読み込み中...');
      setProgress(5);
      
      // ファイルを書き込み（大容量ファイル用の進捗表示）
      try {
        const arrayBuffer = await videoFile.arrayBuffer();
        console.log('✅ ArrayBuffer created successfully');
        setCurrentStage('ファイルをFFmpegに書き込み中...');
        setProgress(10);
        
        await ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer));
        console.log('✅ File written to FFmpeg successfully');
        setCurrentStage('圧縮設定を準備中...');
        setProgress(15);
      } catch (writeError) {
        console.error('❌ Failed to write file to FFmpeg:', writeError);
        throw new Error(`Failed to load file into memory: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
      }

      // 大容量ファイル用の最適化された設定
      const ffmpegArgs = [
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-crf', isVeryLargeFile ? '30' : (isLargeFile ? '28' : CONFIG.CRF_VALUE), // 超大容量ファイルはさらに強い圧縮
        '-vf', isVeryLargeFile ? 'scale=960:-1' : (isLargeFile ? 'scale=1280:-1' : `scale=${CONFIG.TARGET_RESOLUTION}`), // 段階的解像度削減
        '-c:a', 'aac', // オーディオも圧縮
        '-b:a', isVeryLargeFile ? '96k' : '128k', // 超大容量ファイルはオーディオも削減
        '-preset', isVeryLargeFile ? 'fast' : (isLargeFile ? 'faster' : 'ultrafast'), // 段階的プリセット
        '-movflags', '+faststart',
        '-max_muxing_queue_size', '2048', // キューサイズをさらに増加
        '-bufsize', '2M', // バッファサイズ指定
        outputFileName,
      ];

      console.log('🎛️ FFmpeg command:', ffmpegArgs.join(' '));
      setCurrentStage('動画を圧縮中...');
      setProgress(20);

      // タイムアウトなしで実行（大容量ファイル対応）
      console.log(`⏱️ Starting compression (no timeout for large files)...`);
      
      await ffmpeg.exec(ffmpegArgs);
      console.log('✅ FFmpeg compression completed');
      setCurrentStage('圧縮ファイルを読み取り中...');
      setProgress(90);

      const data = await ffmpeg.readFile(outputFileName);
      console.log('📖 Reading compressed file from FFmpeg...');
      setCurrentStage('圧縮を完了中...');
      setProgress(95);
      
      const compressedBlob = new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' });
      
      console.log(`🎉 Compression completed successfully:`, {
        originalSize: (videoFile.size / 1024 / 1024).toFixed(1) + 'MB',
        compressedSize: (compressedBlob.size / 1024 / 1024).toFixed(1) + 'MB',
        compressionRatio: ((1 - compressedBlob.size / videoFile.size) * 100).toFixed(1) + '%'
      });
      
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