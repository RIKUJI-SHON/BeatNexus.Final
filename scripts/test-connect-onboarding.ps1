param(
  [Parameter(Mandatory=$true)][string]$SupabaseUrl,
  [Parameter(Mandatory=$true)][string]$Jwt
)

$headers = @{ Authorization = "Bearer $Jwt" }

Write-Host "Requesting onboarding_url..."
try {
  $resp = Invoke-RestMethod -Method Post -Uri "$SupabaseUrl/functions/v1/setup-super-tip-receiving" -Headers $headers -ContentType "application/json" -Body "{}"
  $resp | ConvertTo-Json -Depth 5
  if ($resp.success -and $resp.onboarding_url) {
    Write-Host "Open this URL in your browser:" -ForegroundColor Green
    Write-Host $resp.onboarding_url
  } else {
    Write-Error "Failed to get onboarding_url"
  }
} catch {
  Write-Error $_
}
