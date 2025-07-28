// 日本時間での日時表示ユーティリティ関数

/**
 * UTC時間を日本時間（JST）に変換して表示用文字列を生成
 * @param dateString UTC時間の文字列
 * @param includeTime 時間も含めるかどうか（デフォルト: true）
 * @param language 言語設定（'ja' | 'en'）
 * @returns 日本時間での表示文字列
 */
export const formatToJSTString = (
  dateString: string,
  includeTime: boolean = true,
  language: 'ja' | 'en' = 'ja'
): string => {
  const date = new Date(dateString);
  
  if (language === 'en') {
    // 英語表示
    const dateStr = date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (includeTime) {
      const timeStr = date.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return `${dateStr} at ${timeStr} (JST)`;
    }
    
    return `${dateStr} (JST)`;
  } else {
    // 日本語表示
    const dateStr = date.toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (includeTime) {
      const timeStr = date.toLocaleTimeString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${dateStr} ${timeStr}（日本時間）`;
    }
    
    return `${dateStr}（日本時間）`;
  }
};

/**
 * 投稿制限のメッセージを生成
 * @param reason 制限理由
 * @param nextSeasonStartDate 次のシーズン開始日時
 * @param language 言語設定
 * @returns メッセージ文字列
 */
export const generateSubmissionMessage = (
  reason: string | null,
  nextSeasonStartDate: string | null,
  language: 'ja' | 'en' = 'ja'
): string => {
  if (reason === 'SEASON_OFF') {
    if (nextSeasonStartDate) {
      const jstDateTimeString = formatToJSTString(nextSeasonStartDate, true, language);
      
      if (language === 'en') {
        return `The season has ended. The next season is scheduled to start on ${jstDateTimeString}.`;
      } else {
        return `シーズンが終了しています。次のシーズンは ${jstDateTimeString} に開始予定です。`;
      }
    }
    
    if (language === 'en') {
      return 'The season has ended. Please wait for the next season to start.';
    } else {
      return 'シーズンが終了しています。次のシーズンの開始をお待ちください。';
    }
  }
  
  if (reason === 'ENDING_SOON') {
    if (language === 'en') {
      return 'Video submissions are disabled 1 day before the season ends.';
    } else {
      return 'シーズン終了の1日前のため、新しい動画の投稿はできません。';
    }
  }
  
  return '';
};
