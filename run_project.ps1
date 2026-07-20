# Resolve paths relative to this script's location
$projectRoot = $PSScriptRoot

# Setup PostgreSQL credentials
$env:PGPASSWORD = "Rijalumami1002"
$dbName = "absensi_sholat"
$dbUser = "postgres"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  PONDOK PESANTREN AL-HAMID - ABSENSI SHOLAT  " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check/create database using Python creator helper
Write-Host "Memeriksa status database PostgreSQL..." -ForegroundColor Yellow
& "$projectRoot\venv\Scripts\python.exe" "$projectRoot\backend\create_db.py"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Gagal memverifikasi atau membuat database PostgreSQL!"
    exit 1
}

Write-Host ""
Write-Host "Menjalankan aplikasi..." -ForegroundColor Yellow

# Start backend FastAPI server in a new window
Write-Host "-> Memulai Backend (FastAPI :8000)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Title Backend-FastAPI; Set-Location '$projectRoot'; & '$projectRoot\venv\Scripts\python.exe' -m uvicorn backend.main:app --reload --port 8000" -WorkingDirectory "$projectRoot"

# Start frontend dev server in a new window
Write-Host "-> Memulai Frontend (Vite/React :5173)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Title Frontend-Vite; Set-Location '$projectRoot\frontend'; npm run dev" -WorkingDirectory "$projectRoot\frontend"

# Start C# Bridge in a new window
Write-Host "-> Memulai Fingerprint Bridge..." -ForegroundColor Cyan
Start-Process -FilePath "$projectRoot\bridge\ZKFingerBridge.exe" -WorkingDirectory "$projectRoot\bridge"

Write-Host ""
Write-Host "Selesai! Kedua server sedang dijalankan pada jendela terpisah." -ForegroundColor Green
Write-Host "Silakan buka: http://localhost:5173" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan
