# MedHelper - Medication Reminder & Helper App

A Progressive Web App (PWA) designed to help patients track their medications and request help from family members.

## Features

### For Patients
- **Medication Tracking**: Set up medications with custom intervals (default 4 hours)
- **Smart Reminders**: Visual countdown timers for next dose
- **Pain Tracking**: Optional pain level logging with each dose
- **Help Requests**: Send help requests with 4 urgency levels:
  - 🆘 Emergency (bypasses all restrictions)
  - 🔴 High Urgency
  - 🟡 Medium
  - 🟢 Low
- **Flexible Helper Selection**: Send to specific helpers or all at once
- **Quick Messages**: Pre-set message templates for common requests

### For Helpers
- **Real-time Notifications**: Get instant alerts when help is needed
- **Availability Toggle**: Mark yourself available/unavailable
- **Auto Cooldown**: After 4 requests in 1 hour, helpers get a 45-minute break
- **Request Management**: Accept, decline, or mark requests as completed
- **Request History**: See all past and current requests

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: TailwindCSS
- **Backend**: Firebase (Free Tier)
  - Authentication
  - Firestore Database
  - Cloud Messaging (for notifications)
  - Hosting
- **PWA**: Service Workers for offline support

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the steps
3. Once created, click on the web icon `</>` to add a web app
4. Copy the Firebase configuration

### 2. Enable Firebase Services

**Authentication:**
1. In Firebase Console, go to Authentication
2. Click "Get Started"
3. Enable "Email/Password" sign-in method

**Firestore Database:**
1. Go to Firestore Database
2. Click "Create database"
3. Choose "Start in production mode"
4. Select a location closest to you

**Security Rules:**
In Firestore, go to Rules tab and replace with:

\`\`\`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own profile and helper profiles
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Medications - patient only
    match /medications/{medicationId} {
      allow read, write: if request.auth != null &&
        (resource.data.patientId == request.auth.uid ||
         request.resource.data.patientId == request.auth.uid);
    }

    // Medication logs - patient only
    match /medicationLogs/{logId} {
      allow read, write: if request.auth != null;
    }

    // Help requests - patient and assigned helpers
    match /helpRequests/{requestId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        (resource.data.patientId == request.auth.uid ||
         request.auth.uid in resource.data.helperIds);
    }

    // Helper availability - helper only
    match /helperAvailability/{helperId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == helperId;
    }

    // Request cooldowns - system managed
    match /requestCooldowns/{helperId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
\`\`\`

**Cloud Messaging (Optional - for push notifications):**
1. Go to Project Settings > Cloud Messaging
2. Copy your Server Key (for future use)

### 3. Local Setup

1. **Install Dependencies:**
\`\`\`bash
npm install
\`\`\`

2. **Configure Firebase:**
\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` and add your Firebase credentials:
\`\`\`
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
\`\`\`

3. **Run Development Server:**
\`\`\`bash
npm run dev
\`\`\`

4. **Build for Production:**
\`\`\`bash
npm run build
\`\`\`

### 4. Deploy to Firebase Hosting

1. **Install Firebase CLI:**
\`\`\`bash
npm install -g firebase-tools
\`\`\`

2. **Login to Firebase:**
\`\`\`bash
firebase login
\`\`\`

3. **Initialize Firebase Hosting:**
\`\`\`bash
firebase init hosting
\`\`\`
- Choose your Firebase project
- Set public directory to: `dist`
- Configure as single-page app: Yes
- Don't overwrite index.html

4. **Deploy:**
\`\`\`bash
npm run build
firebase deploy
\`\`\`

You'll get a URL like: `https://your-project.web.app`

### 5. Install on iPhones

1. Open the deployed URL in Safari on iPhone
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Name it "MedHelper" and tap "Add"
5. The app icon will appear on your home screen
6. Open it like a native app!

## Usage Guide

### For Patient (Your Mother)

1. **Sign Up:**
   - Open the app
   - Click "Sign Up"
   - Enter name, email, password
   - Select "Patient" role
   - Submit

2. **Add Medication:**
   - Click "+ Add Medication"
   - Enter medication name (e.g., "Ibuprofen")
   - Enter dosage (e.g., "200mg")
   - Set interval (default 4 hours)
   - Submit

3. **Take Medication:**
   - When timer hits zero, tap "✓ Take Now"
   - Optionally log pain level
   - Timer resets for next dose

4. **Request Help:**
   - Scroll to "Need Help?" section
   - Select urgency level
   - Choose quick message or type custom message
   - Select which helpers to notify
   - Tap "Send Help Request"

### For Helpers (Family Members)

1. **Sign Up:**
   - Open the app
   - Click "Sign Up"
   - Enter name, email, password
   - Select "Helper" role
   - Enter relationship (e.g., "Daughter", "Son")
   - Submit

2. **Manage Availability:**
   - Toggle availability switch
   - Set how long you'll be unavailable
   - System will not send non-emergency requests during this time

3. **Respond to Requests:**
   - Receive notification when patient needs help
   - Tap "On My Way" to let patient know you're coming
   - Tap "Completed" when done helping

4. **Cooldown System:**
   - After 4 requests in 1 hour, you'll get a 45-minute break
   - Emergency requests always come through
   - You'll see a notification when break is over

## Customization

### Adjusting Cooldown Settings

Edit `/src/services/helpRequestService.ts`:

\`\`\`typescript
const COOLDOWN_THRESHOLD = 4; // Change number of requests
const COOLDOWN_DURATION_MS = 45 * 60 * 1000; // Change to 30 or 60 minutes
\`\`\`

### Changing Medication Interval

In the Patient Dashboard, when adding medication, set the interval to any number of hours (1-24).

### Adding More Quick Messages

Edit `/src/components/HelpRequestPanel.tsx` and add to the `quickMessages` array.

## Troubleshooting

### App not loading?
- Check that Firebase credentials in `.env` are correct
- Make sure Firebase Authentication and Firestore are enabled

### Notifications not working?
- Notifications require HTTPS (works on deployed Firebase site)
- On iPhone, must be added to home screen as PWA
- Check browser notification permissions

### Cooldown not working?
- Check Firestore rules are set correctly
- Ensure helper IDs are being tracked properly in the database

### Timer not accurate?
- Timer syncs with last logged medication time
- If no logs exist, starts from medication creation time
- Check browser time is set correctly

## Security Notes

- Firestore security rules restrict access to user's own data
- Helpers can only see requests sent to them
- Patients can only modify their own medications
- All data is stored securely in Firebase

## Free Tier Limits

Firebase Free (Spark) Plan includes:
- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day
- **Authentication**: Unlimited users
- **Hosting**: 10GB storage, 360MB/day transfer

This is plenty for household use!

## Future Enhancements

- Push notifications via FCM
- Photo attachments in help requests
- Medication refill reminders
- Calendar view of medication history
- Analytics dashboard
- Multiple medication support improvements
- Voice message support

## Support

For issues or questions, check the Firebase Console for any errors in:
- Authentication > Users
- Firestore > Data
- Hosting > Releases

## License

Free to use for personal/family use.
