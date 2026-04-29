# Firebase Cloud Functions Status

## ⚠️ Current Limitation

Your Firebase project (`kec-26`) is on the **Spark (free) plan**, which does **NOT support Cloud Functions**.

### Error Message:
```
Error: Your project kec-26 must be on the Blaze (pay-as-you-go) plan to complete this command.
Required API cloudbuild.googleapis.com can't be enabled until the upgrade is complete.
```

## 💰 Pricing Options:

### Option 1: Stay on Spark Plan (Free) - RECOMMENDED for Development
- ❌ Cloud Functions **NOT available**
- ✅ Authentication works
- ✅ Firestore works (with limits)
- ✅ Storage works (with limits)
- ✅ Hosting works

### Option 2: Upgrade to Blaze Plan ($25/month minimum)
- ✅ Cloud Functions available
- ✅ Pay-as-you-go pricing
- ✅ Free tier includes:
  - 2M function invocations/month
  - 400K GB-seconds compute time
  - 200K GHz-seconds CPU time

**Upgrade URL:** https://console.firebase.google.com/project/kec-26/usage/details

---

## 🔧 Workarounds for Cloud Functions (No Upgrade Needed):

### Features Currently Using Cloud Functions:

1. **approveUser** - Principal approves new signups
2. **suspendUser** - Suspend user accounts  
3. **setTwoFactor** - Enable 2FA
4. **encryptApiKey** - Encrypt Gemini API keys
5. **callGemini** - AI chatbot
6. **onUserSignup** - Auto-create user profile
7. **sendNotification** - Push notifications
8. **onLeaveApply/Review** - Leave application workflow
9. **exportLeaveReport** - CSV export

### Alternative Implementation:

You can implement these features **client-side** using Firestore security rules:

#### Example: approveUser (Client-Side)

Instead of calling a Cloud Function, do this directly:

```javascript
// In AdminPanel.jsx
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const approveUser = async (userId, approvalData) => {
  if (profile.role !== 'principal') {
    throw new Error('Only principals can approve users');
  }
  
  // Update user profile
  await updateDoc(doc(db, 'users', userId), {
    ...approvalData,
    approvalStatus: 'approved',
    updatedAt: serverTimestamp(),
  });
  
  // Create group chat if needed
  const classId = `${approvalData.department}-${approvalData.year}-${approvalData.section}`;
  const chatsRef = collection(db, 'groupChats');
  // ... check and create chat
};
```

**Security:** Firestore rules already protect these operations:
- Only principals can update user roles
- Only teachers can create notes/attendance
- etc.

---

## 🎯 Recommendation:

### For Development/Testing:
**Stay on Spark plan** and implement features client-side. The Firestore security rules will protect your data.

### For Production:
If you need:
- Automated workflows (e.g., send email on signup)
- Scheduled tasks (e.g., daily reports)
- Third-party API integration (e.g., Gemini AI securely)
- Heavy server-side processing

Then upgrade to Blaze plan ($25/month).

---

## 📝 Next Steps:

1. **For now**: Ignore Cloud Functions CORS errors - they're expected on Spark plan
2. **Console is now clean**: Extension errors are filtered out
3. **Focus on**: Fixing the remaining Firestore 400 errors (see main troubleshooting guide)

---

## 🔍 What Still Needs Fixing:

The Firestore 400 errors are likely from:
- Multiple browser tabs open
- Queries with empty/invalid fields
- Missing Firestore indexes

**Solution**: Close all tabs, clear cache, restart dev server, open only ONE tab.
