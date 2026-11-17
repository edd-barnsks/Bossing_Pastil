import type { CartItem, CustomerRecord, MenuItem, Order, OrderStatus, OrderType, Report, Role, StaffRecord, Summary, User } from './types';

export const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
// The production PHP build is served from /dist/ inside the XAMPP project.
// Vite development instead proxies /api to the PHP development server.
const endpoint = new URL(import.meta.env.PROD && !DEMO ? '../api/index.php' : 'api/index.php', document.baseURI).toString();
let csrf = '';

async function request<T>(route: string, method = 'GET', body?: unknown, query?: Record<string, string>): Promise<T> {
  const url = new URL(endpoint);
  url.searchParams.set('route', route);
  for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, value);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf } : {}) },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new Error('Cannot reach the PHP backend. Start the PHP server or follow the XAMPP setup in README.md.');
  }
  const payload = await res.json().catch(() => ({})) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${res.status})`);
  if (typeof payload.csrf === 'string') csrf = payload.csrf;
  return payload as T;
}

const demoMenu: MenuItem[] = [
  { menu_id: 1, food_name: 'Original Chicken Pastel', description: 'The comforting classic. Tender chicken, warm spices and our signature homemade goodness in every bite.', price: 100, category: 'Signature Jars', flavor: 'original', availability: true },
  { menu_id: 2, food_name: 'Spicy Chicken Pastel', description: 'Everything you love about the original, with a fiery little kick that keeps you coming back.', price: 100, category: 'Signature Jars', flavor: 'spicy', availability: true },
  { menu_id: 3, food_name: 'Garlic Chicken Pastel', description: 'A mellow, savory favorite with rich roasted garlic flavor and a seriously cozy finish.', price: 150, category: 'Signature Jars', flavor: 'garlic', availability: true },
  { menu_id: 4, food_name: 'Chili Garlic Chicken Pastel', description: 'Bold chili, beautiful garlic and our signature savory chicken. Made for flavor chasers.', price: 150, category: 'Signature Jars', flavor: 'chili-garlic', availability: true },
];

const getStored = <T>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem('bossing_' + key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
};
const setStored = <T>(key: string, value: T) => localStorage.setItem('bossing_' + key, JSON.stringify(value));
const timestamp = () => new Date().toISOString();
const yesterday = () => new Date(Date.now() - 86400000).toISOString();

function sampleOrder(id: number, name: string, status: OrderStatus, item: MenuItem, qty: number, date: string): Order {
  return { order_id: id, customer_id: id + 10, customer_name: name, contact_number: '09XX XXX XXXX', email: 'sample@example.com', order_date: date,
    order_type: id % 2 ? 'pickup' : 'delivery', delivery_address: id % 2 ? null : 'Sample delivery address', customer_note: null,
    payment_method: id % 2 ? 'cash_on_pickup' : 'cash_on_delivery', subtotal_amount: item.price * qty,
    delivery_fee: id % 2 ? 0 : 50, total_amount: item.price * qty + (id % 2 ? 0 : 50), order_status: status,
    items: [{ menu_id: item.menu_id, food_name: item.food_name, quantity: qty, unit_price: item.price, subtotal: item.price * qty }] };
}
const initialOrders: Order[] = [
  sampleOrder(1008, 'Mika Santos', 'pending', demoMenu[0], 2, timestamp()),
  sampleOrder(1007, 'Enzo Reyes', 'confirmed', demoMenu[1], 3, timestamp()),
  sampleOrder(1006, 'Jana Cruz', 'preparing', demoMenu[3], 1, timestamp()),
  sampleOrder(1005, 'Kyla Mendoza', 'completed', demoMenu[2], 4, yesterday()),
  sampleOrder(1004, 'Andre Flores', 'completed', demoMenu[0], 2, yesterday()),
];
const initialStaff: StaffRecord[] = [
  { admin_id: 1, username: 'admin', full_name: 'Bossing Admin', role: 'admin', is_active: true, created_at: timestamp() },
  { admin_id: 2, username: 'staff', full_name: 'Kitchen Staff', role: 'staff', is_active: true, created_at: timestamp() },
];

export const previewRole = (role: Role): User => {
  const user: User = role === 'customer'
    ? { id: 1, name: 'Alex Rivera', email: 'alex@example.com', role: 'customer', address: 'Davao City', contact_number: '09123456789' }
    : { id: role === 'admin' ? 1 : 2, name: role === 'admin' ? 'Bossing Admin' : 'Kitchen Staff', email: role === 'admin' ? 'admin' : 'staff', role };
  setStored('user', user);
  return user;
};

const demo = {
  async me() { return { user: getStored<User | null>('user', null), csrf: 'demo' }; },
  async login(identifier: string) { const user = { id: 1, name: identifier.split('@')[0], email: identifier, role: 'customer' as Role, address: '' }; setStored('user', user); return { user }; },
  async register(data: { customer_name: string; email: string; contact_number: string; address: string }) {
    const user: User = { id: 1, name: data.customer_name, email: data.email, contact_number: data.contact_number, address: data.address, role: 'customer' }; setStored('user', user); return { user };
  },
  async logout() { setStored('user', null); return { user: null }; },
  async menu(all = false) { return { items: getStored<MenuItem[]>('menu', demoMenu).filter(m => all || m.availability) }; },
  async settings() { return { delivery_fee: getStored<number>('fee', 50) }; },
  async updateSettings(delivery_fee: number) { setStored('fee', delivery_fee); return { delivery_fee }; },
  async placeOrder(body: { items: CartItem[]; order_type: OrderType; delivery_address?: string; customer_note?: string }) {
    const menu = getStored('menu', demoMenu);
    const user = getStored<User | null>('user', null);
    if (!user || user.role !== 'customer') throw new Error('Please sign in as a customer');
    const lines = body.items.map(item => {
      const found = menu.find(m => m.menu_id === item.menu_id && m.availability);
      if (!found) throw new Error('An item in your cart is unavailable');
      return { menu_id: found.menu_id, food_name: found.food_name, quantity: item.quantity, unit_price: found.price, subtotal: found.price * item.quantity };
    });
    const subtotal = lines.reduce((sum, row) => sum + row.subtotal, 0);
    const fee = body.order_type === 'delivery' ? getStored('fee', 50) : 0;
    const list = getStored<Order[]>('orders', initialOrders);
    const order_id = Math.max(...list.map(o => o.order_id), 1000) + 1;
    list.unshift({ order_id, customer_id: user.id, customer_name: user.name, contact_number: user.contact_number ?? '', email: user.email, order_date: timestamp(), order_type: body.order_type, delivery_address: body.delivery_address ?? null, customer_note: body.customer_note ?? null, payment_method: body.order_type === 'delivery' ? 'cash_on_delivery' : 'cash_on_pickup', subtotal_amount: subtotal, delivery_fee: fee, total_amount: subtotal + fee, order_status: 'pending', items: lines });
    setStored('orders', list);
    return { order_id, total_amount: subtotal + fee };
  },
  async orders() {
    const user = getStored<User | null>('user', null);
    const list = getStored<Order[]>('orders', initialOrders);
    return { orders: user?.role === 'customer' ? list.filter(o => o.customer_id === user.id && o.email === user.email) : list };
  },
  async updateStatus(order_id: number, order_status: OrderStatus) {
    const orders = getStored<Order[]>('orders', initialOrders).map(o => o.order_id === order_id ? { ...o, order_status } : o);
    setStored('orders', orders); return { ok: true };
  },
  async saveMenu(item: MenuItem) {
    const list = getStored('menu', demoMenu);
    const menu_id = item.menu_id || Math.max(...list.map(m => m.menu_id), 0) + 1;
    const match = list.findIndex(m => m.menu_id === menu_id);
    if (match < 0) list.push({ ...item, menu_id }); else list[match] = { ...item, menu_id };
    setStored('menu', list); return { menu_id };
  },
  async deleteMenu(menu_id: number) {
    setStored('menu', getStored('menu', demoMenu).map(m => m.menu_id === menu_id ? { ...m, availability: false } : m)); return { ok: true };
  },
  async summary() {
    const orders = getStored<Order[]>('orders', initialOrders);
    const completed = orders.filter(o => o.order_status === 'completed');
    const summary: Summary = { total_orders: orders.length, active_orders: orders.filter(o => ['pending','confirmed','preparing'].includes(o.order_status)).length, completed_orders: completed.length, total_revenue: completed.reduce((s,o)=>s+o.total_amount,0), today_revenue: completed.filter(o => o.order_date.slice(0,10) === new Date().toISOString().slice(0,10)).reduce((s,o)=>s+o.total_amount,0) };
    return { summary };
  },
  async reports() { return { reports: getStored<Report[]>('reports', []) }; },
  async generateReport(report_date: string) {
    const orders = getStored<Order[]>('orders', initialOrders).filter(o => o.order_status === 'completed' && o.order_date.slice(0,10) === report_date);
    const all = getStored<Report[]>('reports', []);
    const report: Report = { report_id: Math.max(0,...all.map(r=>r.report_id))+1, report_date, total_orders: orders.length, total_sales: orders.reduce((s,o)=>s+o.total_amount,0), generated_by_name: getStored<User | null>('user', null)?.name ?? 'Admin', created_at: timestamp() };
    setStored('reports', [report, ...all.filter(r=>r.report_date !== report_date)]); return { ok: true };
  },
  async users() { return { customers: [{ customer_id: 1, customer_name: 'Alex Rivera', email: 'alex@example.com', contact_number: '09123456789', created_at: timestamp() }] as CustomerRecord[], staff: getStored<StaffRecord[]>('staff', initialStaff) }; },
  async addStaff(data: { username: string; full_name: string; role: 'staff'|'admin'; password: string }) {
    const list = getStored<StaffRecord[]>('staff', initialStaff);
    const admin_id = Math.max(2,...list.map(u=>u.admin_id)) + 1;
    setStored('staff', [...list, { admin_id, username: data.username, full_name: data.full_name, role: data.role, is_active: true, created_at: timestamp() }]); return { admin_id };
  },
  async changeStaff(admin_id: number, role: 'staff'|'admin', is_active: boolean) { setStored('staff', getStored<StaffRecord[]>('staff', initialStaff).map(u=>u.admin_id === admin_id ? { ...u, role, is_active } : u)); return { ok: true }; },
};

export const api = {
  me: () => DEMO ? demo.me() : request<{ user: User | null; csrf: string }>('auth/me'),
  login: (identifier: string, password: string) => DEMO ? demo.login(identifier) : request<{ user: User }>('auth/login','POST',{ identifier, password }),
  register: (data: { customer_name: string; email: string; contact_number: string; address: string; password: string }) => DEMO ? demo.register(data) : request<{ user: User }>('auth/register','POST',data),
  logout: () => DEMO ? demo.logout() : request<{ user: null }>('auth/logout','POST'),
  menu: (all = false) => DEMO ? demo.menu(all) : request<{ items: MenuItem[] }>('menu','GET',undefined,all?{all:'1'}:{}),
  settings: () => DEMO ? demo.settings() : request<{ delivery_fee: number }>('settings'),
  updateSettings: (delivery_fee: number) => DEMO ? demo.updateSettings(delivery_fee) : request<{ delivery_fee: number }>('settings','PATCH',{delivery_fee}),
  placeOrder: (body: { items: CartItem[]; order_type: OrderType; delivery_address?: string; customer_note?: string }) => DEMO ? demo.placeOrder(body) : request<{ order_id: number; total_amount: number }>('orders','POST',body),
  orders: () => DEMO ? demo.orders() : request<{ orders: Order[] }>('orders'),
  updateStatus: (order_id: number, order_status: OrderStatus) => DEMO ? demo.updateStatus(order_id,order_status) : request<{ok:boolean}>('orders/status','PATCH',{order_id,order_status}),
  saveMenu: (item: MenuItem) => DEMO ? demo.saveMenu(item) : request<{menu_id:number}>('menu',item.menu_id?'PUT':'POST',item),
  deleteMenu: (menu_id: number) => DEMO ? demo.deleteMenu(menu_id) : request<{ok:boolean}>('menu','DELETE',{menu_id}),
  summary: () => DEMO ? demo.summary() : request<{summary:Summary}>('dashboard/summary'),
  reports: () => DEMO ? demo.reports() : request<{reports:Report[]}>('reports'),
  generateReport: (report_date: string) => DEMO ? demo.generateReport(report_date) : request<{ok:boolean}>('reports/generate','POST',{report_date}),
  users: () => DEMO ? demo.users() : request<{customers:CustomerRecord[];staff:StaffRecord[]}>('users'),
  addStaff: (data: { username: string; full_name: string; role: 'staff'|'admin'; password: string }) => DEMO ? demo.addStaff(data) : request<{admin_id:number}>('users/staff','POST',data),
  changeStaff: (admin_id: number, role: 'staff'|'admin', is_active: boolean) => DEMO ? demo.changeStaff(admin_id,role,is_active) : request<{ok:boolean}>('users/staff','PATCH',{admin_id,role,is_active}),
};
