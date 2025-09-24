# CryptoPulse SSL Setup Script for Windows
# This script handles SSL certificate generation and configuration on Windows

param(
    [string]$DomainName = "localhost",
    [string]$Email = "admin@localhost"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

Write-Host "🔒 CryptoPulse SSL Setup for Windows" -ForegroundColor $Blue
Write-Host "====================================" -ForegroundColor $Blue

# Check if OpenSSL is available
if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ OpenSSL is not installed. Please install OpenSSL first." -ForegroundColor $Red
    Write-Host "   Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor $Yellow
    exit 1
}

# Create SSL directory
if (-not (Test-Path "ssl")) {
    New-Item -ItemType Directory -Path "ssl" | Out-Null
    Write-Host "📁 Created SSL directory" -ForegroundColor $Green
}

# Generate self-signed certificates
Write-Host "🔐 Generating self-signed SSL certificates..." -ForegroundColor $Blue

# Generate private key
openssl genrsa -out "ssl\key.pem" 2048

# Generate certificate signing request
openssl req -new -key "ssl\key.pem" -out "ssl\cert.csr" -subj "/C=US/ST=State/L=City/O=Organization/CN=$DomainName"

# Generate self-signed certificate
openssl x509 -req -days 365 -in "ssl\cert.csr" -signkey "ssl\key.pem" -out "ssl\cert.pem"

# Create fullchain.pem (same as cert.pem for self-signed)
Copy-Item "ssl\cert.pem" "ssl\fullchain.pem"

# Clean up CSR
Remove-Item "ssl\cert.csr"

Write-Host "✅ Self-signed certificates generated" -ForegroundColor $Green

# Validate certificates
Write-Host "🔍 Validating SSL configuration..." -ForegroundColor $Blue

if (Test-Path "ssl\cert.pem" -and Test-Path "ssl\key.pem") {
    Write-Host "✅ SSL certificates are valid" -ForegroundColor $Green
    
    # Check certificate expiration
    $expiryDate = openssl x509 -in "ssl\cert.pem" -noout -enddate | ForEach-Object { $_.Split('=')[1] }
    Write-Host "📅 Certificate expires: $expiryDate" -ForegroundColor $Blue
} else {
    Write-Host "❌ SSL certificate validation failed" -ForegroundColor $Red
    exit 1
}

Write-Host "🎉 SSL setup completed successfully!" -ForegroundColor $Green
Write-Host "====================================" -ForegroundColor $Blue
Write-Host "📋 Next steps:" -ForegroundColor $Blue
Write-Host "1. Run: docker-compose up -d" -ForegroundColor $Yellow
Write-Host "2. Test SSL: https://$DomainName" -ForegroundColor $Yellow
Write-Host "3. Note: Self-signed certificates will show security warnings" -ForegroundColor $Yellow
