@echo off
title Registrasi Protocol ZKFinger Bridge
echo ====================================================
echo   REGISTRASI PROTOCOL ZKFINGERBRIDGE:// WINDOWS
echo ====================================================
echo.
powershell -ExecutionPolicy Bypass -Command "& '%~dp0register_protocol.ps1'"
echo.
echo Registrasi Selesai! ZKFingerBridge kini dapat diaktifkan otomatis dari Web.
pause
