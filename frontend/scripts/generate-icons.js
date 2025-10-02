#!/usr/bin/env node

/**
 * Icon Generation Script for CryptoPulse PWA
 * 
 * This script generates all required icon sizes from the source SVG
 * Requires: sharp package (npm install sharp)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Error: sharp package not found');
  console.log('📦 Installing sharp package...');
  require('child_process').execSync('npm install --save-dev sharp', { stdio: 'inherit' });
  sharp = require('sharp');
}

const inputSvg = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public/');

// Icon sizes required by manifest.json
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('🎨 CryptoPulse Icon Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if input SVG exists
  if (!fs.existsSync(inputSvg)) {
    console.error('❌ Error: icon.svg not found at', inputSvg);
    console.log('💡 Please create an icon.svg file in frontend/public/');
    process.exit(1);
  }

  console.log('📂 Input:', inputSvg);
  console.log('📂 Output:', outputDir);
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  // Generate PNG icons
  for (const size of sizes) {
    try {
      const outputFile = path.join(outputDir, `icon-${size}.png`);
      
      await sharp(inputSvg)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
        })
        .png({
          quality: 100,
          compressionLevel: 9
        })
        .toFile(outputFile);
      
      const stats = fs.statSync(outputFile);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`✅ icon-${size}.png (${sizeKB} KB)`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to generate icon-${size}.png:`, error.message);
      errorCount++;
    }
  }

  // Generate favicon.ico (using 32x32 PNG)
  try {
    const faviconFile = path.join(outputDir, 'favicon.ico');
    
    await sharp(inputSvg)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 15, g: 23, b: 42, alpha: 1 }
      })
      .png({
        quality: 100
      })
      .toFile(faviconFile);
    
    const stats = fs.statSync(faviconFile);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`✅ favicon.ico (${sizeKB} KB)`);
    successCount++;
  } catch (error) {
    console.error('❌ Failed to generate favicon.ico:', error.message);
    errorCount++;
  }

  // Generate apple-touch-icon
  try {
    const appleIconFile = path.join(outputDir, 'apple-touch-icon.png');
    
    await sharp(inputSvg)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 15, g: 23, b: 42, alpha: 1 }
      })
      .png({
        quality: 100
      })
      .toFile(appleIconFile);
    
    const stats = fs.statSync(appleIconFile);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`✅ apple-touch-icon.png (${sizeKB} KB)`);
    successCount++;
  } catch (error) {
    console.error('❌ Failed to generate apple-touch-icon.png:', error.message);
    errorCount++;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Generated: ${successCount} files`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount} files`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (errorCount === 0) {
    console.log('🎉 All icons generated successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Generate screenshots (see ICON_GENERATION_GUIDE.md)');
    console.log('2. Run: npm run build');
    console.log('3. Test PWA installation');
    console.log('');
  } else {
    console.log('⚠️  Some icons failed to generate. Please check the errors above.');
    process.exit(1);
  }
}

// Run the generator
generateIcons().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

