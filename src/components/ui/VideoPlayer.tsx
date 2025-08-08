import React, { useRef, useState } from 'react';
import { Play, Loader2, AlertTriangle } from 'lucide-react';
import { 
  VideoPlayerState, 
  getInitialVideoState, 
  handleVideoPlay, 
  getVideoErrorMessage 
} from '../../utils/videoSupport';

interface VideoPlayerProps {
  videoUrl: string;
  playerName: string;
  className?: string;
  borderColor?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  playerName,
  className = '',
  borderColor = '#3b82f6'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<VideoPlayerState>(getInitialVideoState());

  const updateState = (newState: Partial<VideoPlayerState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const handlePlayClick = async () => {
    if (!videoRef.current || !videoUrl) return;
    
    await handleVideoPlay(videoRef.current, videoUrl, updateState);
  };

  const handleRetry = () => {
    setState(getInitialVideoState());
  };

  // 動画が開始されていない場合はプレースホルダーを表示
  if (!state.hasStarted) {
    return (
      <div 
        className={`aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2 ${className}`}
        style={{ borderColor }}
      >
        <div 
          className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900 cursor-pointer hover:bg-gradient-to-br hover:from-gray-700 hover:to-gray-800 transition-all group"
          onClick={handlePlayClick}
        >
          <Play className="h-16 w-16 mb-3 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 text-white" />
          <p className="text-lg font-medium text-white mb-1">
            {playerName}の動画を再生
          </p>
          <p className="text-sm text-center px-4 text-gray-400">
            タップして動画を読み込み・再生
          </p>
        </div>
      </div>
    );
  }

  // 読み込み中の表示
  if (state.isLoading) {
    return (
      <div 
        className={`aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2 ${className}`}
        style={{ borderColor }}
      >
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900">
          <Loader2 className="h-12 w-12 animate-spin text-white mb-3" />
          <p className="text-lg font-medium text-white mb-1">
            動画を読み込み中...
          </p>
          <p className="text-sm text-center px-4 text-gray-400">
            {playerName}
          </p>
        </div>
      </div>
    );
  }

  // エラー時の表示
  if (state.hasError) {
    return (
      <div 
        className={`aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2 ${className}`}
        style={{ borderColor }}
      >
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-red-900/30 to-gray-900">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-3" />
          <p className="text-lg font-medium text-red-400 mb-2 text-center px-4">
            {state.errorMessage}
          </p>
          <p className="text-sm text-center px-4 text-gray-500 mb-4">
            {playerName}
          </p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  // 動画再生中の表示
  return (
    <div 
      className={`aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2 ${className}`}
      style={{ borderColor }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        playsInline
        webkit-playsinline="true"
        onError={(e) => {
          const error = e.currentTarget.error;
          const errorMessage = getVideoErrorMessage(error);
          updateState({ 
            hasError: true, 
            errorMessage, 
            isLoading: false, 
            isPlaying: false 
          });
        }}
        onPlay={() => updateState({ isPlaying: true })}
        onPause={() => updateState({ isPlaying: false })}
        onEnded={() => updateState({ isPlaying: false })}
      >
        動画がサポートされていないブラウザです
      </video>
    </div>
  );
};

export default VideoPlayer;
