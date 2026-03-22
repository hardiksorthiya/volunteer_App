# Clear Cache Script for React Native/Expo
Write-Host "🧹 Clearing React Native/Expo cache..." -ForegroundColor Yellow

# Stop any running Metro bundler processes
Write-Host "Stopping Metro bundler..." -ForegroundColor Cyan
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*metro*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear Metro bundler cache
Write-Host "Clearing Metro cache..." -ForegroundColor Cyan
if (Test-Path "$env:TEMP\metro-*") {
    Remove-Item "$env:TEMP\metro-*" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "$env:TEMP\haste-map-*") {
    Remove-Item "$env:TEMP\haste-map-*" -Recurse -Force -ErrorAction SilentlyContinue
}

# Clear node_modules cache
Write-Host "Clearing node_modules cache..." -ForegroundColor Cyan
if (Test-Path "node_modules\.cache") {
    Remove-Item "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
}

# Clear Expo cache
Write-Host "Clearing Expo cache..." -ForegroundColor Cyan
if (Test-Path ".expo") {
    Remove-Item ".expo" -Recurse -Force -ErrorAction SilentlyContinue
}

# Clear watchman (if exists)
Write-Host "Clearing watchman cache..." -ForegroundColor Cyan
if (Get-Command watchman -ErrorAction SilentlyContinue) {
    watchman watch-del-all 2>$null
}

Write-Host "✅ Cache cleared! Now run: npx expo start --clear" -ForegroundColor Green

