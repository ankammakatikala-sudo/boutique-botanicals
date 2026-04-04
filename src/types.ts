export interface Plant {
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
}

export interface CartItem extends Plant {
  quantity: number;
}
export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: CartItem[];
  totalCost: number;
  orderTime: string;
  status: 'Ordered' | 'Processing' | 'Delivered' | 'Collected';
  encryptedData?: string;
}

export type Screen = 'splash' | 'auth' | 'home' | 'shop' | 'cart' | 'profile' | 'liked' | 'change-password' | 'change-name' | 'order-qr' | 'qr-scanner' | 'order-details';
