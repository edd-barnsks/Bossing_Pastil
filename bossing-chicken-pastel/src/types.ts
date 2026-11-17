export type Role = 'customer' | 'staff' | 'admin';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type OrderType = 'pickup' | 'delivery';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  address?: string | null;
  contact_number?: string;
}
export interface MenuItem {
  menu_id: number;
  food_name: string;
  description: string;
  price: number;
  category: string;
  flavor: 'original' | 'spicy' | 'garlic' | 'chili-garlic';
  availability: boolean;
}
export interface CartItem { menu_id: number; quantity: number }
export interface OrderLine {
  menu_id: number;
  food_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}
export interface Order {
  order_id: number;
  customer_id: number;
  customer_name: string;
  contact_number: string;
  email: string;
  order_date: string;
  order_type: OrderType;
  delivery_address: string | null;
  customer_note: string | null;
  payment_method: string;
  subtotal_amount: number;
  delivery_fee: number;
  total_amount: number;
  order_status: OrderStatus;
  items: OrderLine[];
}
export interface Summary {
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  total_revenue: number;
  today_revenue: number;
}
export interface Report {
  report_id: number;
  report_date: string;
  total_orders: number;
  total_sales: number;
  generated_by_name: string;
  created_at: string;
}
export interface CustomerRecord { customer_id: number; customer_name: string; email: string; contact_number: string; created_at: string }
export interface StaffRecord { admin_id: number; username: string; full_name: string; role: 'staff' | 'admin'; is_active: boolean; created_at: string }

export const money = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n);
export const dateLabel = (date: string) => new Date(date.replace(' ', 'T')).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const statuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];
export const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'completed' };
