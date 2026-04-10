import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "green-plant-silling",
  appId: "1:577702671076:web:897be90334dc69bddc72f1",
  storageBucket: "green-plant-silling.firebasestorage.app",
  apiKey: "AIzaSyDTjAAculAfcxJU2oTxL2AAB_Ns4NB14KE",
  authDomain: "green-plant-silling.firebaseapp.com",
  messagingSenderId: "577702671076",
  measurementId: "G-JF0JHPPRV6"
};

const app = initializeApp(firebaseConfig);

// Only Firestore is needed — no Firebase Auth required
export const db = getFirestore(app);

export default app;
