# CryptoPulse Production Configuration Validation Script
Write-Host "CryptoPulse Production Configuration Validation" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

$errors = @()
$warnings = @()
$success = @()

# Check Back4App Configuration
Write-Host "`n1. Back4App Configuration Validation" -ForegroundColor Cyan

if (Test-Path "production-config.env") {
    $success += "Production configuration file exists"
    
    $prodConfig = Get-Content "production-config.env"
    
    $appId = ($prodConfig | Where-Object { $_ -match "^BACK4APP_APP_ID=" } | ForEach-Object { ($_ -split "=")[1] })
    $masterKey = ($prodConfig | Where-Object { $_ -match "^BACK4APP_MASTER_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    $jsKey = ($prodConfig | Where-Object { $_ -match "^BACK4APP_JAVASCRIPT_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    $clientKey = ($prodConfig | Where-Object { $_ -match "^BACK4APP_CLIENT_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    
    if ($appId -eq "vCaSfrlHLY8xevRt2KH2Wg7I7hRIqKMY0UssPVC1") {
        $success += "Back4App App ID configured correctly"
    } else {
        $errors += "Back4App App ID not configured correctly"
    }
    
    if ($masterKey -eq "KyATtYQBqOOx8gqrnq9N18XCGoMmjgLTvEWh7FGz") {
        $success += "Back4App Master Key configured correctly"
    } else {
        $errors += "Back4App Master Key not configured correctly"
    }
    
    if ($jsKey -eq "l9BxFwYIloWojfjUGAk4oir2u0R0jxaKOdUWe1Vz") {
        $success += "Back4App JavaScript Key configured correctly"
    } else {
        $errors += "Back4App JavaScript Key not configured correctly"
    }
    
    if ($clientKey -eq "4jsNlzxVKmoOe9s23tRDejWUBYMX4y3hnv3TUMvO") {
        $success += "Back4App Client Key configured correctly"
    } else {
        $errors += "Back4App Client Key not configured correctly"
    }
} else {
    $errors += "Production configuration file missing"
}

# Check Frontend Configuration
Write-Host "`n2. Frontend Configuration Validation" -ForegroundColor Cyan

if (Test-Path "frontend-production-config.env") {
    $success += "Frontend production configuration file exists"
    
    $frontendConfig = Get-Content "frontend-production-config.env"
    
    $frontendAppId = ($frontendConfig | Where-Object { $_ -match "^VITE_BACK4APP_APP_ID=" } | ForEach-Object { ($_ -split "=")[1] })
    $frontendClientKey = ($frontendConfig | Where-Object { $_ -match "^VITE_BACK4APP_CLIENT_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    
    if ($frontendAppId -eq "vCaSfrlHLY8xevRt2KH2Wg7I7hRIqKMY0UssPVC1") {
        $success += "Frontend Back4App App ID configured correctly"
    } else {
        $errors += "Frontend Back4App App ID not configured correctly"
    }
    
    if ($frontendClientKey -eq "4jsNlzxVKmoOe9s23tRDejWUBYMX4y3hnv3TUMvO") {
        $success += "Frontend Back4App Client Key configured correctly"
    } else {
        $errors += "Frontend Back4App Client Key not configured correctly"
    }
} else {
    $errors += "Frontend production configuration file missing"
}

# Check Security Keys
Write-Host "`n3. Security Keys Validation" -ForegroundColor Cyan

if (Test-Path "production-config.env") {
    $prodConfig = Get-Content "production-config.env"
    
    $jwtSecret = ($prodConfig | Where-Object { $_ -match "^JWT_SECRET=" } | ForEach-Object { ($_ -split "=")[1] })
    $encryptionKey = ($prodConfig | Where-Object { $_ -match "^ENCRYPTION_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    
    if ($jwtSecret -and $jwtSecret.Length -ge 32) {
        $success += "JWT Secret configured (32+ characters)"
    } else {
        $errors += "JWT Secret not properly configured"
    }
    
    if ($encryptionKey -and $encryptionKey.Length -ge 32) {
        $success += "Encryption Key configured (32+ characters)"
    } else {
        $errors += "Encryption Key not properly configured"
    }
}

# Check Cloud Functions
Write-Host "`n4. Cloud Functions Validation" -ForegroundColor Cyan

if (Test-Path "cloud/main.js") {
    $success += "Cloud functions main file exists"
} else {
    $errors += "Cloud functions main file missing"
}

if (Test-Path "frontend/src/back4app/config.ts") {
    $success += "Frontend Back4App config exists"
} else {
    $errors += "Frontend Back4App config missing"
}

# Summary
Write-Host "`nCONFIGURATION VALIDATION SUMMARY" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

Write-Host "`nSUCCESSFUL CONFIGURATIONS ($($success.Count)):" -ForegroundColor Green
foreach ($item in $success) {
    Write-Host "  - $item" -ForegroundColor White
}

if ($warnings.Count -gt 0) {
    Write-Host "`nWARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($item in $warnings) {
        Write-Host "  - $item" -ForegroundColor White
    }
}

if ($errors.Count -gt 0) {
    Write-Host "`nERRORS ($($errors.Count)):" -ForegroundColor Red
    foreach ($item in $errors) {
        Write-Host "  - $item" -ForegroundColor White
    }
}

# Final Assessment
Write-Host "`nFINAL ASSESSMENT" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan

$totalChecks = $success.Count + $warnings.Count + $errors.Count
$successRate = if ($totalChecks -gt 0) { [math]::Round(($success.Count / $totalChecks) * 100, 2) } else { 0 }

Write-Host "Total Checks: $totalChecks" -ForegroundColor White
Write-Host "Success Rate: $successRate%" -ForegroundColor White

if ($errors.Count -eq 0) {
    Write-Host "`nPRODUCTION READY! All critical configurations are correct!" -ForegroundColor Green
    Write-Host "Safe to deploy to production environment" -ForegroundColor Green
} else {
    Write-Host "`nNOT PRODUCTION READY! Critical errors need to be fixed" -ForegroundColor Red
    Write-Host "Address errors before production deployment" -ForegroundColor Red
}

Write-Host "`nNEXT STEPS:" -ForegroundColor Green
Write-Host "1. Copy production-config.env to .env.production" -ForegroundColor White
Write-Host "2. Copy frontend-production-config.env to frontend/.env.production" -ForegroundColor White
Write-Host "3. Configure Cashfree credentials in .env.production" -ForegroundColor White
Write-Host "4. Run production tests: npm run test:production" -ForegroundColor White
Write-Host "5. Deploy to Back4App" -ForegroundColor White
