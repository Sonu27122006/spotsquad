Write-Host "Compiling Smart Parking Java Backend..." -ForegroundColor Cyan
if (!(Test-Path -Path "bin")) {
    New-Item -ItemType Directory -Path "bin" | Out-Null
}

$sources = Get-ChildItem -Path "src/main/java" -Filter "*.java" -Recurse | ForEach-Object { $_.FullName }
& javac -encoding UTF-8 -cp "lib/*" -d bin $sources

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Compilation successful. Starting Java backend on port 5000..." -ForegroundColor Green
    & java -cp "bin;lib/*" com.smartparking.Main
} else {
    Write-Host "[ERROR] Compilation failed." -ForegroundColor Red
}
