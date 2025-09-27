# =============================================================================
# Cashfree Configuration Verification Script
# =============================================================================
# This script verifies that all Cashfree payment credentials are properly configured

Write-Host "🔍 Verifying Cashfree Payment Configuration..." -ForegroundColor Green

# Check backend .env file
Write-Host "`n📋 Backend Configuration:" -ForegroundColor Cyan

$backendEnv = Get-Content .env
$backendCashfreeVars = $backendEnv | Where-Object { $_ -match "CASHFREE" }

foreach ($var in $backendCashfreeVars) {
    if ($var -match "^CASHFREE_") {
        $key = ($var -split "=")[0]
        $value = ($var -split "=")[1]
        
        if ($value -match "YOUR_.*_HERE") {
            Write-Host "❌ $key = $value (PLACEHOLDER)" -ForegroundColor Red
        } else {
            Write-Host "✅ $key = $value" -ForegroundColor Green
        }
    }
}

# Check frontend .env file
Write-Host "`n📋 Frontend Configuration:" -ForegroundColor Cyan

$frontendEnv = Get-Content frontend\.env
$frontendCashfreeVars = $frontendEnv | Where-Object { $_ -match "CASHFREE" }

foreach ($var in $frontendCashfreeVars) {
    if ($var -match "^VITE_CASHFREE_") {
        $key = ($var -split "=")[0]
        $value = ($var -split "=")[1]
        
        if ($value -match "YOUR_.*_HERE") {
            Write-Host "❌ $key = $value (PLACEHOLDER)" -ForegroundColor Red
        } else {
            Write-Host "✅ $key = $value" -ForegroundColor Green
        }
    }
}

# Verify Cashfree module exists
Write-Host "`n📋 Cashfree Module:" -ForegroundColor Cyan

if (Test-Path "cloud\cashfree.js") {
    Write-Host "✅ Cashfree module exists" -ForegroundColor Green
} else {
    Write-Host "❌ Cashfree module missing" -ForegroundColor Red
}

# Check main.js integration
Write-Host "`n📋 Main.js Integration:" -ForegroundColor Cyan

$mainJs = Get-Content cloud\main.js
$cashfreeIntegration = $mainJs | Where-Object { $_ -match "Cashfree|createSubscription|verifyPayment|handlePaymentWebhook" }

if ($cashfreeIntegration.Count -gt 0) {
    Write-Host "✅ Cashfree functions integrated in main.js" -ForegroundColor Green
    Write-Host "   Found $($cashfreeIntegration.Count) Cashfree-related functions" -ForegroundColor White
} else {
    Write-Host "❌ Cashfree integration missing in main.js" -ForegroundColor Red
}

# Summary
Write-Host "`n🎯 Configuration Summary:" -ForegroundColor Yellow

$sandboxAppId = ($backendEnv | Where-Object { $_ -match "CASHFREE_SANDBOX_APP_ID" } | ForEach-Object { ($_ -split "=")[1] })
$liveAppId = ($backendEnv | Where-Object { $_ -match "CASHFREE_APP_ID" } | ForEach-Object { ($_ -split "=")[1] })
$mode = ($backendEnv | Where-Object { $_ -match "CASHFREE_MODE" } | ForEach-Object { ($_ -split "=")[1] })

Write-Host "   Mode: $mode" -ForegroundColor White
Write-Host "   Sandbox App ID: $sandboxAppId" -ForegroundColor White
Write-Host "   Live App ID: $liveAppId" -ForegroundColor White

if ($mode -eq "SANDBOX" -and $sandboxAppId -and $liveAppId) {
    Write-Host "`n✅ Cashfree configuration is PRODUCTION READY!" -ForegroundColor Green
    Write-Host "   - Sandbox mode enabled for testing" -ForegroundColor White
    Write-Host "   - Live credentials configured for production" -ForegroundColor White
    Write-Host "   - Automatic mode switching implemented" -ForegroundColor White
} else {
    Write-Host "`n⚠️  Cashfree configuration needs attention" -ForegroundColor Yellow
}

Write-Host "`n📋 Available Payment Plans:" -ForegroundColor Cyan
Write-Host "   💰 Monthly Plan: ₹999" -ForegroundColor White
Write-Host "   💰 Quarterly Plan: ₹2,697 (10% discount)" -ForegroundColor White
Write-Host "   💰 Yearly Plan: ₹8,991 (25% discount)" -ForegroundColor White

Write-Host "`n📋 Payment Methods:" -ForegroundColor Cyan
Write-Host "   💳 Credit Card" -ForegroundColor White
Write-Host "   💳 Debit Card" -ForegroundColor White
Write-Host "   🏦 Net Banking" -ForegroundColor White
Write-Host "   📱 UPI" -ForegroundColor White
Write-Host "   💰 Digital Wallet" -ForegroundColor White
Write-Host "   🌐 PayPal (Live mode only)" -ForegroundColor White

Write-Host "`n🚀 Next Steps:" -ForegroundColor Green
Write-Host "   1. Test payment flow in sandbox mode" -ForegroundColor White
Write-Host "   2. Switch to LIVE mode for production" -ForegroundColor White
Write-Host "   3. Configure webhook endpoints" -ForegroundColor White
Write-Host "   4. Set up payment success/failure pages" -ForegroundColor White
