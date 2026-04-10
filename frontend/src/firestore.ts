/**
 * Firebase Firestore service layer — NO Firebase Auth required.
 * Uses Firestore for user/order storage with CryptoJS password hashing.
 * Falls back to localStorage if Firestore is unavailable.
 */

import CryptoJS from 'crypto-js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Password Hashing (no Firebase Auth needed) ───────────────────────────────
const HASH_SALT = 'green_plant_boutique_secure_2026';
const hashPassword = (password: string): string =>
  CryptoJS.SHA256(password + HASH_SALT).toString();

// ─── Auth ────────────────────────────────────────────────────────────────────

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return true;
  } catch {
    // Firestore unavailable — fall back to localStorage
  }
  const localUsers: any[] = JSON.parse(localStorage.getItem('users') || '[]');
  return localUsers.some((u) => u.email === email);
};

export const registerUser = async (username: string, email: string, password: string) => {
  const uid = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const hashedPassword = hashPassword(password);

  const userData = {
    uid,
    username,
    email,
    password: hashedPassword,
    createdAt: serverTimestamp(),
  };

  // Try to save to Firestore
  try {
    await setDoc(doc(db, 'users', uid), userData);
  } catch (err) {
    console.warn('Firestore write failed, saving to localStorage:', err);
  }

  // Always save to localStorage as backup
  const localUsers: any[] = JSON.parse(localStorage.getItem('users') || '[]');
  localUsers.push({ uid, username, email, password: hashedPassword });
  localStorage.setItem('users', JSON.stringify(localUsers));

  return { uid, username, email };
};

export const loginUser = async (email: string, password: string) => {
  const hashedPassword = hashPassword(password);

  // ── Try Firestore first ──
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      if (userData.password === hashedPassword || userData.password === password) {
        return {
          uid: userData.uid,
          email: userData.email,
          username: userData.username,
        };
      }
      // Wrong password
      return null;
    }
  } catch {
    console.warn('Firestore login failed, trying localStorage...');
  }

  // ── Fall back to localStorage ──
  const localUsers: any[] = JSON.parse(localStorage.getItem('users') || '[]');

  // Support both hashed and plain-text legacy passwords
  const localUser = localUsers.find(
    (u) => u.email === email && (u.password === hashedPassword || u.password === password)
  );
  if (localUser) {
    return {
      uid: localUser.uid || `legacy_${Math.random().toString(36).slice(2)}`,
      email: localUser.email,
      username: localUser.username,
    };
  }

  return null;
};

export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
  const hashedCurrent = hashPassword(currentPassword);
  const hashedNew = hashPassword(newPassword);

  // Update in localStorage
  const localUsers: any[] = JSON.parse(localStorage.getItem('users') || '[]');
  const idx = localUsers.findIndex(
    (u) => u.password === hashedCurrent || u.password === currentPassword
  );
  if (idx !== -1) {
    localUsers[idx].password = hashedNew;
    localStorage.setItem('users', JSON.stringify(localUsers));
  }

  // Update in Firestore if possible
  try {
    const q = query(collection(db, 'users'), where('password', '==', hashedCurrent));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      await updateDoc(snapshot.docs[0].ref, { password: hashedNew });
    }
  } catch {
    // Firestore unavailable, localStorage update is enough
  }
};

export const updateUserName = async (userId: string, newName: string) => {
  try {
    // Try Firestore update
    const q = query(collection(db, 'users'), where('uid', '==', userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      await updateDoc(snapshot.docs[0].ref, { username: newName });
    }
  } catch {
    // Firestore unavailable
  }
  // Also update in localStorage
  const localUsers: any[] = JSON.parse(localStorage.getItem('users') || '[]');
  const idx = localUsers.findIndex((u) => u.uid === userId);
  if (idx !== -1) {
    localUsers[idx].username = newName;
    localStorage.setItem('users', JSON.stringify(localUsers));
  }
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export const saveOrder = async (order: any) => {
  const orderData = {
    id: order.id,
    userId: order.userId,
    userName: order.userName,
    userPhone: order.userPhone || '',
    items: order.items,
    totalCost: order.totalCost,
    orderTime: order.orderTime,
    status: order.status || 'Ordered',
    encryptedData: order.encryptedData || '',
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'orders', order.id), orderData);
  } catch {
    console.warn('Firestore order save failed, using localStorage');
    const localOrders: any[] = JSON.parse(localStorage.getItem('orders') || '[]');
    localOrders.unshift({ ...orderData, createdAt: new Date().toISOString() });
    localStorage.setItem('orders', JSON.stringify(localOrders));
  }
};

export const loadUserOrders = async (userEmail: string) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userEmail),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data());
  } catch {
    const localOrders: any[] = JSON.parse(localStorage.getItem('orders') || '[]');
    return localOrders.filter((o) => o.userId === userEmail);
  }
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  try {
    await updateDoc(doc(db, 'orders', orderId), { status });
  } catch {
    const localOrders: any[] = JSON.parse(localStorage.getItem('orders') || '[]');
    const idx = localOrders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      localOrders[idx].status = status;
      localStorage.setItem('orders', JSON.stringify(localOrders));
    }
  }
};

// ─── Real-time order subscription ─────────────────────────────────────────────
export const subscribeToUserOrders = (
  userEmail: string,
  callback: (orders: any[]) => void
): (() => void) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userEmail),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const orders = snapshot.docs.map((d) => ({
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() || new Date(),
        }));
        callback(orders);
      },
      (err) => {
        console.warn('Firestore subscription error:', err.message);
        // Fall back to localStorage on subscription failure
        const localOrders: any[] = JSON.parse(localStorage.getItem('orders') || '[]');
        callback(localOrders.filter((o) => o.userId === userEmail));
      }
    );
  } catch {
    // Firestore completely unavailable — use localStorage with polling
    const poll = () => {
      const localOrders: any[] = JSON.parse(localStorage.getItem('orders') || '[]');
      callback(localOrders.filter((o) => o.userId === userEmail));
    };
    poll();
    const intervalId = setInterval(poll, 5000);
    return () => clearInterval(intervalId);
  }
};
