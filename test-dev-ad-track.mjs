import https from 'https';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzaWQiOiIwODMwYzFlMi1lZDNmLTQyNmQtOWJiNC1kOTAwYzM0MGU3MjgiLCJwayI6ImJhdHRsZXMubGlzdC5hZnRlci0zLmluZmVlZCIsImlhdCI6MTc1NzE0NzgzNSwiZXhwIjoxNzU3MTQ4MTM2fQ.Fog46EcMzqnabvqc5va9Br9tPhfD7_0qmQ4mbOFr_Ow';

const postData = JSON.stringify({
  type: 'impression',
  anon_session_id: 'test-session'
});

const options = {
  hostname: 'wdttluticnlqzmqmfvgt.supabase.co',
  path: '/functions/v1/ad-track',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing ad-track with JWT token...');
console.log('📊 Token payload:', JSON.parse(Buffer.from(token.split('.')[1], 'base64')));

const req = https.request(options, (res) => {
  console.log('📊 Response Status:', res.statusCode);
  console.log('📋 Response Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response Data:', data);
    try {
      const json = JSON.parse(data);
      console.log('📄 Parsed Response:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('📄 Raw Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
});

req.write(postData);
req.end();
