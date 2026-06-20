/**
 * CMDBLOCK — Firebase config
 * ==========================
 *
 * Plug in your Firebase project to make cmdblock.org's accounts
 * and progress live in the cloud + sync across all devices.
 *
 * If you leave this empty, the site uses localStorage only.
 *
 *
 *  ── ONE-TIME SETUP (5 minutes) ────────────────────────────
 *
 *  1.  Go to https://console.firebase.google.com → "Add project".
 *      Call it whatever (e.g. "cmdblock"). Analytics is optional.
 *
 *  2.  In the left sidebar:
 *
 *      Build → Authentication → Get started.
 *        Sign-in method tab → enable:
 *          ✔ Email/Password
 *          ✔ Google
 *
 *      Build → Firestore Database → Create database.
 *        Location: us-central (or closest). Start in production mode.
 *
 *  3.  Firestore → Rules tab → paste this and Publish:
 *
 *        rules_version = '2';
 *        service cloud.firestore {
 *          match /databases/{database}/documents {
 *            match /users/{userId} {
 *              allow read, write: if request.auth != null
 *                                 && request.auth.uid == userId;
 *            }
 *          }
 *        }
 *
 *  4.  Project Overview → click the </> "Web" icon.
 *      App nickname: "cmdblock-web". Don't tick Firebase Hosting.
 *      Register app → copy the `firebaseConfig` object.
 *
 *  5.  Paste it into FIREBASE_CONFIG below (replacing the empty {}).
 *
 *  6.  Authentication → Settings → Authorized domains.
 *      Add: cmdblock.org  (and www.cmdblock.org if you use it).
 *
 *  That's it. From now on:
 *    · Signup creates a real Firebase user with verified password.
 *    · Progress writes go to /users/{uid} in Firestore.
 *    · onSnapshot keeps every tab/device in sync in real time.
 *    · localStorage stays as a fast offline cache.
 *    · If Firebase is unreachable, the site still works locally.
 */

window.FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAwmaI-bBVTFBwYoSdp3U2xtcWaOYULnsM",
  authDomain:        "cmdblock.firebaseapp.com",
  projectId:         "cmdblock",
  storageBucket:     "cmdblock.firebasestorage.app",
  messagingSenderId: "411558820631",
  appId:             "1:411558820631:web:2c9abb45ef5968ff049552",
  measurementId:     "G-H3H8PB4ST7",
};
