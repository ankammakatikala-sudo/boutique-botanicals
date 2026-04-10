/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  User,
  Home as HomeIcon,
  Search,
  Heart,
  ShoppingCart,
  ArrowRight,
  ChevronLeft,
  Plus,
  Minus,
  Trash2,
  Bell,
  Settings,
  Leaf,
  Sparkles,
  X,
  Download,
  Share as ShareIcon,
  Share2
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';
import CryptoJS from 'crypto-js';
import { Screen, Plant, CartItem, Order } from './types';
import { PLANTS } from './constants';
import {
  checkEmailExists,
  registerUser,
  loginUser,
  updateUserPassword,
  updateUserName,
  saveOrder,
  loadUserOrders,
  updateOrderStatus,
  subscribeToUserOrders,
} from './firestore';

const EMOJIS = ['🌿', '🌱', '🌵', '🌴', '🌳', '🍀', '🍃', '🌻', '🌷', '🌸', '🪴', '🎋', '🎍', '🍄', '🌵'];
const SECRET_KEY = 'green_plant_boutique_secure_key_2026';

const getEmojiForName = (name: string) => {
  if (!name) return '🌿';
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % EMOJIS.length;
  return EMOJIS[index];
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Subscribe to real-time order updates from Firebase Firestore
  useEffect(() => {
    if (!userEmail) return;
    // subscribeToUserOrders returns the unsubscribe function directly
    const unsubscribe = subscribeToUserOrders(userEmail, (firebaseOrders) => {
      setOrders(firebaseOrders as Order[]);
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [userEmail]);

  // Splash screen timeout
  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => setScreen('auth'), 3000);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  const addToCart = (plant: Plant) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === plant.id);
      if (existing) {
        return prev.map(item =>
          item.id === plant.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...plant, quantity: 1 }];
    });

    const targetEmail = userEmail || 'guest@example.com';
    fetch(`/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: targetEmail,
        subject: `Item Added to Cart`,
        text: `your ordered items are placed from these app`
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.previewUrl) {
          console.log("Cart Email sent! Ethereal Preview URL:", data.previewUrl);
          showToast("Cart notification sent to " + targetEmail);
        }
      })
      .catch(e => console.error(e));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="max-w-md mx-auto h-screen bg-bg-warm overflow-hidden relative shadow-2xl">
      <AnimatePresence mode="wait">
        {screen === 'splash' && (
          <SplashScreen key="splash" />
        )}

        {screen === 'auth' && (
          <AuthScreen onLogin={(email, username, uid) => {
            setUserEmail(email);
            setUserName(username);
            setUserId(uid);
            setScreen('home');
          }} />
        )}

        {(['home', 'shop', 'cart', 'profile', 'liked', 'change-password', 'change-name', 'qr-scanner', 'order-details'].includes(screen)) && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col"
          >
            <Header screen={screen} onBack={() => {
              if (screen === 'change-password' || screen === 'change-name') {
                setScreen('profile');
              } else if (screen === 'qr-scanner' || screen === 'order-details') {
                setScreen('profile');
              } else {
                setScreen('home');
              }
            }} />

            <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
              {(() => {
                const orderedIds = new Set<string>();
                orders.forEach(o => o.items.forEach(item => orderedIds.add(item.id)));

                return (
                  <>
                    {screen === 'home' && <HomeScreen onNavigate={setScreen} addToCart={addToCart} toggleFavorite={toggleFavorite} favorites={favorites} orderedIds={orderedIds} />}
                    {screen === 'liked' && <LikedScreen onNavigate={setScreen} addToCart={addToCart} toggleFavorite={toggleFavorite} favorites={favorites} orderedIds={orderedIds} />}
                    {screen === 'shop' && <ShopScreen addToCart={addToCart} toggleFavorite={toggleFavorite} favorites={favorites} orderedIds={orderedIds} />}
                  </>
                );
              })()}
              {screen === 'cart' && (
                <CartScreen
                  cart={cart}
                  updateQuantity={updateQuantity}
                  removeFromCart={removeFromCart}
                  total={cartTotal}
                  onCheckout={() => {
                    const newOrderId = `GP${Math.floor(Math.random() * 10000)}`;
                    const orderPayload = {
                      id: newOrderId,
                      userName: userName || 'Guest User',
                      userEmail: userEmail || 'guest@example.com',
                      userPhone: '9876543210',
                      items: cart.map(item => ({ name: item.name, quantity: item.quantity })),
                      totalCost: cartTotal + 50,
                      orderTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };

                    const itemLists = cart.map(item => `- ${item.name} (x${item.quantity})`).join('\n');
                    const publicQrText = `ORDER: ${newOrderId}\nName: ${orderPayload.userName}\nEmail: ${orderPayload.userEmail}\nItems:\n${itemLists}\nTotal: ₹${orderPayload.totalCost}`;

                    const newOrder: Order = {
                      id: newOrderId,
                      userId: userEmail || 'guest',
                      userName: orderPayload.userName,
                      userPhone: orderPayload.userPhone,
                      items: [...cart],
                      totalCost: orderPayload.totalCost,
                      orderTime: orderPayload.orderTime,
                      status: 'Ordered',
                      encryptedData: publicQrText
                    };
                    setOrders(prev => [...prev, newOrder]);
                    setCurrentOrderId(newOrder.id);
                    setCart([]);

                    // Save order to Firestore
                    saveOrder(newOrder).catch(e => console.error('Failed to save order to Firestore:', e));

                    showToast("Your plant order is successfully placed.");

                    const mailText = `Hi ${orderPayload.userName},\n\nyour ordered items are placed.\n\nPlease visit the nursery after 5-6 hours to collect your plants.\n\nOrder Details:\n${itemLists}\n\nTotal: ₹${orderPayload.totalCost}\n\n--- Nursery Details ---\nNursery Name: FTC Nursery\nOwner Name: hitesh.c\nOwner Mobile: 6302450825\nCustomer Care: 6302450825\nLocation: https://goo.gl/maps/FtmXBooJQ5B4D6ec6?g_st=aw\n\nThanks,\nFTC Nursery`;

                    // Send Email via local backend
                    fetch(`/api/send-email`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        to: orderPayload.userEmail,
                        subject: `Order Confirmation #${newOrderId}`,
                        text: mailText,
                        qrData: publicQrText
                      })
                    })
                      .then(r => r.json())
                      .then(data => {
                        if (data.success) {
                          console.log("Order confirmation email sent to customer.");
                          setTimeout(() => showToast("Order confirmation email sent to " + orderPayload.userEmail), 2000);
                        }
                      })
                      .catch(e => console.error(e));

                    // Send order details to nursery owner
                    fetch(`/api/send-order-to-owner`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        orderId: newOrderId,
                        userName: orderPayload.userName,
                        userEmail: orderPayload.userEmail,
                        items: cart.map(item => ({ name: item.name, quantity: item.quantity })),
                        totalCost: orderPayload.totalCost,
                        orderTime: orderPayload.orderTime
                      })
                    })
                      .then(r => r.json())
                      .then(data => {
                        if (data.success) {
                          console.log("Owner notification email sent successfully.");
                          setTimeout(() => showToast("Order details sent to nursery owner"), 4000);
                        }
                      })
                      .catch(e => console.error("Failed to notify owner:", e));

                    setScreen('order-qr');
                  }}
                />
              )}
              {screen === 'profile' && (
                <ProfileScreen
                  onNavigate={setScreen}
                  userName={userName}
                  userEmail={userEmail}
                  userPhoto={userPhoto}
                  setUserPhoto={setUserPhoto}
                  onSignOut={() => setScreen('auth')}
                />
              )}
              {screen === 'change-password' && <ChangePasswordScreen userEmail={userEmail} onBack={() => setScreen('profile')} />}
              {screen === 'change-name' && (
                <ChangeNameScreen
                  currentName={userName}
                  onSave={(newName) => {
                    setUserName(newName);
                    // Update name in Firebase Firestore
                    updateUserName(userId, newName).catch(e => console.error('Failed to update name in Firebase:', e));
                    setScreen('profile');
                  }}
                />
              )}
              {screen === 'qr-scanner' && (
                <QRScannerScreen
                  onScan={(data) => {
                    try {
                      // Attempt to parse out ORDER ID if it's the public text format we generated
                      let oid = data;
                      if (data.startsWith('ORDER: ')) {
                        oid = data.split('\n')[0].replace('ORDER: ', '').trim();
                      }

                      const existingOrder = orders.find(o => o.id === oid);
                      if (existingOrder && existingOrder.status === 'Collected') {
                        alert("Order already collected.");
                        setScreen('profile');
                        return;
                      }

                      setCurrentOrderId(oid);
                      setScreen('order-details');
                    } catch (e) {
                      alert("Invalid QR Code.");
                    }
                  }}
                />
              )}
              {screen === 'order-details' && (
                <OrderDetailsScreen
                  orderId={currentOrderId!}
                  orders={orders}
                  onMarkCollected={(id) => {
                    const statusCycle: Record<string, Order['status']> = {
                      'Ordered': 'Processing',
                      'Processing': 'Delivered',
                      'Delivered': 'Collected',
                      'Collected': 'Collected'
                    };
                    setOrders(prev => prev.map(o => {
                      if (o.id === id) {
                        const newStatus = statusCycle[o.status] || 'Ordered';
                        updateOrderStatus(id, newStatus).catch(e => console.error('Failed to update status in Firestore:', e));
                        return { ...o, status: newStatus };
                      }
                      return o;
                    }));
                  }}
                />
              )}
            </main>

            <BottomNav currentScreen={screen} onNavigate={setScreen} cartCount={cart.length} />
          </motion.div>
        )}

        {screen === 'order-qr' && (
          <OrderQRScreen
            order={orders.find(o => o.id === currentOrderId)!}
            onDone={() => setScreen('home')}
          />
        )}

        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-24 left-4 right-4 bg-zinc-900 text-white p-4 rounded-2xl shadow-xl z-50 flex items-start gap-4"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{toastMessage}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Components ---

function SplashScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 100 : prev + 2));
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-between py-20 bg-white"
    >
      <div className="text-center">
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-serif text-4xl font-bold text-primary-dark"
        >
          Green Plant Selling
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.4 }}
          className="uppercase tracking-widest text-xs mt-2"
        >
          Boutique Botanicals
        </motion.p>
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 100,
          delay: 0.6
        }}
        className="relative"
      >
        <div className="w-48 h-48 rounded-full bg-primary/10 flex items-center justify-center">
          <Leaf className="w-24 h-24 text-primary fill-primary" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 rounded-full bg-primary/20 -z-10 blur-xl"
        />
      </motion.div>

      <div className="w-full px-12 text-center">
        <div className="relative h-1 w-full bg-zinc-100 rounded-full overflow-hidden mb-4">
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400">
          Growing your garden... {progress}%
        </p>
      </div>
    </motion.div>
  );
}

function AuthScreen({ onLogin }: { onLogin: (email: string, username: string, uid: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);

  // Registration States
  const [regStep, setRegStep] = useState<'email' | 'otp' | 'password'>('email');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async (isResend = false) => {
    if (!isResend) {
      setError(''); setSuccess('');
      if (!username || !email) { setError('Username and Email are required'); return; }
      if (username.length < 3) { setError('Username must be at least 3 characters'); return; }

      try {
        // Check Firebase for existing email
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
          setError('Email already registered'); return;
        }
        // Also check localStorage for old users
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
        if (localUsers.find((u: any) => u.email === email)) {
          setError('Email already registered'); return;
        }
      } catch (err) {
        console.error('Email check error:', err);
        // Continue with registration even if check fails
      }
    }

    setIsLoading(true);
    // Bypass OTP API call for serverless Firebase Hosting deployment
    setTimeout(() => {
      setSuccess('Email accepted! Please create a password.');
      setRegStep('password');
      setIsLoading(false);
    }, 500);
  };

  const handleVerifyOtp = async () => {
    setError(''); setSuccess('');
    if (!otp) { setError('Please enter OTP'); return; }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Email verified! You can now create a password.');
        setRegStep('password');
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError('Could not connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Step 1: Try Firebase login first
        let user = await loginUser(email, password);

        // Step 2: If not found in Firestore, check localStorage (for old accounts)
        if (!user) {
          const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
          const localUser = localUsers.find((u: any) => u.email === email && u.password === password);
          if (localUser) {
            user = { uid: 'legacy-' + Math.random(), email: localUser.email, username: localUser.username };
            // Auto-migrate this user to Firestore for future logins
            try {
              await registerUser(localUser.username, localUser.email, localUser.password);
              console.log('User migrated from localStorage to Firestore:', localUser.email);
            } catch (migErr) {
              console.error('Migration error (non-critical):', migErr);
            }
          }
        }

        if (user) {
          onLogin(user.email, user.username, user.uid);
        } else {
          setError('Invalid email or password. Please check your credentials or sign up.');
        }
      } else {
        // Registration Flow
        if (regStep === 'email') { setIsLoading(false); return handleSendOtp(); }
        if (regStep === 'otp') { setIsLoading(false); return handleVerifyOtp(); }

        if (!password || !confirmPassword) { setError('Please enter password'); setIsLoading(false); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); setIsLoading(false); return; }
        if (password !== confirmPassword) { setError('Passwords do not match'); setIsLoading(false); return; }

        // Save user to Firebase Firestore
        await registerUser(username, email, password);

        // Also save to localStorage as backup
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
        localUsers.push({ username, email, password });
        localStorage.setItem('users', JSON.stringify(localUsers));

        // Notify nursery owner about new registration
        fetch(`/api/notify-new-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email })
        })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              console.log("Owner notified about new user registration.");
            }
          })
          .catch(e => console.error("Failed to notify owner of new user:", e));

        setSuccess('Registration successful! Please log in.');
        setTimeout(() => {
          setIsLogin(true);
          setRegStep('email');
          setSuccess('');
          setPassword('');
          setConfirmPassword('');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const message = err?.message || 'An error occurred. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="h-full bg-white px-8 py-12 flex flex-col overflow-y-auto no-scrollbar"
    >
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Leaf className="w-8 h-8 text-primary fill-primary" />
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-zinc-900 font-serif">
          {isLogin ? 'Welcome Back' : 'Green Plant Selling'}
        </h2>
        <p className="text-zinc-500 mt-2 text-sm">
          {isLogin ? 'Bringing nature to your doorstep' : 'Create an account to start your green journey'}
        </p>
      </div>

      <div className="space-y-4">
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 text-red-500 text-xs p-3 rounded-xl text-center font-medium">
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-emerald-50 text-emerald-600 text-xs p-3 rounded-xl text-center font-medium">
            {success}
          </motion.div>
        )}

        {!isLogin && regStep === 'email' && (
          <>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <User className="w-5 h-5 text-primary" />
              </div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-14 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-14 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </>
        )}

        {isLogin && (
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-14 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
        )}

        {!isLogin && regStep === 'otp' && (
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-14 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
            <div className="flex justify-between items-center mt-3 px-2">
              <span className="text-[11px] text-zinc-500 font-medium">Didn't receive code?</span>
              <button
                type="button"
                onClick={() => handleSendOtp(true)}
                disabled={resendTimer > 0}
                className={`text-[11px] font-bold ${resendTimer > 0 ? 'text-zinc-400 cursor-not-allowed' : 'text-primary hover:underline'}`}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}

        {(isLogin || (!isLogin && regStep === 'password')) && (
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-14 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
        )}

        {!isLogin && regStep === 'password' && (
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-14 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
        )}
      </div>

      <button
        onClick={handleAuth}
        disabled={isLoading}
        className={`w-full bg-primary text-primary-dark font-bold py-4 rounded-2xl mt-8 flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90 active:scale-95'}`}
      >
        {isLoading ? 'Processing...' : (
          isLogin ? 'Login' :
            regStep === 'email' ? 'Continue' :
              regStep === 'otp' ? 'Verify OTP' :
                'Create Account'
        )} <ArrowRight className="w-5 h-5" />
      </button>

      <div className="mt-auto pt-8 text-center">
        <p className="text-zinc-500 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setRegStep('email');
              setError('');
              setSuccess('');
            }}
            className="text-primary font-bold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </motion.div>
  );
}

function Header({ screen, onBack }: { screen: Screen, onBack: () => void }) {
  const titles: Record<string, string> = {
    home: '', // Empty for home as we have the big hero title
    shop: 'Indoor Plants',
    cart: 'Shopping Cart',
    profile: 'Profile Settings',
    liked: 'Your Favorites',
    'change-password': 'Change Password',
    'change-name': 'Change Name',
    'qr-scanner': 'Scan Order QR',
    'order-details': 'Order Details'
  };

  return (
    <header className="px-4 py-4 flex items-center justify-between bg-white/40 backdrop-blur-md sticky top-0 z-30 border-b border-white/20">
      <button
        onClick={onBack}
        className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-zinc-50 transition-all active:scale-90"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      {screen === 'home' ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 relative"
        >
          <div className="relative">
            <Leaf className="w-5 h-5 text-emerald-600 fill-emerald-100 relative z-10" />
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.5, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-emerald-400 rounded-full blur-md -z-0"
            />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.4em] text-emerald-950">GPS</span>
        </motion.div>
      ) : (
        <h1 className="text-lg font-bold text-primary-dark tracking-tight">{titles[screen] || 'Green Plant'}</h1>
      )}
      <div className="w-10 h-10" />
    </header>
  );
}

function BottomNav({ currentScreen, onNavigate, cartCount }: { currentScreen: Screen, onNavigate: (s: Screen) => void, cartCount: number }) {
  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Home' },
    { id: 'shop', icon: ShoppingBag, label: 'Shop' },
    { id: 'cart', icon: ShoppingCart, label: 'Cart', badge: cartCount },
    { id: 'liked', icon: Heart, label: 'Likes' },
    { id: 'profile', icon: User, label: 'Profile' }
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-6 py-4 flex justify-between items-center z-20">
      {navItems.map(item => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as Screen)}
            className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-primary' : 'text-zinc-400'}`}
          >
            <div className="relative">
              <item.icon className={`w-6 h-6 ${isActive ? 'fill-primary/10' : ''}`} />
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-dark text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="nav-dot"
                className="w-1 h-1 rounded-full bg-primary mt-1"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function HomeScreen({ onNavigate, addToCart, toggleFavorite, favorites, orderedIds }: {
  onNavigate: (s: Screen) => void,
  addToCart: (p: Plant) => void,
  toggleFavorite: (id: string) => void,
  favorites: string[],
  orderedIds: Set<string>
}) {
  const categories = [
    { name: 'Indoor', icon: '🏠', color: 'bg-emerald-50' },
    { name: 'Outdoor', icon: '☀️', color: 'bg-orange-50' },
    { name: 'Medicinal', icon: '💊', color: 'bg-blue-50' }
  ];

  // Get some featured plants (specifically requested by user)
  const featuredPlants = PLANTS.filter(p => ['1', '2', '3', '4', '5', '6', '7', '8', '41', '26'].includes(p.id));

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col items-center pt-8 pb-10 relative overflow-hidden">
        {/* Ethereal Beauty Aura */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.6, 0.4]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-200/30 rounded-full blur-[80px] -z-10"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative text-center px-4"
        >
          <div className="relative inline-block">
            {/* 3D Ethereal Beauty Typography */}
            <h1 className="flex flex-col items-center">
              <motion.span
                initial={{ rotateX: 45, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.2 }}
                className="text-4xl md:text-5xl font-serif font-bold text-emerald-950 leading-none"
                style={{
                  textShadow: '0 1px 0 #d1fae5, 0 2px 0 #a7f3d0, 0 3px 0 #6ee7b7, 0 4px 0 #34d399, 0 15px 30px rgba(6, 78, 59, 0.15)',
                  perspective: '1000px',
                  transformStyle: 'preserve-3d'
                }}
              >
                Green Plant
              </motion.span>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="mt-2 relative"
              >
                <motion.span
                  animate={{
                    color: ['#064e3b', '#10b981', '#064e3b']
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="text-xl md:text-2xl font-sans font-black uppercase tracking-[0.5em] block relative z-10"
                >
                  Selling
                </motion.span>

                {/* Highlight Glow */}
                <motion.div
                  animate={{
                    opacity: [0.2, 0.5, 0.2],
                    scale: [0.9, 1.1, 0.9]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 bg-emerald-400/20 blur-xl -z-10"
                />
              </motion.div>
            </h1>

            {/* Sparkling Beauty Accents */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: [0, (i - 2) * 40],
                    y: [0, -60 - (i * 10)]
                  }}
                  transition={{
                    duration: 2 + i,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: "easeOut"
                  }}
                  className="absolute top-1/2 left-1/2"
                >
                  <Sparkles className="w-4 h-4 text-emerald-300 fill-emerald-100" />
                </motion.div>
              ))}
            </div>

            <motion.div
              animate={{
                rotate: 360,
                y: [0, -10, 0]
              }}
              transition={{
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute -top-10 -right-10 text-emerald-600/20"
            >
              <Leaf className="w-10 h-10" />
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="bg-primary/10 rounded-3xl p-6 flex items-center justify-between">
        <div className="space-y-2">
          <span className="bg-primary/20 text-primary-dark text-[10px] font-bold px-2 py-1 rounded-full uppercase">Flash Sale</span>
          <h3 className="text-xl font-bold text-primary-dark leading-tight">Massive price drops<br />on all plants!</h3>
          <button
            onClick={() => onNavigate('shop')}
            className="text-primary-dark text-sm font-bold flex items-center gap-1"
          >
            Shop Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="w-20 h-20 bg-white/50 rounded-full flex items-center justify-center">
          <Leaf className="w-10 h-10 text-primary" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-zinc-900 mb-4">Categories</h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => onNavigate('shop')}
              className={`${cat.color} p-4 rounded-3xl min-w-[120px] flex flex-col items-center gap-2 transition-transform active:scale-95`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-bold text-zinc-700">{cat.name}</span>
            </button>
          ))}
          <button
            onClick={() => onNavigate('liked')}
            className="bg-red-50 p-4 rounded-3xl min-w-[120px] flex flex-col items-center gap-2 transition-transform active:scale-95 border-2 border-red-100"
          >
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            <span className="text-xs font-bold text-red-700">Liked Items</span>
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zinc-900">Featured Plants</h2>
          <button onClick={() => onNavigate('shop')} className="text-primary text-sm font-bold">View All</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {featuredPlants.map(plant => (
            <div key={plant.id}>
              <PlantCard
                plant={plant}
                onAdd={() => addToCart(plant)}
                onFavorite={() => toggleFavorite(plant.id)}
                isFavorite={favorites.includes(plant.id)}
                isOrdered={orderedIds.has(plant.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LikedScreen({ onNavigate, addToCart, toggleFavorite, favorites, orderedIds }: {
  onNavigate: (s: Screen) => void,
  addToCart: (p: Plant) => void,
  toggleFavorite: (id: string) => void,
  favorites: string[],
  orderedIds: Set<string>
}) {
  const likedPlants = PLANTS.filter(p => favorites.includes(p.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900">Your Favorites</h2>
        <span className="text-xs font-bold text-zinc-400">{likedPlants.length} items</span>
      </div>

      {likedPlants.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {likedPlants.map(plant => (
            <div key={plant.id}>
              <PlantCard
                plant={plant}
                onAdd={() => addToCart(plant)}
                onFavorite={() => toggleFavorite(plant.id)}
                isFavorite={true}
                isOrdered={orderedIds.has(plant.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-6">
          <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8 text-zinc-200" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-zinc-900">No favorites yet</h3>
            <p className="text-sm text-zinc-400 px-10">Tap the heart icon on any plant to save it here for later.</p>
          </div>
          <button
            onClick={() => onNavigate('shop')}
            className="bg-primary text-primary-dark font-bold px-8 py-3 rounded-2xl active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            Start Exploring
          </button>
        </div>
      )}
    </div>
  );
}

function ShopScreen({ addToCart, toggleFavorite, favorites, orderedIds }: {
  addToCart: (p: Plant) => void,
  toggleFavorite: (id: string) => void,
  favorites: string[],
  orderedIds: Set<string>
}) {
  const [activeCategory, setActiveCategory] = useState('Indoor');
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['Indoor', 'Outdoor', 'Medicinal'];

  // Extract unique subcategories for the active category
  const subCategories = ['All', ...new Set(PLANTS.filter(p => p.category === activeCategory).map(p => p.subCategory).filter(Boolean) as string[])];

  const filteredPlants = PLANTS.filter(p =>
    p.category === activeCategory &&
    (activeSubCategory === 'All' || p.subCategory === activeSubCategory) &&
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.scientificName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search plants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setActiveSubCategory('All');
            }}
            className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-primary text-primary-dark' : 'bg-white text-zinc-400'
              }`}
          >
            {cat} Plants
          </button>
        ))}
      </div>

      {subCategories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {subCategories.map(sub => (
            <button
              key={sub}
              onClick={() => setActiveSubCategory(sub)}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeSubCategory === sub
                ? 'bg-emerald-950 text-white border-emerald-950'
                : 'bg-white text-zinc-400 border-zinc-100'
                }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {filteredPlants.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {filteredPlants.map(plant => (
            <div key={plant.id}>
              <PlantCard
                plant={plant}
                onAdd={() => addToCart(plant)}
                onFavorite={() => toggleFavorite(plant.id)}
                isFavorite={favorites.includes(plant.id)}
                isOrdered={orderedIds.has(plant.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-zinc-400">No plants found matching your search.</p>
        </div>
      )}
    </div>
  );
}

function PlantCard({ plant, onAdd, onFavorite, isFavorite, isOrdered }: {
  plant: Plant,
  onAdd: () => void,
  onFavorite: () => void,
  isFavorite: boolean,
  isOrdered?: boolean
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="bg-white rounded-[2rem] p-3 card-shadow relative group border border-zinc-50"
    >
      <button
        onClick={onFavorite}
        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 active:scale-90 transition-all"
      >
        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-zinc-300'}`} />
      </button>

      {isOrdered && (
        <div className="absolute top-4 left-4 z-10 px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">
          Ordered
        </div>
      )}

      <div className="aspect-square rounded-[1.5rem] overflow-hidden mb-4 bg-zinc-50 relative">
        <img
          src={plant.image}
          alt={plant.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-lg flex items-center gap-1">
          <span className="text-[10px] text-yellow-600 font-black">★ {plant.rating}</span>
        </div>
      </div>

      <div className="px-1 space-y-1">
        <h4 className="font-bold text-sm text-zinc-900 truncate leading-tight">{plant.name}</h4>
        <p className="text-[9px] text-zinc-400 font-medium truncate uppercase tracking-wider">{plant.subCategory || plant.category}</p>

        <div className="flex items-start gap-1 py-1">
          <Sparkles className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-[9px] text-zinc-500 leading-relaxed line-clamp-2 italic">{plant.benefits}</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span className="text-emerald-900 font-black text-base">₹{plant.price}</span>
            {plant.originalPrice && (
              <span className="text-[9px] text-zinc-300 line-through font-bold">₹{plant.originalPrice}</span>
            )}
          </div>
          <button
            onClick={onAdd}
            className="w-10 h-10 rounded-2xl bg-emerald-950 flex items-center justify-center text-white hover:bg-emerald-800 transition-colors active:scale-90 shadow-lg shadow-emerald-900/10"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CartScreen({ cart, updateQuantity, removeFromCart, total, onCheckout }: {
  cart: CartItem[],
  updateQuantity: (id: string, d: number) => void,
  removeFromCart: (id: string) => void,
  total: number,
  onCheckout: () => void
}) {
  if (cart.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
          <ShoppingCart className="w-10 h-10 text-zinc-300" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900">Your cart is empty</h3>
        <p className="text-zinc-500 mt-2">Looks like you haven't added any plants to your collection yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {cart.map(item => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-4 flex gap-4 card-shadow"
          >
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-50">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-zinc-900">{item.name}</h4>
                  <p className="text-primary-dark font-bold text-sm">₹{item.price}</p>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-zinc-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-6 h-6 rounded-full border border-zinc-100 flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-bold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-6 h-6 rounded-full border border-zinc-100 flex items-center justify-center"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 space-y-4 card-shadow">
        <div className="flex justify-between text-zinc-500 text-sm">
          <span>Subtotal</span>
          <span>₹{total}</span>
        </div>
        <div className="flex justify-between text-zinc-500 text-sm">
          <span>Delivery Fee</span>
          <span>₹50</span>
        </div>
        <div className="h-px bg-zinc-100" />
        <div className="flex justify-between font-bold text-lg text-zinc-900">
          <span>Total Cost</span>
          <span>₹{total + 50}</span>
        </div>
        <button
          onClick={onCheckout}
          className="w-full bg-primary text-primary-dark font-bold py-4 rounded-2xl flex items-center justify-center gap-2 mt-4"
        >
          Proceed to Order <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function ProfileScreen({ onNavigate, userName, userEmail, userPhoto, setUserPhoto, onSignOut }: {
  onNavigate: (s: Screen) => void,
  userName: string,
  userEmail: string,
  userPhoto: string | null,
  setUserPhoto: (p: string) => void,
  onSignOut: () => void
}) {
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-primary/20 p-1 flex items-center justify-center bg-white overflow-hidden">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-6xl">{getEmojiForName(userName)}</span>
            )}
          </div>
        </div>
        <div className="text-center mt-4">
          <h3 className="text-2xl font-bold text-zinc-900">{userName || 'User'}</h3>
          <p className="text-zinc-500 text-sm">{userEmail || 'No email provided'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Plants', value: '24', icon: Leaf },
          { label: 'CO2 Off', value: '120kg', icon: Leaf },
          { label: 'Level', value: 'Expert', icon: Leaf }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-3xl p-4 text-center card-shadow">
            <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-sm font-bold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {[
          { label: 'Change Name', icon: User, action: () => onNavigate('change-name') },
          { label: 'Change Password', icon: Settings, action: () => onNavigate('change-password') },
          { label: 'Upload Profile Photo', icon: ShoppingBag, action: () => document.getElementById('photo-upload')?.click() },
          { label: 'Nursery Owner Scanner', icon: Search, action: () => onNavigate('qr-scanner') },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="w-full bg-white rounded-2xl p-4 flex items-center justify-between card-shadow hover:bg-zinc-50 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-zinc-900">{item.label}</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-zinc-300 rotate-180" />
          </button>
        ))}
        <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
      </div>

      <button
        onClick={onSignOut}
        className="w-full bg-red-50 text-red-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
      >
        Sign Out
      </button>
    </div>
  );
}

function ChangeNameScreen({ currentName, onSave }: { currentName: string, onSave: (name: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(currentName);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-3xl p-6 card-shadow space-y-6">
        {!isEditing ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-1">{currentName}</h3>
            <p className="text-sm text-zinc-400 mb-8">Current Profile Name</p>

            <button
              onClick={() => setIsEditing(true)}
              className="px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold text-sm flex items-center gap-2 active:scale-95 transition-all"
            >
              Edit Name
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">New Name</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <User className="w-5 h-5 text-primary" />
                  <Leaf className="w-3 h-3 text-primary/40 -rotate-12" />
                </div>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-14 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 border border-zinc-100 text-zinc-500 font-bold py-4 rounded-2xl active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(newName)}
                className="flex-[2] bg-primary text-primary-dark font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Save Name
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ChangePasswordScreen({ userEmail, onBack }: { userEmail: string; onBack: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill all fields');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await updateUserPassword(currentPassword, newPassword);
      setSuccess('Password updated successfully!');
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err: any) {
      console.error('Password update error:', err);
      const message = err?.message || 'Failed to update password. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-3xl p-6 card-shadow space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Current Password</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <input
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-14 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">New Password</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Settings className="w-5 h-5 text-primary" />
              <Leaf className="w-3 h-3 text-primary/40 -rotate-45" />
            </div>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-14 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Confirm Password</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Settings className="w-5 h-5 text-primary" />
              <Leaf className="w-3 h-3 text-primary/40 rotate-45" />
            </div>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-14 pr-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs font-medium text-center bg-red-50 p-3 rounded-xl">
            {error}
          </motion.p>
        )}
        {success && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-600 text-xs font-medium text-center bg-emerald-50 p-3 rounded-xl">
            {success}
          </motion.p>
        )}

        <button
          onClick={handleSave}
          className="w-full bg-primary text-primary-dark font-bold py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          Save Changes
        </button>
      </div>

      <div className="px-4 text-center">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Ensure your new password is secure and not used for other accounts.
        </p>
      </div>
    </motion.div>
  );
}

function OrderQRScreen({ order, onDone }: { order: Order, onDone: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (!qrRef.current) return;
    try {
      const canvas = await html2canvas(qrRef.current, { scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `GPS_Order_${order.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download image", err);
    }
  };
  const handleDownloadText = () => {
    const text = `GPS ORDER DETAILS\nOrder ID: ${order.id}\nStatus: ${order.status}\nCustomer: ${order.userName}\nPlants:\n${order.items.map(i => `- ${i.name} (x${i.quantity})`).join('\n')}\nTotal: ₹${order.totalCost}`;
    const file = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = `GP_Order_${order.id}.txt`;
    link.href = URL.createObjectURL(file);
    link.click();
  };

  if (!order) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full flex flex-col items-center justify-start p-6 text-center bg-white overflow-y-auto no-scrollbar"
    >
      <h2 className="text-2xl font-bold text-emerald-900 mt-8 mb-1">Order Confirmed! 🌿</h2>
      <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border border-emerald-200">
        Status: {order.status}
      </div>

      <div ref={qrRef} className="w-full bg-zinc-50 rounded-[2.5rem] p-8 mb-8 flex flex-col items-center card-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="bg-white p-5 rounded-3xl shadow-sm mb-6 relative z-10">
          <QRCode value={order.encryptedData || order.id} size={180} fgColor="#064e3b" />
        </div>

        <div className="w-full text-left space-y-3 border-t border-zinc-200 pt-6 relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-400 uppercase font-black">Order Reference</span>
            <span className="text-[10px] bg-zinc-200 px-2 py-0.5 rounded text-zinc-600 font-bold">#{order.id}</span>
          </div>
          <p className="text-sm font-bold text-zinc-900 flex justify-between items-center">
            <span className="text-zinc-500 font-medium">Customer:</span> {order.userName}
          </p>
          <div className="text-sm border-y border-zinc-100 py-3 my-2">
            <span className="text-zinc-500 font-medium block mb-2">Plants Ordered:</span>
            <div className="flex flex-wrap gap-2">
              {order.items.map(item => (
                <span key={item.id} className="bg-white border border-zinc-200 px-2.5 py-1 rounded-xl text-[10px] font-bold text-zinc-700">
                  {item.name} × {item.quantity}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 font-medium text-sm">Total Paid:</span>
            <span className="text-xl font-black text-primary-dark">₹{order.totalCost}</span>
          </div>
        </div>
      </div>

      <div className="w-full space-y-4 mb-4 mt-auto shrink-0 pb-12">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleDownloadImage} className="bg-zinc-900 text-white font-bold py-4 rounded-2xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all w-full">
            <Download className="w-4 h-4" /> Save Photo
          </button>
          <button onClick={handleDownloadText} className="bg-white border border-zinc-200 text-zinc-700 font-bold py-4 rounded-2xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all w-full">
            <Download className="w-4 h-4 text-primary" /> Get Reciept
          </button>
        </div>
        <button
          onClick={onDone}
          className="w-full bg-emerald-950 text-white font-black py-5 rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-xs shadow-xl shadow-emerald-950/20"
        >
          Return to Dashboard
        </button>
      </div>
    </motion.div>
  );
}

function QRScannerScreen({ onScan }: { onScan: (id: string) => void }) {
  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="p-6 text-center">
        <h2 className="text-white text-xl font-bold mb-2 mt-4">Scan Order QR</h2>
        <p className="text-zinc-400 text-sm">Align the QR code within the frame to scan.</p>
      </div>
      <div className="flex-1 rounded-3xl overflow-hidden mx-4 mb-8 bg-black relative flex items-center justify-center">
        <Scanner
          onScan={(result) => {
            if (result && result.length > 0) {
              onScan(result[0].rawValue);
            }
          }}
          allowMultiple={false}
          styles={{ container: { width: '100%', height: '100%' } }}
        />
        <div className="absolute inset-0 border-4 border-primary/50 pointer-events-none rounded-3xl rounded-tl-[40px] rounded-br-[40px]"></div>
      </div>
      <div className="pb-24 px-6 text-center">
        <p className="text-xs text-zinc-500 mb-4">Or enter ID manually</p>
        <button
          onClick={() => {
            const id = prompt('Enter Order ID (e.g., GP1234)');
            if (id) onScan(id);
          }}
          className="bg-zinc-800 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          Enter ID
        </button>
      </div>
    </div>
  );
}

function OrderDetailsScreen({ orderId, orders, onMarkCollected }: { orderId: string, orders: Order[], onMarkCollected: (id: string) => void }) {
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-zinc-50">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">❌</span>
        </div>
        <h3 className="text-xl font-bold text-zinc-900">Order Not Found</h3>
        <p className="text-zinc-500 mt-2">Invalid QR Code or missing order ID.</p>
      </div>
    );
  }

  const totalPlants = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="h-full bg-zinc-50 p-6 flex flex-col overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 shadow-sm mb-6 mt-4">
        <div className="flex justify-between items-start mb-6 border-b border-zinc-100 pb-4">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Order ID</p>
            <p className="text-lg font-black text-zinc-900">{order.id}</p>
          </div>
          <div className="text-right">
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${order.status === 'Collected' ? 'bg-zinc-100 text-zinc-500' : 'bg-emerald-100 text-emerald-700'}`}>
              {order.status}
            </span>
            <p className="text-xs text-zinc-400 mt-2">{order.orderTime}</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-zinc-900">{order.userName}</p>
              <p className="text-xs text-zinc-500">{order.userId}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-50 rounded-2xl p-4 mb-6">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3">Order Items</p>
          <ul className="space-y-2">
            {order.items.map(item => (
              <li key={item.id} className="flex justify-between text-sm font-medium">
                <span className="text-zinc-700">{item.name} <span className="text-zinc-400 text-xs ml-1">x{item.quantity}</span></span>
              </li>
            ))}
          </ul>
          <div className="border-t border-zinc-200 mt-4 pt-3 flex justify-between">
            <span className="text-sm font-bold text-zinc-500">Total Plants: {totalPlants}</span>
            <span className="font-bold text-lg text-primary-dark">₹{order.totalCost}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto shrink-0 mb-8">
        <button
          onClick={() => onMarkCollected(order.id)}
          disabled={order.status === 'Collected'}
          className={`w-full font-bold py-4 rounded-2xl transition-all ${order.status === 'Collected'
            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border-2 border-zinc-100'
            : 'bg-emerald-950 text-white active:scale-95 shadow-xl shadow-emerald-950/20'
            }`}
        >
          {(() => {
            if (order.status === 'Ordered') return 'Move to Processing';
            if (order.status === 'Processing') return 'Mark as Delivered';
            if (order.status === 'Delivered') return 'Complete Order (Collected)';
            return 'Order Fully Completed';
          })()}
        </button>
      </div>
    </div>
  );
}
