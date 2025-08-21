$ErrorActionPreference = 'Stop'
$serveUrl = 'https://wdttluticnlqzmqmfvgt.functions.supabase.co/ad-serve'
$trackUrl = 'https://wdttluticnlqzmqmfvgt.functions.supabase.co/ad-track'
$placement = 'ranking.top.banner'
$anon = [System.Guid]::NewGuid().ToString()
$iterations = 25
$durations = @()
$token = $null
Write-Host "Anon Session: $anon"
for ($i=0; $i -lt $iterations; $i++) {
  $bodyObj = [pscustomobject]@{ placement = $placement; lang = 'ja'; device = 'desktop'; anon = $anon }
  $json = $bodyObj | ConvertTo-Json -Compress
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-RestMethod -Method Post -Uri $serveUrl -Body $json -ContentType 'application/json' -TimeoutSec 30
  } catch {
  Write-Warning ("serve error iteration {0}: {1}" -f $i, $_)
  }
  $sw.Stop()
  $durations += $sw.Elapsed.TotalMilliseconds
  if (-not $token -and $resp.ok) { $token = $resp.data.token }
  Start-Sleep -Milliseconds 35
}
if (-not $token) { Write-Error 'Failed to obtain token from serve responses.'; exit 2 }
$sorted = $durations | Sort-Object
$p95Index = [Math]::Ceiling(0.95 * $sorted.Count) - 1; if ($p95Index -lt 0) { $p95Index = 0 }
$p95 = [Math]::Round($sorted[$p95Index],2)
$avg = [Math]::Round((($durations | Measure-Object -Average).Average),2)
$min = [Math]::Round((($durations | Measure-Object -Minimum).Minimum),2)
$max = [Math]::Round((($durations | Measure-Object -Maximum).Maximum),2)
# Impression duplicate test
$impBody = [pscustomobject]@{ type='impression'; token=$token } | ConvertTo-Json -Compress
$imp1 = Invoke-RestMethod -Method Post -Uri $trackUrl -Body $impBody -ContentType 'application/json'
$imp2 = Invoke-RestMethod -Method Post -Uri $trackUrl -Body $impBody -ContentType 'application/json'
# Click duplicate test
$clickBody = [pscustomobject]@{ type='click'; token=$token } | ConvertTo-Json -Compress
$click1 = Invoke-RestMethod -Method Post -Uri $trackUrl -Body $clickBody -ContentType 'application/json'
$click2 = Invoke-RestMethod -Method Post -Uri $trackUrl -Body $clickBody -ContentType 'application/json'
# Tamper token (replace last 3 chars)
if ($token.Length -gt 3) { $badToken = $token.Substring(0, $token.Length-3) + 'XYZ' } else { $badToken = 'XYZ' }
$badBody = [pscustomobject]@{ type='impression'; token=$badToken } | ConvertTo-Json -Compress
$badResp = Invoke-RestMethod -Method Post -Uri $trackUrl -Body $badBody -ContentType 'application/json'
$result = [pscustomobject]@{
  samples = $iterations
  p95_ms = $p95
  avg_ms = $avg
  min_ms = $min
  max_ms = $max
  token_len = $token.Length
  impression_first = $imp1
  impression_dup = $imp2
  click_first = $click1
  click_dup = $click2
  tamper = $badResp
}
$result | ConvertTo-Json -Depth 6
