# Register zkfingerbridge:// Custom URL Protocol in Windows Registry

$exePath = "d:\source\absensi-app\bridge\ZKFingerBridge.exe"
$registryPath = "HKCU:\Software\Classes\zkfingerbridge"

New-Item -Path $registryPath -Force | Out-Null
Set-ItemProperty -Path $registryPath -Name "(default)" -Value "URL:ZKFingerBridge Protocol"
Set-ItemProperty -Path $registryPath -Name "URL Protocol" -Value ""

New-Item -Path "$registryPath\DefaultIcon" -Force | Out-Null
Set-ItemProperty -Path "$registryPath\DefaultIcon" -Name "(default)" -Value "`"$exePath`",1"

New-Item -Path "$registryPath\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$registryPath\shell\open\command" -Name "(default)" -Value "`"$exePath`" `"%1`""

Write-Host "Protokol custom zkfingerbridge:// berhasil didaftarkan di Windows Registry!" -ForegroundColor Green
