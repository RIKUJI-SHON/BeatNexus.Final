// 本番環境Ad-serve Edge Functionテスト用スクリプト
import fetch from 'node-fetch';

const testAdFetch = async (placementKey) => {
  try {
    const apiUrl = 'https://qgqcjtjxaoplhxurbpis.supabase.co';
    const response = await fetch(`${apiUrl}/functions/v1/ad-serve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFncWNqdGp4YW9wbGh4dXJicGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTA2MjcsImV4cCI6MjA2Mzc2NjYyN30.ga96XIqzpaMpqCQZ-O47TbZlV42wfkOFe6PzjlyKZoo'
      },
      body: JSON.stringify({ placement: placementKey })
    });
    
    const result = await response.json();
    console.log(`[${placementKey}] Status: ${response.status}`);
    console.log(`[${placementKey}] Response:`, JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error(`[${placementKey}] Error:`, error.message);
  }
};

// テスト実行
const testPlacements = [
  'battles.list.after-3.infeed',
  'battles.list.after-6.infeed',
  'news.carousel.slide-3'
];

console.log('本番環境 ad-serve テスト開始...');

for (const placement of testPlacements) {
  await testAdFetch(placement);
  console.log('---');
}

console.log('テスト完了');
