@echo off
title Memulai Aplikasi Absensi Al-Hamid
cd /d "%~dp0"
echo Menjalankan script absensi...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run_project.ps1
pause
