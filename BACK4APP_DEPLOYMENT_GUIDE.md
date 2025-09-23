# 🚀 Back4App Deployment Guide

## 📋 **CryptoPulse Trading Bot - Back4App Deployment**

This guide provides complete instructions for deploying your CryptoPulse Trading Bot to Back4App.

## 🎯 **Back4App Setup**

### **1. Create Back4App Account**
1. Go to [Back4App.com](https://www.back4app.com)
2. Sign up for a free account
3. Create a new Parse app named "CryptoPulse"

### **2. Get Your App Credentials**
From your Back4App dashboard, copy:
- **Application ID** (App ID)
- **JavaScript Key** (Client Key)
- **Master Key** (Server Key)
- **Server URL** (Parse Server URL)

## 🔧 **Environment Configuration**

### **Frontend Environment Variables**
Create `frontend/.env`:
```env
REACT_APP_APP_ID=your-back4app-app-id
REACT_APP_JAVASCRIPT_KEY=your-back4app-javascript-key
REACT_APP_SERVER_URL=https://parseapi.back4app.com/parse
REACT_APP_MASTER_KEY=your-back4app-master-key
```

### **Backend Environment Variables**
Create `backend/.env`:
```env
APP_ID=your-back4app-app-id
JAVASCRIPT_KEY=your-back4app-javascript-key
MASTER_KEY=your-back4app-master-key
SERVER_URL=https://parseapi.back4app.com/parse
```

## 🚀 **Deployment Steps**

### **Step 1: Deploy Cloud Functions**
1. **Upload Cloud Code**:
   - Go to Back4App Dashboard → Cloud Code
   - Upload `cloud/main.js` file
   - Deploy the cloud functions

2. **Configure Cloud Functions**:
   ```javascript
   // Functions available:
   // - tradingBot
   // - marketAnalysis
   // - userAuthentication
   // - portfolioManagement
   // - riskAssessment
   ```

### **Step 2: Deploy Frontend**
1. **Build Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Deploy to Back4App Web Hosting**:
   - Go to Back4App Dashboard → Web Hosting
   - Upload the `frontend/dist` folder contents
   - Set `index.html` as the main file

### **Step 3: Configure Database**
1. **Create Parse Classes**:
   - User (default)
   - TradingBot
   - Portfolio
   - Transaction
   - MarketData
   - TradingSignal

2. **Set Up Indexes**:
   ```javascript
   // Recommended indexes:
   // - Portfolio: userId
   // - Transaction: userId, createdAt
   // - MarketData: pair, timestamp
   // - TradingSignal: pair, timestamp
   ```

### **Step 4: Configure Security**
1. **Parse Security**:
   - Enable Class-Level Permissions
   - Set up Row-Level Security
   - Configure API Rate Limiting

2. **CORS Configuration**:
   ```javascript
   // Allow your domain
   "cors": {
     "origin": ["https://your-domain.com"],
     "credentials": true
   }
   ```

## 📊 **Database Schema**

### **User Class (Default)**
```javascript
{
  username: String,
  email: String,
  password: String,
  tradingPreferences: Object,
  portfolioId: String,
  createdAt: Date,
  updatedAt: Date
}
```

### **TradingBot Class**
```javascript
{
  userId: Pointer<User>,
  name: String,
  strategy: String,
  isActive: Boolean,
  settings: Object,
  performance: Object,
  createdAt: Date
}
```

### **Portfolio Class**
```javascript
{
  userId: Pointer<User>,
  name: String,
  balance: Number,
  assets: Array,
  totalValue: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### **Transaction Class**
```javascript
{
  userId: Pointer<User>,
  portfolioId: Pointer<Portfolio>,
  type: String, // 'buy' or 'sell'
  pair: String,
  amount: Number,
  price: Number,
  total: Number,
  status: String,
  createdAt: Date
}
```

### **MarketData Class**
```javascript
{
  pair: String,
  timestamp: Date,
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number,
  indicators: Object
}
```

### **TradingSignal Class**
```javascript
{
  pair: String,
  signal: String, // 'buy', 'sell', 'hold'
  confidence: Number,
  price: Number,
  timestamp: Date,
  indicators: Object
}
```

## 🔒 **Security Configuration**

### **Parse Security Rules**
```javascript
// Portfolio Class
{
  "find": {
    "requiresAuthentication": true,
    "where": {
      "userId": "$currentUser"
    }
  },
  "create": {
    "requiresAuthentication": true,
    "where": {
      "userId": "$currentUser"
    }
  }
}

// TradingBot Class
{
  "find": {
    "requiresAuthentication": true,
    "where": {
      "userId": "$currentUser"
    }
  }
}
```

### **API Rate Limiting**
```javascript
// Back4App Dashboard → App Settings → Rate Limiting
{
  "requests": 1000,
  "window": 3600, // 1 hour
  "burst": 100
}
```

## 📱 **Frontend Integration**

### **Parse SDK Initialization**
```typescript
// Already configured in frontend/src/lib/parse.ts
import { initializeParse, ParseUser, ParseCloud } from './lib/parse';

// Initialize Parse
initializeParse();

// Use Parse functions
const user = await ParseUser.logIn(email, password);
const result = await ParseCloud.run('tradingBot', params);
```

### **Authentication Flow**
```typescript
// Login
const user = await ParseUser.logIn(email, password);

// Register
const user = await ParseUser.signUp(username, password, email);

// Logout
await ParseUser.logOut();

// Check current user
const currentUser = ParseUser.current();
```

## 🚀 **Production Deployment**

### **1. Build for Production**
```bash
# Frontend
cd frontend
npm run build

# Backend (if needed)
cd backend
npm install --production
```

### **2. Deploy to Back4App**
1. **Cloud Code**: Upload `cloud/main.js`
2. **Web Hosting**: Upload `frontend/dist` contents
3. **Database**: Configure Parse classes and security
4. **Environment**: Set production environment variables

### **3. Configure Custom Domain**
1. Go to Back4App Dashboard → Web Hosting
2. Add your custom domain
3. Configure DNS settings
4. Enable SSL certificate

## 📊 **Monitoring & Analytics**

### **Back4App Analytics**
- **User Analytics**: Track user engagement
- **Performance Metrics**: Monitor app performance
- **Error Tracking**: Debug issues
- **Usage Statistics**: API usage and limits

### **Parse Dashboard**
- **Database Browser**: View and edit data
- **Cloud Code Logs**: Monitor cloud functions
- **API Usage**: Track API calls
- **Push Notifications**: Send notifications

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Cloud Functions Not Working**
```bash
# Check cloud function logs
# Back4App Dashboard → Cloud Code → Logs
```

#### **Database Connection Issues**
```bash
# Verify Parse configuration
# Check App ID and Master Key
```

#### **Frontend Build Issues**
```bash
# Check environment variables
# Verify Back4App credentials
```

### **Debug Commands**
```bash
# Test Parse connection
curl -X POST https://parseapi.back4app.com/parse/functions/test \
  -H "X-Parse-Application-Id: YOUR_APP_ID" \
  -H "X-Parse-Client-Key: YOUR_CLIENT_KEY"
```

## 🎯 **Next Steps**

1. **Deploy to Back4App** - Follow the deployment steps
2. **Test thoroughly** - Verify all features work
3. **Configure monitoring** - Set up analytics
4. **Scale as needed** - Upgrade Back4App plan
5. **Custom domain** - Configure your domain

## 🚀 **Ready for Back4App!**

Your CryptoPulse Trading Bot is now fully configured for Back4App deployment with:
- ✅ **Parse Server** - Backend API and database
- ✅ **Cloud Functions** - Server-side logic
- ✅ **Web Hosting** - Frontend deployment
- ✅ **Security** - Authentication and authorization
- ✅ **Scalability** - Ready for production traffic

**Happy Trading! 🎉**