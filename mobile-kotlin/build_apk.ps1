$env:JAVA_HOME = "D:\Android\JDK\jdk-17.0.19+10"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
Set-Location "d:\source\absensi-app\mobile-kotlin"
Write-Host "Using JAVA_HOME: $env:JAVA_HOME"
.\gradlew.bat assembleDebug assembleRelease

