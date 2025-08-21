/**
 * 開発環境のEdge Function直接テスト
 */

const DEV_SUPABASE_URL = 'https://wdttluticnlqzmqmfvgt.supabase.co';
const DEV_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkdHRsdXRpY25scXptcW1mdmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MzA5NzYsImV4cCI6MjA2MzMwNjk3Nn0.wzvwpAePsYnMzgMmXMraTmRi_mEun1g6uxeDzBFyUiM';

async function testDevAdServe() {
  console.log('🧪 開発環境のad-serve Edge Functionをテスト中...');
  
  try {
    const response = await fetch(`${DEV_SUPABASE_URL}/functions/v1/ad-serve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEV_ANON_KEY}`
      },
      body: JSON.stringify({
        placement: 'battles.list.after-3.infeed'
      })
    });

    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📄 Response Data:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.ok) {
      console.log('✅ 開発環境のEdge Function正常動作');
      console.log('🎯 Creative ID:', data.data?.creative?.creative_id);
      console.log('📝 Headline:', data.data?.creative?.headline);
    } else {
      console.log('❌ 開発環境のEdge Functionエラー');
    }
    
  } catch (error) {
    console.error('💥 テスト実行エラー:', error.message);
  }
}

testDevAdServe();
