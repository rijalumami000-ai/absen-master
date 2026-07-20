# Find C# Compiler path
$csc = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if (!(Test-Path $csc)) {
    $csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
}

if (!(Test-Path $csc)) {
    Write-Error "C# Compiler (csc.exe) tidak ditemukan di Windows .NET Framework folder!"
    exit 1
}

Write-Host "Kompilasi ZKFingerBridge.cs dimulai..."
& $csc /target:winexe /platform:x86 /out:ZKFingerBridge.exe /r:Interop.ZKFPEngXControl.dll ZKFingerBridge.cs

if ($LASTEXITCODE -eq 0) {
    Write-Host "Kompilasi sukses! File output: ZKFingerBridge.exe" -ForegroundColor Green
} else {
    Write-Error "Kompilasi gagal!"
}
