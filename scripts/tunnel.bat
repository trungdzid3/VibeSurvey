@echo off
chcp 65001 >nul
echo ============================================================
echo   VIBESURVEY - KHỞI TẠO CLOUDFLARE QUICK TUNNEL (REGION US)
echo ============================================================
echo Đang mở tunnel chuyển tiếp cổng 3000 ra Internet qua cụm Region US (chống nghẽn DNS)...
npx --yes cloudflared tunnel --region us --url http://localhost:3000
pause
