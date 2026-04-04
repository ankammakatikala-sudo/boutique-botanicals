import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  onSnapshot,
  Timestamp,
  setDoc,
} from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDTjAAculAfcxJU2oTxL2AAB_Ns4NB14KE",
  authDomain: "green-plant-silling.firebaseapp.com",
  projectId: "green-plant-silling",
  storageBucket: "green-plant-silling.firebasestorage.app",
  messagingSenderId: "577702671076",
  appId: "1:577702671076:web:897be90334dc69bddc72f1",
  measurementId: "G-JF0JHPPRV6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environments)
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

// Initialize Firestore
const db = getFirestore(app);

// ==================== USER OPERATIONS ====================

export interface FirestoreUser {
  username: string;
  email: string;
  password: string;
  createdAt: Timestamp;
}

/** Check if a user with this email already exists */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Firebase checkEmailExists error:", error);
    return false; // Allow registration to proceed if Firebase is unreachable
  }
}

/** Register a new user */
export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<void> {
  await addDoc(collection(db, "users"), {
    username,
    email,
    password,
    createdAt: Timestamp.now(),
  });
}

/** Login: find user by email and password */
export async function loginUser(
  email: string,
  password: string
): Promise<{ email: string; username: string } | null> {
  try {
    const q = query(
      collection(db, "users"),
      where("email", "==", email),
      where("password", "==", password)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const userData = snapshot.docs[0].data() as FirestoreUser;
    return { email: userData.email, username: userData.username };
  } catch (error) {
    console.error("Firebase loginUser error:", error);
    return null;
  }
}

/** Update password for a user */
export async function updateUserPassword(
  email: string,
  newPassword: string
): Promise<boolean> {
  const q = query(collection(db, "users"), where("email", "==", email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return false;
  const userDoc = snapshot.docs[0];
  await updateDoc(doc(db, "users", userDoc.id), { password: newPassword });
  return true;
}

/** Update username for a user */
export async function updateUserName(
  email: string,
  newName: string
): Promise<boolean> {
  const q = query(collection(db, "users"), where("email", "==", email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return false;
  const userDoc = snapshot.docs[0];
  await updateDoc(doc(db, "users", userDoc.id), { username: newName });
  return true;
}

// ==================== ORDER OPERATIONS ====================

export interface FirestoreOrder {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: Array<{
    id: string;
    name: string;
    scientificName: string;
    price: number;
    originalPrice?: number;
    rating: number;
    category: string;
    subCategory?: string;
    benefits: string;
    image: string;
    stock: number;
    description: string;
    quantity: number;
  }>;
  totalCost: number;
  orderTime: string;
  status: "Ordered" | "Processing" | "Delivered" | "Collected";
  encryptedData?: string;
  createdAt: Timestamp;
}

/** Save an order to Firestore */
export async function saveOrder(order: {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: any[];
  totalCost: number;
  orderTime: string;
  status: string;
  encryptedData?: string;
}): Promise<void> {
  await setDoc(doc(db, "orders", order.id), {
    ...order,
    createdAt: Timestamp.now(),
  });
}

/** Load all orders for a specific user */
export async function loadUserOrders(userEmail: string): Promise<any[]> {
  const q = query(
    collection(db, "orders"),
    where("userId", "==", userEmail)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data());
}

/** Update order status */
export async function updateOrderStatus(
  orderId: string,
  status: "Ordered" | "Processing" | "Delivered" | "Collected"
): Promise<void> {
  await updateDoc(doc(db, "orders", orderId), { status });
}

/** Subscribe to real-time order updates for a user */
export function subscribeToUserOrders(
  userEmail: string,
  callback: (orders: any[]) => void
): () => void {
  const q = query(
    collection(db, "orders"),
    where("userId", "==", userEmail)
  );
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((doc) => doc.data());
    callback(orders);
  });
  return unsubscribe;
}

export { app, db };
