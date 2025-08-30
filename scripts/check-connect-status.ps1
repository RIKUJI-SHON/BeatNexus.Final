param(
  [Parameter(Mandatory=$true)][string]$SupabaseUrl,
  [Parameter(Mandatory=$true)][string]$Jwt
)

$headers = @{ Authorization = "Bearer $Jwt" }

Write-Host "Checking connect account status..."
try {
  $resp = Invoke-RestMethod -Method Get -Uri "$SupabaseUrl/functions/v1/get-connect-account-status" -Headers $headers
  $resp | ConvertTo-Json -Depth 8
} catch {
  Write-Error $_
}
