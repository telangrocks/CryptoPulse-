// =============================================================================
// Performance Monitoring Script - Production Ready
// =============================================================================
// Comprehensive performance monitoring and optimization recommendations

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { execSync } = require('child_process');

// Performance monitoring configuration
const CONFIG = {
  // Performance thresholds
  thresholds: {
    responseTime: 1000, // 1 second
    memoryUsage: 80, // 80% of available memory
    cpuUsage: 70, // 70% CPU usage
    bundleSize: 500000, // 500KB
    loadTime: 3000 // 3 seconds
  },
  
  // Monitoring intervals
  intervals: {
    memory: 5000, // 5 seconds
    cpu: 10000, // 10 seconds
    response: 1000 // 1 second
  },
  
  // File patterns to monitor
  filePatterns: [
    '**/*.js',
    '**/*.ts',
    '**/*.tsx',
    '**/*.json'
  ],
  
  // Directories to exclude
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '.git/**'
  ]
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Performance metrics storage
const metrics = {
  memory: [],
  cpu: [],
  response: [],
  bundle: null,
  files: []
};

// Memory monitoring
function monitorMemory() {
  const memUsage = process.memoryUsage();
  const totalMem = require('os').totalmem();
  const freeMem = require('os').freemem();
  const usedMem = totalMem - freeMem;
  const memPercentage = (usedMem / totalMem) * 100;
  
  const memData = {
    timestamp: Date.now(),
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    external: memUsage.external,
    rss: memUsage.rss,
    percentage: memPercentage
  };
  
  metrics.memory.push(memData);
  
  // Keep only last 100 measurements
  if (metrics.memory.length > 100) {
    metrics.memory.shift();
  }
  
  if (memPercentage > CONFIG.thresholds.memoryUsage) {
    log(`⚠️  High memory usage: ${memPercentage.toFixed(2)}%`, 'yellow');
  }
  
  return memData;
}

// CPU monitoring
function monitorCPU() {
  const cpus = require('os').cpus();
  const loadAvg = require('os').loadavg();
  
  const cpuData = {
    timestamp: Date.now(),
    loadAverage: loadAvg,
    cpuCount: cpus.length,
    cpuUsage: loadAvg[0] / cpus.length * 100
  };
  
  metrics.cpu.push(cpuData);
  
  // Keep only last 50 measurements
  if (metrics.cpu.length > 50) {
    metrics.cpu.shift();
  }
  
  if (cpuData.cpuUsage > CONFIG.thresholds.cpuUsage) {
    log(`⚠️  High CPU usage: ${cpuData.cpuUsage.toFixed(2)}%`, 'yellow');
  }
  
  return cpuData;
}

// Bundle size analysis
function analyzeBundleSize() {
  const buildDirs = ['dist', 'build'];
  let totalSize = 0;
  let fileCount = 0;
  const largeFiles = [];
  
  buildDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = getAllFiles(dir);
      
      files.forEach(file => {
        const stats = fs.statSync(file);
        const size = stats.size;
        totalSize += size;
        fileCount++;
        
        if (size > CONFIG.thresholds.bundleSize) {
          largeFiles.push({
            file: file,
            size: size,
            sizeKB: (size / 1024).toFixed(2)
          });
        }
      });
    }
  });
  
  const bundleData = {
    totalSize: totalSize,
    totalSizeKB: (totalSize / 1024).toFixed(2),
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    fileCount: fileCount,
    largeFiles: largeFiles
  };
  
  metrics.bundle = bundleData;
  
  if (totalSize > CONFIG.thresholds.bundleSize) {
    log(`⚠️  Large bundle size: ${bundleData.totalSizeMB}MB`, 'yellow');
  }
  
  return bundleData;
}

// File size analysis
function analyzeFileSizes() {
  const files = getAllFiles('.');
  const fileSizes = [];
  
  files.forEach(file => {
    try {
      const stats = fs.statSync(file);
      const size = stats.size;
      
      if (size > 10000) { // Files larger than 10KB
        fileSizes.push({
          file: file,
          size: size,
          sizeKB: (size / 1024).toFixed(2)
        });
      }
    } catch (error) {
      // Skip files that can't be read
    }
  });
  
  // Sort by size (largest first)
  fileSizes.sort((a, b) => b.size - a.size);
  
  metrics.files = fileSizes.slice(0, 20); // Top 20 largest files
  
  return fileSizes;
}

// Get all files recursively
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip excluded directories
      const shouldExclude = CONFIG.excludePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(filePath);
      });
      
      if (!shouldExclude) {
        getAllFiles(filePath, fileList);
      }
    } else {
      // Check if file matches patterns
      const shouldInclude = CONFIG.filePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(filePath);
      });
      
      if (shouldInclude) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Performance recommendations
function generateRecommendations() {
  const recommendations = [];
  
  // Memory recommendations
  const avgMemory = metrics.memory.length > 0 
    ? metrics.memory.reduce((sum, m) => sum + m.percentage, 0) / metrics.memory.length
    : 0;
  
  if (avgMemory > CONFIG.thresholds.memoryUsage) {
    recommendations.push({
      type: 'memory',
      priority: 'high',
      title: 'High Memory Usage',
      description: `Average memory usage is ${avgMemory.toFixed(2)}%`,
      recommendations: [
        'Implement memory optimization techniques',
        'Add garbage collection monitoring',
        'Review memory leaks in code',
        'Consider increasing heap size'
      ]
    });
  }
  
  // CPU recommendations
  const avgCPU = metrics.cpu.length > 0
    ? metrics.cpu.reduce((sum, c) => sum + c.cpuUsage, 0) / metrics.cpu.length
    : 0;
  
  if (avgCPU > CONFIG.thresholds.cpuUsage) {
    recommendations.push({
      type: 'cpu',
      priority: 'high',
      title: 'High CPU Usage',
      description: `Average CPU usage is ${avgCPU.toFixed(2)}%`,
      recommendations: [
        'Optimize CPU-intensive operations',
        'Implement caching strategies',
        'Review algorithm efficiency',
        'Consider horizontal scaling'
      ]
    });
  }
  
  // Bundle size recommendations
  if (metrics.bundle && metrics.bundle.totalSize > CONFIG.thresholds.bundleSize) {
    recommendations.push({
      type: 'bundle',
      priority: 'medium',
      title: 'Large Bundle Size',
      description: `Bundle size is ${metrics.bundle.totalSizeMB}MB`,
      recommendations: [
        'Implement code splitting',
        'Remove unused dependencies',
        'Optimize images and assets',
        'Use tree shaking',
        'Consider lazy loading'
      ]
    });
  }
  
  // File size recommendations
  const largeFiles = metrics.files.filter(f => f.size > 50000); // Files > 50KB
  if (largeFiles.length > 0) {
    recommendations.push({
      type: 'files',
      priority: 'medium',
      title: 'Large Files Detected',
      description: `${largeFiles.length} files are larger than 50KB`,
      recommendations: [
        'Split large files into smaller modules',
        'Remove unused code',
        'Optimize file structure',
        'Consider file compression'
      ]
    });
  }
  
  return recommendations;
}

// Generate performance report
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    metrics: {
      memory: metrics.memory[metrics.memory.length - 1] || null,
      cpu: metrics.cpu[metrics.cpu.length - 1] || null,
      bundle: metrics.bundle,
      files: metrics.files.slice(0, 10) // Top 10 largest files
    },
    recommendations: generateRecommendations(),
    summary: {
      totalFiles: metrics.files.length,
      totalBundleSize: metrics.bundle ? metrics.bundle.totalSizeMB : 0,
      avgMemoryUsage: metrics.memory.length > 0 
        ? (metrics.memory.reduce((sum, m) => sum + m.percentage, 0) / metrics.memory.length).toFixed(2)
        : 0,
      avgCPUUsage: metrics.cpu.length > 0
        ? (metrics.cpu.reduce((sum, c) => sum + c.cpuUsage, 0) / metrics.cpu.length).toFixed(2)
        : 0
    }
  };
  
  // Save report to file
  fs.writeFileSync('performance-report.json', JSON.stringify(report, null, 2));
  
  return report;
}

// Main monitoring function
function startMonitoring() {
  log('🚀 Starting performance monitoring...', 'cyan');
  
  // Initial analysis
  log('📊 Analyzing current performance...', 'blue');
  analyzeBundleSize();
  analyzeFileSizes();
  
  // Start monitoring intervals
  const memoryInterval = setInterval(monitorMemory, CONFIG.intervals.memory);
  const cpuInterval = setInterval(monitorCPU, CONFIG.intervals.cpu);
  
  // Monitor for 60 seconds
  setTimeout(() => {
    clearInterval(memoryInterval);
    clearInterval(cpuInterval);
    
    log('📈 Generating performance report...', 'blue');
    const report = generateReport();
    
    // Display summary
    log('\n📊 Performance Summary:', 'cyan');
    log(`  Memory Usage: ${report.summary.avgMemoryUsage}%`, 'blue');
    log(`  CPU Usage: ${report.summary.avgCPUUsage}%`, 'blue');
    log(`  Bundle Size: ${report.summary.totalBundleSize}MB`, 'blue');
    log(`  Total Files: ${report.summary.totalFiles}`, 'blue');
    
    // Display recommendations
    if (report.recommendations.length > 0) {
      log('\n💡 Recommendations:', 'yellow');
      report.recommendations.forEach(rec => {
        log(`  ${rec.priority.toUpperCase()}: ${rec.title}`, rec.priority === 'high' ? 'red' : 'yellow');
        log(`    ${rec.description}`, 'blue');
        rec.recommendations.forEach(rec => {
          log(`    - ${rec}`, 'blue');
        });
      });
    } else {
      log('✅ No performance issues detected', 'green');
    }
    
    log('\n📄 Detailed report saved to performance-report.json', 'green');
    log('🎉 Performance monitoring completed!', 'green');
    
  }, 60000); // 60 seconds
}

// Run performance monitoring
if (require.main === module) {
  startMonitoring();
}

module.exports = {
  startMonitoring,
  monitorMemory,
  monitorCPU,
  analyzeBundleSize,
  analyzeFileSizes,
  generateRecommendations,
  generateReport,
  CONFIG
};
