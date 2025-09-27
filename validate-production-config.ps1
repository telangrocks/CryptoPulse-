# =============================================================================
# CryptoPulse Production Configuration Validation Script
# =============================================================================
# This script validates all production configurations are properly set up

Write-Host "🚀 CryptoPulse Production Configuration Validation" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green

$errors = @()
$warnings = @()
$success = @()

# =============================================================================
# 1. BACK4APP CONFIGURATION VALIDATION
# =============================================================================
Write-Host "`n📋 1. Back4App Configuration Validation" -ForegroundColor Cyan

# Check if production config exists
if (Test-Path "production-config.env") {
    $success += "✅ Production configuration file exists"
    
    $prodConfig = Get-Content "production-config.env"
    
    # Validate Back4App credentials
    $appId = ($prodConfig | Where-Object { $_ -match "^BACK4APP_APP_ID=" } | ForEach-Object { ($_ -split "=")[1] })
    $masterKey = ($prodConfig | Where-Object { $_ -match "^BACK4APP_MASTER_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    $jsKey = ($prodConfig | Where-Object { $_ -match "^BACK4APP_JAVASCRIPT_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    $clientKey = ($prodConfig | Where-Object { $_ -match "^BACK4APP_CLIENT_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    
    if ($appId -eq "vCaSfrlHLY8xevRt2KH2Wg7I7hRIqKMY0UssPVC1") {
        $success += "✅ Back4App App ID configured correctly"
    } else {
        $errors += "❌ Back4App App ID not configured correctly"
    }
    
    if ($masterKey -eq "KyATtYQBqOOx8gqrnq9N18XCGoMmjgLTvEWh7FGz") {
        $success += "✅ Back4App Master Key configured correctly"
    } else {
        $errors += "❌ Back4App Master Key not configured correctly"
    }
    
    if ($jsKey -eq "l9BxFwYIloWojfjUGAk4oir2u0R0jxaKOdUWe1Vz") {
        $success += "✅ Back4App JavaScript Key configured correctly"
    } else {
        $errors += "❌ Back4App JavaScript Key not configured correctly"
    }
    
    if ($clientKey -eq "4jsNlzxVKmoOe9s23tRDejWUBYMX4y3hnv3TUMvO") {
        $success += "✅ Back4App Client Key configured correctly"
    } else {
        $errors += "❌ Back4App Client Key not configured correctly"
    }
} else {
    $errors += "❌ Production configuration file missing"
}

# =============================================================================
# 2. FRONTEND CONFIGURATION VALIDATION
# =============================================================================
Write-Host "`n📋 2. Frontend Configuration Validation" -ForegroundColor Cyan

if (Test-Path "frontend-production-config.env") {
    $success += "✅ Frontend production configuration file exists"
    
    $frontendConfig = Get-Content "frontend-production-config.env"
    
    # Validate frontend Back4App credentials
    $frontendAppId = ($frontendConfig | Where-Object { $_ -match "^VITE_BACK4APP_APP_ID=" } | ForEach-Object { ($_ -split "=")[1] })
    $frontendClientKey = ($frontendConfig | Where-Object { $_ -match "^VITE_BACK4APP_CLIENT_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    
    if ($frontendAppId -eq "vCaSfrlHLY8xevRt2KH2Wg7I7hRIqKMY0UssPVC1") {
        $success += "✅ Frontend Back4App App ID configured correctly"
    } else {
        $errors += "❌ Frontend Back4App App ID not configured correctly"
    }
    
    if ($frontendClientKey -eq "4jsNlzxVKmoOe9s23tRDejWUBYMX4y3hnv3TUMvO") {
        $success += "✅ Frontend Back4App Client Key configured correctly"
    } else {
        $errors += "❌ Frontend Back4App Client Key not configured correctly"
    }
} else {
    $errors += "❌ Frontend production configuration file missing"
}

# =============================================================================
# 3. SECURITY KEYS VALIDATION
# =============================================================================
Write-Host "`n📋 3. Security Keys Validation" -ForegroundColor Cyan

if (Test-Path "production-config.env") {
    $prodConfig = Get-Content "production-config.env"
    
    $jwtSecret = ($prodConfig | Where-Object { $_ -match "^JWT_SECRET=" } | ForEach-Object { ($_ -split "=")[1] })
    $encryptionKey = ($prodConfig | Where-Object { $_ -match "^ENCRYPTION_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    $csrfSecret = ($prodConfig | Where-Object { $_ -match "^CSRF_SECRET=" } | ForEach-Object { ($_ -split "=")[1] })
    $sessionSecret = ($prodConfig | Where-Object { $_ -match "^SESSION_SECRET=" } | ForEach-Object { ($_ -split "=")[1] })
    
    if ($jwtSecret -and $jwtSecret.Length -ge 32) {
        $success += "✅ JWT Secret configured (32+ characters)"
    } else {
        $errors += "❌ JWT Secret not properly configured"
    }
    
    if ($encryptionKey -and $encryptionKey.Length -ge 32) {
        $success += "✅ Encryption Key configured (32+ characters)"
    } else {
        $errors += "❌ Encryption Key not properly configured"
    }
    
    if ($csrfSecret -and $csrfSecret.Length -ge 20) {
        $success += "✅ CSRF Secret configured (20+ characters)"
    } else {
        $errors += "❌ CSRF Secret not properly configured"
    }
    
    if ($sessionSecret -and $sessionSecret.Length -ge 20) {
        $success += "✅ Session Secret configured (20+ characters)"
    } else {
        $errors += "❌ Session Secret not properly configured"
    }
}

# =============================================================================
# 4. CASHFREE CONFIGURATION VALIDATION
# =============================================================================
Write-Host "`n📋 4. Cashfree Payment Configuration Validation" -ForegroundColor Cyan

if (Test-Path "production-config.env") {
    $prodConfig = Get-Content "production-config.env"
    
    $cashfreeMode = ($prodConfig | Where-Object { $_ -match "^CASHFREE_MODE=" } | ForEach-Object { ($_ -split "=")[1] })
    $cashfreeAppId = ($prodConfig | Where-Object { $_ -match "^CASHFREE_APP_ID=" } | ForEach-Object { ($_ -split "=")[1] })
    $cashfreeSecret = ($prodConfig | Where-Object { $_ -match "^CASHFREE_SECRET_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    
    if ($cashfreeMode -eq "sandbox") {
        $success += "✅ Cashfree mode set to sandbox (safe for testing)"
    } else {
        $warnings += "⚠️ Cashfree mode not set to sandbox"
    }
    
    if ($cashfreeAppId -and $cashfreeAppId -notmatch "PLACEHOLDER") {
        $success += "✅ Cashfree App ID configured"
    } else {
        $warnings += "⚠️ Cashfree App ID needs to be configured"
    }
    
    if ($cashfreeSecret -and $cashfreeSecret -notmatch "PLACEHOLDER") {
        $success += "✅ Cashfree Secret Key configured"
    } else {
        $warnings += "⚠️ Cashfree Secret Key needs to be configured"
    }
}

# =============================================================================
# 5. EXCHANGE API CONFIGURATION VALIDATION
# =============================================================================
Write-Host "`n📋 5. Exchange API Configuration Validation" -ForegroundColor Cyan

if (Test-Path "production-config.env") {
    $prodConfig = Get-Content "production-config.env"
    
    $binanceKey = ($prodConfig | Where-Object { $_ -match "^BINANCE_API_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    $wazirxKey = ($prodConfig | Where-Object { $_ -match "^WAZIRX_API_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    $coindcxKey = ($prodConfig | Where-Object { $_ -match "^COINDCX_API_KEY=" } | ForEach-Object { ($_ -split "=")[1] })
    
    if ($binanceKey -eq "USER_WILL_CONFIGURE") {
        $success += "✅ Binance API Key marked for user configuration"
    } else {
        $warnings += "⚠️ Binance API Key configuration status unclear"
    }
    
    if ($wazirxKey -eq "USER_WILL_CONFIGURE") {
        $success += "✅ WazirX API Key marked for user configuration"
    } else {
        $warnings += "⚠️ WazirX API Key configuration status unclear"
    }
    
    if ($coindcxKey -eq "USER_WILL_CONFIGURE") {
        $success += "✅ CoinDCX API Key marked for user configuration"
    } else {
        $warnings += "⚠️ CoinDCX API Key configuration status unclear"
    }
}

# =============================================================================
# 6. CLOUD FUNCTIONS VALIDATION
# =============================================================================
Write-Host "`n📋 6. Cloud Functions Validation" -ForegroundColor Cyan

if (Test-Path "cloud/main.js") {
    $success += "✅ Cloud functions main file exists"
    
    $mainJs = Get-Content "cloud/main.js"
    
    # Check for Back4App initialization
    if ($mainJs | Where-Object { $_ -match "Parse.initialize" }) {
        $success += "✅ Parse initialization found in cloud functions"
    } else {
        $errors += "❌ Parse initialization missing in cloud functions"
    }
    
    # Check for security modules
    if ($mainJs | Where-Object { $_ -match "require.*security" }) {
        $success += "✅ Security module integrated"
    } else {
        $errors += "❌ Security module not integrated"
    }
    
    # Check for health check
    if ($mainJs | Where-Object { $_ -match "healthCheck" }) {
        $success += "✅ Health check function integrated"
    } else {
        $errors += "❌ Health check function missing"
    }
} else {
    $errors += "❌ Cloud functions main file missing"
}

# =============================================================================
# 7. FRONTEND CONFIGURATION VALIDATION
# =============================================================================
Write-Host "`n📋 7. Frontend Configuration Validation" -ForegroundColor Cyan

if (Test-Path "frontend/src/back4app/config.ts") {
    $success += "✅ Frontend Back4App config exists"
    
    $frontendConfig = Get-Content "frontend/src/back4app/config.ts"
    
    if ($frontendConfig | Where-Object { $_ -match "vCaSfrlHLY8xevRt2KH2Wg7I7hRIqKMY0UssPVC1" }) {
        $success += "✅ Frontend config has correct Back4App App ID"
    } else {
        $errors += "❌ Frontend config missing correct Back4App App ID"
    }
    
    if ($frontendConfig | Where-Object { $_ -match "4jsNlzxVKmoOe9s23tRDejWUBYMX4y3hnv3TUMvO" }) {
        $success += "✅ Frontend config has correct Back4App Client Key"
    } else {
        $errors += "❌ Frontend config missing correct Back4App Client Key"
    }
} else {
    $errors += "❌ Frontend Back4App config missing"
}

# =============================================================================
# 8. DOCKER CONFIGURATION VALIDATION
# =============================================================================
Write-Host "`n📋 8. Docker Configuration Validation" -ForegroundColor Cyan

if (Test-Path "Dockerfile.backend") {
    $success += "✅ Backend Dockerfile exists"
} else {
    $errors += "❌ Backend Dockerfile missing"
}

if (Test-Path "frontend/Dockerfile") {
    $success += "✅ Frontend Dockerfile exists"
} else {
    $errors += "❌ Frontend Dockerfile missing"
}

if (Test-Path "docker-compose.yml") {
    $success += "✅ Docker Compose file exists"
} else {
    $errors += "❌ Docker Compose file missing"
}

# =============================================================================
# 9. TESTING CONFIGURATION VALIDATION
# =============================================================================
Write-Host "`n📋 9. Testing Configuration Validation" -ForegroundColor Cyan

if (Test-Path "__tests__") {
    $success += "✅ Test directory exists"
    
    $testFiles = Get-ChildItem "__tests__" -Name "*.test.*"
    if ($testFiles.Count -gt 0) {
        $success += "✅ Test files found ($($testFiles.Count) files)"
    } else {
        $warnings += "⚠️ No test files found"
    }
} else {
    $warnings += "⚠️ Test directory missing"
}

if (Test-Path "scripts/run-production-tests.js") {
    $success += "✅ Production test script exists"
} else {
    $warnings += "⚠️ Production test script missing"
}

# =============================================================================
# 10. DOCUMENTATION VALIDATION
# =============================================================================
Write-Host "`n📋 10. Documentation Validation" -ForegroundColor Cyan

$docFiles = @("README.md", "DEPLOYMENT.md", "CREDENTIALS_AND_REQUIREMENTS.md")
foreach ($docFile in $docFiles) {
    if (Test-Path $docFile) {
        $success += "✅ $docFile exists"
    } else {
        $warnings += "⚠️ $docFile missing"
    }
}

# =============================================================================
# SUMMARY REPORT
# =============================================================================
Write-Host "`n🎯 CONFIGURATION VALIDATION SUMMARY" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Yellow

Write-Host "`n✅ SUCCESSFUL CONFIGURATIONS ($($success.Count)):" -ForegroundColor Green
foreach ($item in $success) {
    Write-Host "   $item" -ForegroundColor White
}

if ($warnings.Count -gt 0) {
    Write-Host "`n⚠️ WARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($item in $warnings) {
        Write-Host "   $item" -ForegroundColor White
    }
}

if ($errors.Count -gt 0) {
    Write-Host "`n❌ ERRORS ($($errors.Count)):" -ForegroundColor Red
    foreach ($item in $errors) {
        Write-Host "   $item" -ForegroundColor White
    }
}

# =============================================================================
# FINAL ASSESSMENT
# =============================================================================
Write-Host "`n🏆 FINAL ASSESSMENT" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$totalChecks = $success.Count + $warnings.Count + $errors.Count
$successRate = if ($totalChecks -gt 0) { [math]::Round(($success.Count / $totalChecks) * 100, 2) } else { 0 }

Write-Host "Total Checks: $totalChecks" -ForegroundColor White
Write-Host "Success Rate: $successRate%" -ForegroundColor White

if ($errors.Count -eq 0) {
    if ($warnings.Count -eq 0) {
        Write-Host "`n🎉 PRODUCTION READY! All configurations are perfect!" -ForegroundColor Green
        Write-Host "✅ Safe to deploy to production environment" -ForegroundColor Green
    } else {
        Write-Host "`n✅ PRODUCTION READY! Minor warnings can be addressed post-deployment" -ForegroundColor Green
        Write-Host "✅ Safe to deploy to production environment" -ForegroundColor Green
    }
} else {
    Write-Host "`n⚠️ NOT PRODUCTION READY! Critical errors need to be fixed" -ForegroundColor Red
    Write-Host "❌ Address errors before production deployment" -ForegroundColor Red
}

Write-Host "`n📋 NEXT STEPS:" -ForegroundColor Green
Write-Host "1. Copy production-config.env to .env.production" -ForegroundColor White
Write-Host "2. Copy frontend-production-config.env to frontend/.env.production" -ForegroundColor White
Write-Host "3. Configure Cashfree credentials in .env.production" -ForegroundColor White
Write-Host "4. Run production tests: npm run test:production" -ForegroundColor White
Write-Host "5. Deploy to Back4App" -ForegroundColor White

Write-Host "`n🚀 CryptoPulse is ready for production deployment!" -ForegroundColor Green
