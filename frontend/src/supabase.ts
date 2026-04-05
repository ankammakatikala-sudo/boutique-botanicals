/**
 * API wrapper — all calls go through our backend.
 * No Supabase credentials are stored or exposed here.
 */
const API_URL = import.meta.env.VITE_API_URL || '';

const fetchJson = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'API request failed');
  return json;
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const data = await fetchJson(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
    return data.exists;
  } catch {
    return false;
  }
};

export const registerUser = async (username: string, email: string, password: string) => {
  const data = await fetchJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  return { uid: data.user?.id, username: data.username, email: data.user?.email };
};

export const loginUser = async (email: string, password: string) => {
  const data = await fetchJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { uid: data.user?.id, email: data.user?.email, username: data.profile?.username };
};

export const updateUserPassword = async (_email: string, newPassword: string) => {
  await fetchJson('/api/auth/update-password', {
    method: 'POST',
    body: JSON.stringify({ password: newPassword }),
  });
};

export const updateUserName = async (userId: string, newName: string) => {
  await fetchJson('/api/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify({ userId, username: newName }),
  });
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export const saveOrder = async (order: any) => {
  await fetchJson('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      id: order.id,
      user_id: order.userId,
      total: order.totalCost,
      status: order.status,
    }),
  });
};

export const loadUserOrders = async (userEmail: string) => {
  const data = await fetchJson(`/api/orders/user/${encodeURIComponent(userEmail)}`);
  return data;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  await fetchJson(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

// Polling-based subscription — replaces Supabase realtime (keys stay on backend)
export const subscribeToUserOrders = (
  userEmail: string,
  callback: (orders: any[]) => void
): { unsubscribe: () => void } => {
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const orders = await loadUserOrders(userEmail);
      callback(orders);
    } catch (e) {
      console.warn('Order poll error:', e);
    }
    if (active) setTimeout(poll, 10000);
  };

  poll(); // initial fetch immediately
  return { unsubscribe: () => { active = false; } };
};

// Dummy export to satisfy any stray import of `supabase`
export const supabase = null;
