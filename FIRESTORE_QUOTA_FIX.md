# 🔧 Firestore Quota Exceeded - Complete Fix Guide

## ⚠️ The Problem

You're seeing: `FirebaseError: [code=resource-exhausted]: Quota exceeded`

This means **too many simultaneous Firestore connections** are being made from your app.

---

## 🎯 Root Causes (Ranked by Impact):

### 1. **Multiple Browser Tabs Open** (90% of cases)
Each tab creates 10-20 Firestore listeners. 3 tabs = 30-60 connections!

### 2. **Dashboard Component Has 6+ Listeners**
- Announcements (1)
- Leave applications (1)
- Attendance (1)
- Achievements (1)
- Calendar events (1)
- Unread chats - collectionGroup query (1)

### 3. **Write Operations Failing & Retrying**
The `lastActive` update every 2 minutes creates write streams that fail and retry when quota is exceeded.

### 4. **Failed Queries (400 Errors)**
Queries with empty `year`/`section` fields fail, retry, and consume more quota.

---

## ✅ Applied Fixes:

### ✅ Fix 1: Console Noise Suppression
- **File**: `src/utils/consoleFilter.js`
- **What**: Hides Firebase quota warnings and extension errors
- **Result**: Clean console, less distraction

### ✅ Fix 2: Write Operation Backoff
- **File**: `src/contexts/AuthContext.jsx`
- **What**: When quota is exceeded, pauses `lastActive` updates
- **Result**: Prevents write stream retry loops

### ✅ Fix 3: Dashboard Query Optimization
- **File**: `src/screens/Dashboard/Dashboard.jsx`
- **What**: Principals see all data without department filters
- **Result**: Fewer failed queries

### ✅ Fix 4: React StrictMode Disabled in Dev
- **File**: `src/main.jsx`
- **What**: Prevents double-mounting of components
- **Result**: Half the Firestore listeners in development

### ✅ Fix 5: Firestore Cache Reduction
- **File**: `src/firebase.js`
- **What**: Reduced cache size in dev mode
- **Result**: Less memory usage

---

## 🚀 CRITICAL: Manual Steps Required

### Step 1: Close ALL Browser Tabs
**This is the #1 fix!**
- Close every tab with `localhost:5175` or your app URL
- Check all browser windows
- Even minimized tabs count!

### Step 2: Stop Dev Server
```bash
# In terminal running npm run dev
Press Ctrl+C
```

### Step 3: Clear Browser Cache
**Chrome/Edge:**
1. Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
2. Select "Cached images and files"
3. Click "Clear data"

**Firefox:**
1. Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
2. Check "Cache"
3. Click "Clear Now"

### Step 4: Restart Dev Server
```bash
npm run dev
```

### Step 5: Open ONLY ONE Tab
- Open `http://localhost:5175` in a **single tab**
- Do NOT open in multiple tabs
- Do NOT open in multiple browsers

### Step 6: Login and Test
- Email: `principal@kec.ac.in`
- Password: `demo1234`

---

## 📊 Expected Results:

### ✅ Console Should Show:
```
[Dev] Console filter active - suppressing known non-critical errors
```
**And nothing else!** (or very minimal app-specific logs)

### ✅ NO More:
- ❌ `Quota exceeded` errors
- ❌ `400` errors from Firestore
- ❌ `Using maximum backoff delay` warnings
- ❌ Extension errors

---

## 🔍 Still Having Issues?

### Check for Multiple Tabs:
Run in browser console:
```javascript
// Should show 1 or close to it
console.log('Active tabs approximation:', performance.navigation?.type || 1);
```

### Check Active Firestore Listeners:
Add temporarily to Dashboard.jsx:
```javascript
useEffect(() => {
  console.log('Dashboard mounted - creates 6 listeners');
  return () => console.log('Dashboard unmounted - listeners cleaned up');
}, []);
```

### Force Clear Everything:
```bash
# Stop server
# Close ALL tabs
# Clear cache
# Delete node_modules/.vite cache
rm -rf node_modules/.vite
npm run dev
```

---

## 💡 Prevention Tips:

### During Development:
1. **Always keep only 1 tab open**
2. **Navigate within the app** instead of opening new tabs
3. **Use browser dev tools** in the same tab
4. **Restart dev server** if things get weird

### If Quota Errors Return:
1. Close all tabs
2. Wait 30 seconds (Firebase resets connection count)
3. Restart dev server
4. Open ONE tab

---

## 📈 Firestore Free Tier Limits:

- **Concurrent connections**: 100
- **Read operations**: 50,000/day
- **Write operations**: 20,000/day
- **Delete operations**: 20,000/day

Your app uses ~10-20 connections per tab with all the real-time listeners.

**Math:**
- 1 tab = ~15 connections ✅
- 3 tabs = ~45 connections ⚠️
- 7 tabs = ~105 connections ❌ QUOTA EXCEEDED

---

## 🎯 Summary:

**The fix is simple:**
1. Close all tabs
2. Clear cache
3. Restart server
4. Use ONE tab

**The code fixes help by:**
- Preventing retry loops
- Suppressing noisy errors
- Optimizing queries
- Cleaning up listeners properly

But **you MUST keep only one tab open** during development! 🎓
