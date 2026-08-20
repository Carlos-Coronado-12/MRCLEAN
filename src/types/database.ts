export type OrderStatus = 'received' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'partial';
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'pending';

export interface OrderItem {
  id?: string;
  order_id?: string;
  brand_model: string;
  service_name: string;
  price: number;
  before_photos: string[];
  after_photos: string[];
  created_at?: string;
}

export interface Order {
  id: string;
  order_number: string;
  public_token: string;
  customer_name: string;
  customer_phone: string;
  reception_date: string;
  estimated_delivery_date: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount: number;
  notes: string | null;
  ready_notification_sent: boolean;
  delivered_notification_sent: boolean;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface BusinessSettings {
  id?: string;
  send_delivered_whatsapp: boolean;
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
  whatsapp_business_account_id?: string;
  updated_at?: string;
}
