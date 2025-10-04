// =============================================================================
// CryptoPulse SSL/TLS Manager - Production Ready
// =============================================================================
// Comprehensive SSL/TLS certificate management for CryptoPulse

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const crypto = require('crypto');

const execAsync = promisify(exec);

// Configuration
const config = {
  ssl: {
    // Certificate paths
    certPath: './ssl',
    certFile: 'cert.pem',
    keyFile: 'private-key.pem',
    caFile: 'ca.pem',
    chainFile: 'chain.pem',
    
    // Certificate settings
    keySize: 4096,
    digest: 'sha256',
    validityDays: 365,
    
    // Domains
    domains: [
      'api.cryptopulse.com',
      'app.cryptopulse.com',
      'cloud.cryptopulse.com'
    ],
    
    // Let's Encrypt settings (if using)
    letsEncrypt: {
      enabled: false,
      email: 'admin@cryptopulse.com',
      staging: false,
      renewDays: 30
    },
    
    // Certificate validation
    validation: {
      minValidityDays: 30,
      checkInterval: 86400000, // 24 hours
      autoRenew: true
    },
    
    // Security settings
    security: {
      minTLSVersion: '1.2',
      ciphers: [
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-CHACHA20-POLY1305',
        'ECDHE-RSA-CHACHA20-POLY1305',
        'DHE-RSA-AES128-GCM-SHA256',
        'DHE-RSA-AES256-GCM-SHA384'
      ],
      hsts: {
        enabled: true,
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      }
    }
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, colors.green);
const logError = (message) => log(`❌ ${message}`, colors.red);
const logWarning = (message) => log(`⚠️  ${message}`, colors.yellow);
const logInfo = (message) => log(`ℹ️  ${message}`, colors.blue);

// SSL Manager Class
class SSLManager {
  constructor(options = {}) {
    this.options = { ...config, ...options };
    this.certificates = new Map();
    this.isRunning = false;
  }

  // =========================================================================
  // Initialization Methods
  // =========================================================================

  // Initialize SSL manager
  async initialize() {
    logInfo('Initializing SSL Manager...');
    
    try {
      // Create SSL directory
      await this.createSSLDirectory();
      
      // Load existing certificates
      await this.loadExistingCertificates();
      
      // Validate certificates
      await this.validateCertificates();
      
      // Start monitoring
      await this.startMonitoring();
      
      logSuccess('SSL Manager initialized successfully');
      
    } catch (error) {
      logError(`Failed to initialize SSL Manager: ${error.message}`);
      throw error;
    }
  }

  // Create SSL directory
  async createSSLDirectory() {
    try {
      await fs.mkdir(this.options.ssl.certPath, { recursive: true });
      logSuccess('SSL directory created');
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  // Load existing certificates
  async loadExistingCertificates() {
    logInfo('Loading existing certificates...');
    
    for (const domain of this.options.ssl.domains) {
      try {
        const certPath = path.join(this.options.ssl.certPath, `${domain}.crt`);
        const keyPath = path.join(this.options.ssl.certPath, `${domain}.key`);
        
        const certExists = await this.fileExists(certPath);
        const keyExists = await this.fileExists(keyPath);
        
        if (certExists && keyExists) {
          const certInfo = await this.getCertificateInfo(certPath);
          this.certificates.set(domain, {
            domain,
            certPath,
            keyPath,
            ...certInfo
          });
          logSuccess(`Loaded certificate for ${domain}`);
        } else {
          logWarning(`No certificate found for ${domain}`);
        }
      } catch (error) {
        logWarning(`Failed to load certificate for ${domain}: ${error.message}`);
      }
    }
  }

  // =========================================================================
  // Certificate Generation Methods
  // =========================================================================

  // Generate self-signed certificate
  async generateSelfSignedCertificate(domain, options = {}) {
    logInfo(`Generating self-signed certificate for ${domain}...`);
    
    try {
      const certPath = path.join(this.options.ssl.certPath, `${domain}.crt`);
      const keyPath = path.join(this.options.ssl.certPath, `${domain}.key`);
      
      // Generate private key
      const privateKey = crypto.generateKeyPairSync('rsa', {
        modulusLength: this.options.ssl.keySize,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      // Certificate attributes
      const certOptions = {
        serialNumber: crypto.randomBytes(16).toString('hex'),
        subject: {
          CN: domain,
          O: 'CryptoPulse',
          OU: 'IT Department',
          C: 'US',
          ST: 'California',
          L: 'San Francisco'
        },
        issuer: {
          CN: domain,
          O: 'CryptoPulse',
          OU: 'IT Department',
          C: 'US',
          ST: 'California',
          L: 'San Francisco'
        },
        notBefore: new Date(),
        notAfter: new Date(Date.now() + (this.options.ssl.validityDays * 24 * 60 * 60 * 1000)),
        key: privateKey.privateKey,
        extensions: [
          {
            name: 'basicConstraints',
            cA: false
          },
          {
            name: 'keyUsage',
            keyCertSign: false,
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true
          },
          {
            name: 'extKeyUsage',
            serverAuth: true,
            clientAuth: false
          },
          {
            name: 'subjectAltName',
            altNames: [
              {
                type: 2, // DNS
                value: domain
              }
            ]
          }
        ]
      };
      
      // Generate certificate
      const certificate = crypto.createCertificate(certOptions);
      
      // Save certificate and key
      await fs.writeFile(certPath, certificate.toString());
      await fs.writeFile(keyPath, privateKey.privateKey);
      
      // Update certificates map
      const certInfo = await this.getCertificateInfo(certPath);
      this.certificates.set(domain, {
        domain,
        certPath,
        keyPath,
        type: 'self-signed',
        ...certInfo
      });
      
      logSuccess(`Self-signed certificate generated for ${domain}`);
      return { certPath, keyPath };
      
    } catch (error) {
      logError(`Failed to generate self-signed certificate for ${domain}: ${error.message}`);
      throw error;
    }
  }

  // Generate Let's Encrypt certificate
  async generateLetsEncryptCertificate(domain) {
    if (!this.options.ssl.letsEncrypt.enabled) {
      throw new Error('Let\'s Encrypt is not enabled');
    }
    
    logInfo(`Generating Let's Encrypt certificate for ${domain}...`);
    
    try {
      // Check if certbot is installed
      await this.checkCertbotInstallation();
      
      // Generate certificate
      const command = this.buildCertbotCommand(domain);
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('Congratulations')) {
        throw new Error(`Certbot error: ${stderr}`);
      }
      
      // Update certificates map
      const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
      const keyPath = `/etc/letsencrypt/live/${domain}/privkey.pem`;
      
      const certInfo = await this.getCertificateInfo(certPath);
      this.certificates.set(domain, {
        domain,
        certPath,
        keyPath,
        type: 'lets-encrypt',
        ...certInfo
      });
      
      logSuccess(`Let's Encrypt certificate generated for ${domain}`);
      return { certPath, keyPath };
      
    } catch (error) {
      logError(`Failed to generate Let's Encrypt certificate for ${domain}: ${error.message}`);
      throw error;
    }
  }

  // Check certbot installation
  async checkCertbotInstallation() {
    try {
      await execAsync('certbot --version');
      logSuccess('Certbot is installed');
    } catch (error) {
      logWarning('Certbot not found, installing...');
      await execAsync('apt-get update && apt-get install -y certbot');
      logSuccess('Certbot installed successfully');
    }
  }

  // Build certbot command
  buildCertbotCommand(domain) {
    const baseCommand = 'certbot certonly --standalone --non-interactive --agree-tos';
    const email = `--email ${this.options.ssl.letsEncrypt.email}`;
    const staging = this.options.ssl.letsEncrypt.staging ? '--staging' : '';
    const domainFlag = `-d ${domain}`;
    
    return `${baseCommand} ${email} ${staging} ${domainFlag}`;
  }

  // =========================================================================
  // Certificate Validation Methods
  // =========================================================================

  // Validate certificates
  async validateCertificates() {
    logInfo('Validating certificates...');
    
    for (const [domain, certInfo] of this.certificates) {
      try {
        await this.validateCertificate(domain, certInfo);
      } catch (error) {
        logWarning(`Certificate validation failed for ${domain}: ${error.message}`);
      }
    }
  }

  // Validate individual certificate
  async validateCertificate(domain, certInfo) {
    const now = new Date();
    const validityDays = Math.ceil((certInfo.notAfter - now) / (1000 * 60 * 60 * 24));
    
    if (validityDays < this.options.ssl.validation.minValidityDays) {
      logWarning(`Certificate for ${domain} expires in ${validityDays} days`);
      
      if (this.options.ssl.validation.autoRenew) {
        await this.renewCertificate(domain);
      }
    } else {
      logSuccess(`Certificate for ${domain} is valid for ${validityDays} days`);
    }
  }

  // Get certificate information
  async getCertificateInfo(certPath) {
    try {
      const { stdout } = await execAsync(`openssl x509 -in ${certPath} -text -noout`);
      
      // Parse certificate information
      const info = {
        subject: this.extractField(stdout, 'Subject:'),
        issuer: this.extractField(stdout, 'Issuer:'),
        notBefore: this.extractDate(stdout, 'Not Before:'),
        notAfter: this.extractDate(stdout, 'Not After:'),
        serialNumber: this.extractField(stdout, 'Serial Number:'),
        signatureAlgorithm: this.extractField(stdout, 'Signature Algorithm:')
      };
      
      return info;
    } catch (error) {
      throw new Error(`Failed to get certificate info: ${error.message}`);
    }
  }

  // Extract field from openssl output
  extractField(output, fieldName) {
    const regex = new RegExp(`${fieldName}\\s+(.+)`);
    const match = output.match(regex);
    return match ? match[1].trim() : null;
  }

  // Extract date from openssl output
  extractDate(output, fieldName) {
    const field = this.extractField(output, fieldName);
    if (field) {
      return new Date(field);
    }
    return null;
  }

  // =========================================================================
  // Certificate Renewal Methods
  // =========================================================================

  // Renew certificate
  async renewCertificate(domain) {
    logInfo(`Renewing certificate for ${domain}...`);
    
    try {
      const certInfo = this.certificates.get(domain);
      
      if (!certInfo) {
        throw new Error(`No certificate found for ${domain}`);
      }
      
      if (certInfo.type === 'lets-encrypt') {
        await this.renewLetsEncryptCertificate(domain);
      } else {
        await this.renewSelfSignedCertificate(domain);
      }
      
      logSuccess(`Certificate renewed for ${domain}`);
    } catch (error) {
      logError(`Failed to renew certificate for ${domain}: ${error.message}`);
      throw error;
    }
  }

  // Renew Let's Encrypt certificate
  async renewLetsEncryptCertificate(domain) {
    try {
      const command = `certbot renew --cert-name ${domain} --non-interactive`;
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('Congratulations')) {
        throw new Error(`Certbot renewal error: ${stderr}`);
      }
      
      // Reload Nginx
      await this.reloadNginx();
      
    } catch (error) {
      throw new Error(`Let's Encrypt renewal failed: ${error.message}`);
    }
  }

  // Renew self-signed certificate
  async renewSelfSignedCertificate(domain) {
    try {
      // Generate new certificate
      await this.generateSelfSignedCertificate(domain);
      
      // Reload Nginx
      await this.reloadNginx();
      
    } catch (error) {
      throw new Error(`Self-signed renewal failed: ${error.message}`);
    }
  }

  // =========================================================================
  // Nginx Integration Methods
  // =========================================================================

  // Update Nginx SSL configuration
  async updateNginxSSLConfig() {
    logInfo('Updating Nginx SSL configuration...');
    
    try {
      const sslConfig = this.generateNginxSSLConfig();
      const configPath = path.join(this.options.ssl.certPath, 'nginx-ssl.conf');
      
      await fs.writeFile(configPath, sslConfig);
      
      // Reload Nginx
      await this.reloadNginx();
      
      logSuccess('Nginx SSL configuration updated');
    } catch (error) {
      logError(`Failed to update Nginx SSL configuration: ${error.message}`);
      throw error;
    }
  }

  // Generate Nginx SSL configuration
  generateNginxSSLConfig() {
    let config = '';
    
    // SSL protocols and ciphers
    config += `ssl_protocols TLSv1.2 TLSv1.3;\n`;
    config += `ssl_ciphers ${this.options.ssl.security.ciphers.join(':')};\n`;
    config += `ssl_prefer_server_ciphers off;\n`;
    config += `ssl_session_cache shared:SSL:10m;\n`;
    config += `ssl_session_timeout 10m;\n`;
    config += `ssl_session_tickets off;\n\n`;
    
    // HSTS
    if (this.options.ssl.security.hsts.enabled) {
      const hsts = this.options.ssl.security.hsts;
      config += `add_header Strict-Transport-Security "max-age=${hsts.maxAge}`;
      if (hsts.includeSubDomains) config += '; includeSubDomains';
      if (hsts.preload) config += '; preload';
      config += `" always;\n`;
    }
    
    // OCSP Stapling
    config += `ssl_stapling on;\n`;
    config += `ssl_stapling_verify on;\n`;
    config += `ssl_trusted_certificate ${path.join(this.options.ssl.certPath, this.options.ssl.caFile)};\n`;
    config += `resolver 8.8.8.8 8.8.4.4 valid=300s;\n`;
    config += `resolver_timeout 5s;\n\n`;
    
    // Server blocks for each domain
    for (const [domain, certInfo] of this.certificates) {
      config += `server {\n`;
      config += `    listen 443 ssl http2;\n`;
      config += `    server_name ${domain};\n\n`;
      config += `    ssl_certificate ${certInfo.certPath};\n`;
      config += `    ssl_certificate_key ${certInfo.keyPath};\n\n`;
      config += `    # SSL configuration\n`;
      config += `    include /etc/nginx/ssl/nginx-ssl.conf;\n\n`;
      config += `    # Your server configuration here\n`;
      config += `}\n\n`;
    }
    
    return config;
  }

  // Reload Nginx
  async reloadNginx() {
    try {
      await execAsync('nginx -s reload');
      logSuccess('Nginx reloaded successfully');
    } catch (error) {
      logError(`Failed to reload Nginx: ${error.message}`);
      throw error;
    }
  }

  // =========================================================================
  // Monitoring Methods
  // =========================================================================

  // Start monitoring
  async startMonitoring() {
    logInfo('Starting SSL certificate monitoring...');
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkCertificates();
    }, this.options.ssl.validation.checkInterval);
    
    this.isRunning = true;
    logSuccess('SSL certificate monitoring started');
  }

  // Check certificates
  async checkCertificates() {
    logInfo('Checking certificate validity...');
    
    for (const [domain, certInfo] of this.certificates) {
      try {
        await this.validateCertificate(domain, certInfo);
      } catch (error) {
        logWarning(`Certificate check failed for ${domain}: ${error.message}`);
      }
    }
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.isRunning = false;
    logSuccess('SSL certificate monitoring stopped');
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  // Check if file exists
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Get certificate status
  getStatus() {
    const status = {
      running: this.isRunning,
      certificates: {}
    };
    
    for (const [domain, certInfo] of this.certificates) {
      const now = new Date();
      const validityDays = Math.ceil((certInfo.notAfter - now) / (1000 * 60 * 60 * 24));
      
      status.certificates[domain] = {
        domain: certInfo.domain,
        type: certInfo.type,
        valid: validityDays > 0,
        validityDays,
        notBefore: certInfo.notBefore,
        notAfter: certInfo.notAfter,
        subject: certInfo.subject,
        issuer: certInfo.issuer
      };
    }
    
    return status;
  }

  // Generate certificate for domain
  async generateCertificate(domain, type = 'self-signed') {
    if (type === 'lets-encrypt') {
      return await this.generateLetsEncryptCertificate(domain);
    } else {
      return await this.generateSelfSignedCertificate(domain);
    }
  }

  // Cleanup
  cleanup() {
    this.stopMonitoring();
    logInfo('SSL Manager cleanup completed');
  }
}

// CLI Interface
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  const domain = args[1];
  const type = args[2] || 'self-signed';
  
  const sslManager = new SSLManager();
  
  try {
    await sslManager.initialize();
    
    switch (command) {
      case 'generate':
        if (!domain) {
          throw new Error('Domain is required for generate command');
        }
        await sslManager.generateCertificate(domain, type);
        break;
      case 'renew':
        if (!domain) {
          throw new Error('Domain is required for renew command');
        }
        await sslManager.renewCertificate(domain);
        break;
      case 'validate':
        await sslManager.validateCertificates();
        break;
      case 'status':
        const status = sslManager.getStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
      case 'update-nginx':
        await sslManager.updateNginxSSLConfig();
        break;
      default:
        console.log('Usage: node scripts/ssl-manager.js <generate|renew|validate|status|update-nginx> [domain] [type]');
        process.exit(1);
    }
  } catch (error) {
    logError(`Command failed: ${error.message}`);
    process.exit(1);
  }
};

// Export for use as module
module.exports = {
  SSLManager,
  config
};

// Run if called directly
if (require.main === module) {
  main();
}
