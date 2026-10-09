# PowerShell Yerel Sunucu ve Uygulama Başlatıcı
$Port = 8080
$Root = $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Öğrenci Yoklama & Performans Takip Sistemi Başlatılıyor  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Dizin: $Root" -ForegroundColor Yellow
Write-Host "Port : $Port" -ForegroundColor Yellow

# Tarayıcıyı aç
Start-Process "http://localhost:$Port/index.html"

# Yerel HTTP Sunucusu (.NET HttpListener)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:$Port/")

try {
    $listener.Start()
    Write-Host "`nSunucu aktif! Tarayıcınızdan aşağıdaki adresle erişebilirsiniz:" -ForegroundColor Green
    Write-Host ">> http://localhost:$Port/index.html" -ForegroundColor White
    Write-Host "(Aynı WiFi ağındaki telefon veya tabletler bilgisayarınızın IP adresiyle bağlanabilir.)" -ForegroundColor Gray
    Write-Host "Sunucuyu durdurmak için Ctrl+C tuşlarına basınız.`n" -ForegroundColor DarkGray

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($path) -or $path -eq '/') {
            $path = "index.html"
        }

        $filePath = Join-Path $Root $path

        if (Test-Path $filePath -PathType Leaf) {
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mimeType = switch ($extension) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                default { "application/octet-stream" }
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mimeType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - Dosya Bulunamadı")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Host "Sunucu dinleme modunda doğrudan dosya açılıyor..." -ForegroundColor Yellow
    Start-Process (Join-Path $Root "index.html")
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
