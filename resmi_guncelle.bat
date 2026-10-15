@echo off
title Yurt Resmi Güncelleme - İrfaniye Akademi
echo ========================================================
echo   İrfaniye Akademi - Yurt Binası Fotoğrafı Güncelleniyor
echo ========================================================
echo.

set "SRC=%USERPROFILE%\.gemini\antigravity\brain\6788a07d-28ec-4609-b749-0586ac71c26a\.user_uploaded\media_1792072580152_ed013131.jpg"
set "DST=%~dp0kurs_logo.jpg"

if exist "%SRC%" (
    copy /Y "%SRC%" "%DST%" >nul
)

if not exist "%DST%" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Copy-Item -LiteralPath \"$env:USERPROFILE\.gemini\antigravity\brain\6788a07d-28ec-4609-b749-0586ac71c26a\.user_uploaded\media_1792072580152_ed013131.jpg\" -Destination '%~dp0kurs_logo.jpg' -Force"
)

echo.
if exist "%DST%" (
    echo [BAŞARILI] Yeni gündüz yurt fotoğrafı başarıyla kurs_logo.jpg olarak ayarlandı!
    echo Tarayıcınızda index.html veya pano.html sayfasını yenileyebilirsiniz.
) else (
    echo [BİLGİ] Otomatik kopyalama tamamlanamadı. 
    echo Lütfen yüklediğiniz gündüz yurt fotoğrafını bu klasöre kopyalayıp adını kurs_logo.jpg yapınız.
)

echo.
echo Kapatmak için klavyeden herhangi bir tuşa basınız...
pause >nul
