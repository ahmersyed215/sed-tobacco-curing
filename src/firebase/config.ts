import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDtsfsfY-FQQuLbw1pcaUzMoAomUUOzddI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'sed-barns.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'sed-barns',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'sed-barns.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '1057085499742',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:1057085499742:web:658ef7608ba01a6d7587cf',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-GRYCR8JLQC',
};

export { firebaseConfig };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
