$proxy = if ($env:LOCAL_PROXY_URL) { $env:LOCAL_PROXY_URL } else { "http://127.0.0.1:61092" }

$env:NODE_USE_ENV_PROXY = "1"
$env:HTTP_PROXY = $proxy
$env:HTTPS_PROXY = $proxy

Write-Host "[dev:proxy] NODE_USE_ENV_PROXY=1"
Write-Host "[dev:proxy] HTTP_PROXY=$proxy"
Write-Host "[dev:proxy] HTTPS_PROXY=$proxy"

npx next dev
