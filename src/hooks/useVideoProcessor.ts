import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

// 設定値は一元管理
const CONFIG = {
  CORE_URL: '/ffmpeg/ffmpeg-core.js',
  WASM_URL: '/ffmpeg/ffmpeg-core.wasm',
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
  COMPRESSION_THRESHOLD: 200 * 1024 * 1024, // 200MB
  CRF_VALUE: '22',
  TARGET_RESOLUTION: '1920:-1',
};

export const useVideoProcessor = () => {
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());

  const load = async () => {
    // 既に準備中または準備完了なら何もしない
    if (isLoading || isReady) return;

    setIsLoading(true);
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });
    
    await ffmpeg.load({
      coreURL: await toBlobURL(CONFIG.CORE_URL, 'text/javascript'),
      wasmURL: await toBlobURL(CONFIG.WASM_URL, 'application/wasm'),
    });

    setIsReady(true);
    setIsLoading(false);
  };

  // 初期化はコンポーネントマウント時に一度だけ行う
  useEffect(() => {
    load();
  }, []);

  const processVideo = async (videoFile: File): Promise<Blob | File> => {
    // ルート分岐ロジック
    if (videoFile.size > CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File is too large. Max size is ${CONFIG.MAX_FILE_SIZE / 1024 / 1024 / 1024}GB.`);
    }
    if (videoFile.size < CONFIG.COMPRESSION_THRESHOLD) {
      console.log('File size is small enough, skipping compression.');
      return videoFile; // 圧縮せず元のファイルを返す
    }

    if (!isReady) {
      throw new Error('FFmpeg is not ready. Please wait.');
    }
    
    setIsLoading(true);
    setProgress(0);
    const ffmpeg = ffmpegRef.current;
    const inputFileName = `input-${videoFile.name}`;
    const outputFileName = 'output.mp4';

    await ffmpeg.writeFile(inputFileName, new Uint8Array(await videoFile.arrayBuffer()));

    try {
      await ffmpeg.exec([
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-crf', CONFIG.CRF_VALUE,
        '-vf', `scale=${CONFIG.TARGET_RESOLUTION}`,
        '-c:a', 'copy',
        '-preset', 'ultrafast',
        '-movflags', '+faststart',
        outputFileName,
      ]);

      const data = await ffmpeg.readFile(outputFileName);
      return new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' });

    } catch (error) {
      console.error('Compression failed:', error);
      throw new Error('Video compression failed. Please try another file.');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return { isReady, isLoading, progress, processVideo };
}; 