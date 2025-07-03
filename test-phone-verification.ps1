# 📱 BeatNexus 電話番号認証 Edge Function テストスクリプト (PowerShell)
# 使用方法: .\test-phone-verification.ps1 -AccessToken "your_token" -PhoneNumber "+81-90-1234-5678"

param(
    [Parameter(Mandatory=$true)]
    [string]$AccessToken,
    
    [Parameter(Mandatory=$true)]
    [string]$PhoneNumber
)

Write-Host "🧪 BeatNexus Phone Verification Edge Function テスト" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 設定値
$ProjectUrl = "https://wdttluticnlqzmqmfvgt.supabase.co"
$EdgeFunctionUrl = "$ProjectUrl/functions/v1/phone-verification"
$AnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkdHRsdXRpY25scXptcW1mdmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MzA5NzYsImV4cCI6MjA2MzMwNjk3Nn0.wzvwpAePsYnMzgMmXMraTmRi_mEun1g6uxeDzBFyUiM"

Write-Host "📞 電話番号: $PhoneNumber" -ForegroundColor Yellow
Write-Host "🔗 エンドポイント: $EdgeFunctionUrl" -ForegroundColor Yellow
Write-Host ""

# Step 1: OTP送信テスト
Write-Host "📤 Step 1: OTP送信テスト" -ForegroundColor Green
Write-Host "------------------------" -ForegroundColor Green

$headers = @{
    "Authorization" = "Bearer $AccessToken"
    "apikey" = $AnonKey
    "Content-Type" = "application/json"
}

$body = @{
    action = "send_code"
    phoneNumber = $PhoneNumber
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $EdgeFunctionUrl -Method Post -Headers $headers -Body $body
    
    Write-Host "📨 レスポンス:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3 | Write-Host
    
    if ($response.success -eq $true) {
        Write-Host ""
        Write-Host "✅ OTP送信成功！SMSを確認してください。" -ForegroundColor Green
        Write-Host ""
        Write-Host "📱 次のステップ:" -ForegroundColor Cyan
        Write-Host "1. 受信したSMSのコード（6桁）を確認"
        Write-Host "2. 以下のコマンドで検証:"
        Write-Host ""
        Write-Host ".\test-phone-verification.ps1 -AccessToken `"$AccessToken`" -PhoneNumber `"$PhoneNumber`" -Action verify -Code `"123456`"" -ForegroundColor Yellow
    } else {
        Write-Host "❌ エラーが発生しました:" -ForegroundColor Red
        $response | ConvertTo-Json -Depth 3 | Write-Host
    }
    
} catch {
    Write-Host "❌ リクエストエラー:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    Write-Host ""
    Write-Host "🔧 確認事項:" -ForegroundColor Yellow
    Write-Host "1. ACCESS_TOKENが有効か"
    Write-Host "2. BeatNexusにログインしているか"
    Write-Host "3. 電話番号形式が正しいか（例: +81-90-1234-5678）"
    Write-Host "4. Twilio環境変数がSupabaseに正しく設定されているか"
}

Write-Host ""
Write-Host "🏁 テスト完了" -ForegroundColor Cyan 