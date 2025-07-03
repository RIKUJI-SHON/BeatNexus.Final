#!/bin/bash

# 📱 BeatNexus 電話番号認証 Edge Function テストスクリプト
# 使用方法: ./test-phone-verification.sh [YOUR_ACCESS_TOKEN] [PHONE_NUMBER]

echo "🧪 BeatNexus Phone Verification Edge Function テスト"
echo "=================================================="

# 設定値
PROJECT_URL="https://wdttluticnlqzmqmfvgt.supabase.co"
EDGE_FUNCTION_URL="${PROJECT_URL}/functions/v1/phone-verification"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkdHRsdXRpY25scXptcW1mdmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MzA5NzYsImV4cCI6MjA2MzMwNjk3Nn0.wzvwpAePsYnMzgMmXMraTmRi_mEun1g6uxeDzBFyUiM"

# パラメータ確認
if [ $# -lt 2 ]; then
    echo "❌ 使用方法: $0 [ACCESS_TOKEN] [PHONE_NUMBER]"
    echo ""
    echo "例: $0 \"eyJhbGciOiJIUzI1NiIs...\" \"+81-90-1234-5678\""
    echo ""
    echo "📝 ACCESS_TOKENの取得方法:"
    echo "1. BeatNexusにログイン"
    echo "2. ブラウザ開発者ツール → Application → Local Storage"
    echo "3. 'sb-wdttluticnlqzmqmfvgt-auth-token' の値をコピー"
    exit 1
fi

ACCESS_TOKEN="$1"
PHONE_NUMBER="$2"

echo "📞 電話番号: $PHONE_NUMBER"
echo "🔗 エンドポイント: $EDGE_FUNCTION_URL"
echo ""

# Step 1: OTP送信テスト
echo "📤 Step 1: OTP送信テスト"
echo "------------------------"

SEND_RESPONSE=$(curl -s -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"send_code\",
    \"phoneNumber\": \"$PHONE_NUMBER\"
  }")

echo "📨 レスポンス: $SEND_RESPONSE"
echo ""

# レスポンスのチェック
if echo "$SEND_RESPONSE" | grep -q "success.*true"; then
    echo "✅ OTP送信成功！SMSを確認してください。"
    echo ""
    echo "📱 次のステップ:"
    echo "1. 受信したSMSのコード（6桁）を確認"
    echo "2. 以下のコマンドで検証:"
    echo ""
    echo "curl -X POST \"$EDGE_FUNCTION_URL\" \\"
    echo "  -H \"Authorization: Bearer $ACCESS_TOKEN\" \\"
    echo "  -H \"apikey: $ANON_KEY\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{"
    echo "    \"action\": \"verify_code\","
    echo "    \"phoneNumber\": \"$PHONE_NUMBER\","
    echo "    \"verificationCode\": \"[受信した6桁コード]\""
    echo "  }'"
    
elif echo "$SEND_RESPONSE" | grep -q "error"; then
    echo "❌ エラーが発生しました:"
    echo "$SEND_RESPONSE" | python -m json.tool 2>/dev/null || echo "$SEND_RESPONSE"
    echo ""
    echo "🔧 確認事項:"
    echo "1. ACCESS_TOKENが有効か"
    echo "2. 電話番号形式が正しいか（例: +81-90-1234-5678）"
    echo "3. Twilio環境変数がSupabaseに正しく設定されているか"
    
else
    echo "⚠️  予期しないレスポンス:"
    echo "$SEND_RESPONSE"
fi

echo ""
echo "🏁 テスト完了" 