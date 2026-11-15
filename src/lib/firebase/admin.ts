import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// ID token verification uses Google's public certificates; no service account
// or Firebase private key is shipped to the browser.
export function getAdminAuth() {
  const app = getApps().find((candidate) => candidate.name === 'curacircle-server') ||
    initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'curacircle-7b8fd' }, 'curacircle-server');
  return getAuth(app);
}
