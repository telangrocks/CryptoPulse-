# 🚀 Vercel Deployment Instructions

## Method 1: Vercel Web Interface (Recommended)

### Step 1: Prepare Files
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub, GitLab, or Bitbucket
3. Click "New Project"

### Step 2: Upload Files
1. **Option A: Drag & Drop**
   - Zip the `frontend/dist` folder
   - Drag and drop the zip file to Vercel

2. **Option B: GitHub Integration**
   - Push this project to GitHub
   - Connect Vercel to your GitHub repository
   - Set build command: `cd frontend && npm run build`
   - Set output directory: `frontend/dist`

### Step 3: Configure Project
- **Project Name**: `cryptopulse-trading-bot`
- **Framework**: `Other` or `Static`
- **Root Directory**: `frontend/dist`
- **Build Command**: (leave empty for static)
- **Output Directory**: (leave empty)

### Step 4: Deploy
- Click "Deploy"
- Wait for deployment to complete
- Get your test URL: `https://cryptopulse-trading-bot.vercel.app`

---

## Method 2: Vercel CLI (If you want to try)

### Step 1: Install Vercel CLI
```bash
npm install vercel --save-dev
```

### Step 2: Login to Vercel
```bash
npx vercel login
```

### Step 3: Deploy
```bash
npx vercel --prod
```

---

## Method 3: Netlify (Alternative)

### Step 1: Go to Netlify
1. Visit [netlify.com](https://netlify.com)
2. Sign up/Login
3. Click "Add new site" → "Deploy manually"

### Step 2: Upload
1. Zip the `frontend/dist` folder
2. Drag and drop to Netlify
3. Get URL: `https://random-name.netlify.app`

---

## 🎯 Recommended: Vercel Web Interface

The web interface is the easiest way to get started. Just follow Method 1 above!
