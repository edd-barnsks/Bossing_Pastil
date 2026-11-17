import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChefHat, CircleHelp, Clock3, CreditCard, Flame, Heart, LayoutDashboard, LogOut, MapPin, Menu as MenuIcon, Minus, PackageCheck, Plus, Search, Settings, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Star, Trash2, Truck, UserRound, Users, UtensilsCrossed, X } from 'lucide-react';
import { api, DEMO, previewRole } from './api';
import { dateLabel, money, nextStatus, statuses, type CartItem, type CustomerRecord, type MenuItem, type Order, type OrderStatus, type OrderType, type Report, type StaffRecord, type Summary, type User } from './types';

type Page = 'home' | 'menu' | 'orders' | 'dashboard';
type DashTab = 'overview' | 'orders' | 'menu' | 'reports' | 'users' | 'settings';
const blankMenu: MenuItem = { menu_id: 0, food_name: '', description: '', price: 100, category: 'Signature Jars', flavor: 'original', availability: true };
const flavorColors: Record<MenuItem['flavor'], { deep: string; medium: string; pale: string; label: string }> = {
  original: { deep: '#b75b32', medium: '#d38c45', pale: '#f1d6a7', label: 'ORIGINAL' },
  spicy: { deep: '#b93d24', medium: '#e16c31', pale: '#f4b866', label: 'SPICY' },
  garlic: { deep: '#a5813c', medium: '#d9af65', pale: '#f4e3ac', label: 'GARLIC' },
  'chili-garlic': { deep: '#8a342d', medium: '#c45d34', pale: '#eab477', label: 'CHILI GARLIC' },
};

function Jar({ flavor = 'original', size = 'normal' }: { flavor?: MenuItem['flavor']; size?: 'normal' | 'large' | 'mini' }) {
  const c = flavorColors[flavor];
  return <svg className={`jar jar-${size}`} viewBox="0 0 280 345" fill="none" role="img" aria-label={`${c.label.toLowerCase()} chicken pastel jar illustration`}>
    <defs>
      <linearGradient id={`glass-${flavor}`} x1="65" y1="0" x2="230" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#fff6df" stopOpacity=".93" /><stop offset=".27" stopColor="#d79a5b" stopOpacity=".52" /><stop offset=".8" stopColor={c.medium} stopOpacity=".83" /><stop offset="1" stopColor="#f5dba4" stopOpacity=".8" /></linearGradient>
      <linearGradient id={`lid-${flavor}`} x1="50" y1="50" x2="230" y2="75" gradientUnits="userSpaceOnUse"><stop stopColor="#1e2721"/><stop offset=".55" stopColor="#454c3a"/><stop offset="1" stopColor="#171e18"/></linearGradient>
    </defs>
    <ellipse cx="145" cy="321" rx="94" ry="10" fill="#49351d" opacity=".11"/>
    <path d="M63 80 Q61 68 78 63 L210 63 Q228 67 226 80 L221 280 Q219 307 194 311 L91 311 Q65 305 64 281 Z" fill={`url(#glass-${flavor})`} stroke="#c89c67" strokeWidth="2"/>
    <path d="M74 115 L215 115 L210 278 Q207 298 192 300 L94 300 Q78 294 77 279 Z" fill={c.deep} opacity=".79"/>
    {Array.from({ length: 24 }, (_, i) => <ellipse key={i} cx={90 + (i % 6) * 22 + (i % 2) * 4} cy={136 + Math.floor(i / 6) * 37} rx={4 + i % 3} ry={2 + i % 2} fill={i % 4 === 0 ? '#e8bf6d' : i % 3 === 0 ? '#566b35' : c.pale} opacity={i % 3 === 0 ? '.9' : '.67'} transform={`rotate(${i * 18} ${90 + (i % 6) * 22} ${136 + Math.floor(i / 6) * 37})`}/>)}
    <path d="M77 91 L82 293" stroke="#fff8e4" opacity=".52" strokeWidth="10" strokeLinecap="round"/>
    <path d="M206 106 L201 288" stroke="#6a2b1f" opacity=".15" strokeWidth="9" strokeLinecap="round"/>
    <path d="M71 173 Q145 168 220 173 L218 255 Q144 263 69 255 Z" fill="#fdf7eb"/>
    <path d="M71 173 Q145 170 220 173" stroke="#e7d8be" strokeWidth="2"/>
    <circle cx="145" cy="205" r="25" fill="#243a30"/>
    <path d="M130 201 Q136 190 143 201 Q150 191 158 202 M131 211 Q145 220 159 209" stroke="#fbf3df" strokeWidth="3" strokeLinecap="round"/>
    <text x="145" y="242" textAnchor="middle" fontSize="14" fontFamily="Arial, sans-serif" fontWeight="900" fill="#29392e">BOSSING</text>
    <text x="145" y="250" textAnchor="middle" fontSize="5" letterSpacing="2.5" fontFamily="Arial, sans-serif" fill="#29392e">CHICKEN PASTEL</text>
    <text x="145" y="264" textAnchor="middle" fontSize="9" fontFamily="Arial, sans-serif" fontWeight="900" fill={c.deep}>{c.label}</text>
    <rect x="71" y="52" width="147" height="35" rx="9" fill={`url(#lid-${flavor})`}/>
    <ellipse cx="144" cy="52" rx="74" ry="13" fill="#26342a"/>
    <ellipse cx="144" cy="51" rx="60" ry="8" stroke="#64705b" strokeWidth="2" opacity=".8"/>
    <path d="M75 79 H215" stroke="#76816e" strokeWidth="2" opacity=".65"/>
  </svg>;
}

function Brand({ onClick, light = false }: { onClick: () => void; light?: boolean }) {
  return <button type="button" className={`brand ${light ? 'brand-light' : ''}`} onClick={onClick} aria-label="Go to Bossing Chicken Pastel home">
    <span className="brand-mark"><ChefHat size={24} strokeWidth={2.6} /><span className="mark-eyes">••</span></span>
    <span className="brand-words"><strong>BOSSING</strong><small>CHICKEN PASTEL</small></span>
  </button>;
}

function StatusBadge({ status }: { status: OrderStatus }) { return <span className={`status status-${status}`}><span className="status-dot" />{status === 'preparing' ? 'Preparing' : status[0].toUpperCase() + status.slice(1)}</span>; }

function OrderCard({ order, staff = false, busy = false, onAdvance, onCancel }: { order: Order; staff?: boolean; busy?: boolean; onAdvance?: (id:number, status:OrderStatus)=>void; onCancel?: (id:number)=>void }) {
  const next = nextStatus[order.order_status];
  return <article className="order-card">
    <div className="order-topline"><div><span className="eyebrow muted">ORDER #{order.order_id}</span><h3>{staff ? order.customer_name : 'Your delicious order'}</h3><span className="order-date">{dateLabel(order.order_date)}</span></div><StatusBadge status={order.order_status} /></div>
    <div className="order-body">
      <div className="order-lines">{order.items.map((line) => <div key={line.menu_id} className="order-line"><span>{line.quantity}× {line.food_name}</span><strong>{money(line.subtotal)}</strong></div>)}</div>
      <div className="order-meta"><span>{order.order_type === 'delivery' ? <Truck size={15}/> : <ShoppingBag size={15}/>} {order.order_type === 'delivery' ? 'Delivery' : 'Pick-up'}</span>{staff && <span>{order.contact_number}</span>}{order.delivery_address && <span><MapPin size={15}/>{order.delivery_address}</span>}</div>
      {order.customer_note && <p className="order-note">Note: {order.customer_note}</p>}
    </div>
    <div className="order-bottom"><strong>Total <span>{money(order.total_amount)}</span></strong>{staff && next && <button disabled={busy} className="btn btn-dark btn-small" onClick={()=>onAdvance?.(order.order_id,next)}>Mark {next === 'completed' ? 'completed' : next} <ArrowRight size={15}/></button>}</div>
    {staff && next && <button className="subtle-action" disabled={busy} onClick={()=>onCancel?.(order.order_id)}>Cancel this order</button>}
    {!staff && order.order_status !== 'cancelled' && <div className="status-progress">{statuses.map((status,index) => <div key={status} title={status} className={`progress-segment ${statuses.indexOf(order.order_status) >= index ? 'filled' : ''}`}/>)}</div>}
  </article>;
}

function ProductCard({ item, onAdd, onSelect }: { item: MenuItem; onAdd: (id:number)=>void; onSelect: (item:MenuItem)=>void }) {
  return <article className="product-card">
    <button className={`product-art product-${item.flavor}`} onClick={()=>onSelect(item)} aria-label={`View ${item.food_name}`}><span className="product-art-glow"/><Jar flavor={item.flavor} /><span className="product-art-stamp"><Star size={13} fill="currentColor"/> HOME FAVORITE</span></button>
    <div className="product-info"><div className="product-info-head"><div><span className="product-category">{item.category}</span><h3>{item.food_name}</h3></div><strong className="product-price">{money(item.price)}</strong></div><p>{item.description}</p><button className="add-btn" onClick={()=>onAdd(item.menu_id)}><Plus size={17}/> Add to cart <ArrowUpRight size={17}/></button></div>
  </article>;
}

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [dashTab, setDashTab] = useState<DashTab>('overview');
  const [user, setUser] = useState<User | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem('bossing_cart') || '[]') as CartItem[]; } catch { return []; } });
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login'|'register'>('login');
  const [product, setProduct] = useState<MenuItem | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(50);
  const [fulfillment, setFulfillment] = useState<OrderType>('pickup');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [editMenu, setEditMenu] = useState<MenuItem | null>(null);
  const [addStaff, setAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({ username:'', full_name:'', role:'staff' as 'staff'|'admin', password:'' });
  const [feeInput, setFeeInput] = useState('50');
  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [authForm, setAuthForm] = useState({ identifier:'', password:'', name:'', phone:'', email:'', address:'' });

  function flash(message: string) { setToast(message); window.setTimeout(()=>setToast(''), 4000); }
  function go(next: Page) { setPage(next); setMobileNav(false); window.scrollTo({top:0,behavior:'smooth'}); }
  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([api.me(), api.menu(), api.settings()]).then(results => {
      if (cancelled) return;
      const [auth, menu, settings] = results;
      if (auth.status === 'fulfilled') { setUser(auth.value.user); setAddress(auth.value.user?.address ?? ''); }
      if (menu.status === 'fulfilled') setMenuItems(menu.value.items);
      if (settings.status === 'fulfilled') { setDeliveryFee(settings.value.delivery_fee); setFeeInput(String(settings.value.delivery_fee)); }
      const failed = results.find(r=>r.status === 'rejected');
      if (failed && failed.status === 'rejected') setError(failed.reason instanceof Error ? failed.reason.message : 'Could not load the server');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(()=>localStorage.setItem('bossing_cart', JSON.stringify(cart)), [cart]);
  useEffect(() => { if (page === 'orders' && user) void loadOrders(); if (page === 'dashboard' && isStaff) void loadDashboard(); }, [page, user?.id, user?.role, dashTab]);

  const cartDetails = useMemo(()=>cart.map(line=>({item:menuItems.find(m=>m.menu_id===line.menu_id),quantity:line.quantity})).filter((line):line is {item:MenuItem;quantity:number}=>!!line.item),[cart,menuItems]);
  const subtotal = cartDetails.reduce((s,x)=>s + x.item.price * x.quantity,0);
  const cartCount = cart.reduce((s,x)=>s+x.quantity,0);
  const total = subtotal + (fulfillment === 'delivery' && cartCount ? deliveryFee : 0);
  const visibleProducts = menuItems.filter(m=>m.availability && [m.food_name,m.category,m.description].join(' ').toLowerCase().includes(search.toLowerCase()));

  async function loadOrders() { try { const data = await api.orders(); setOrders(data.orders); } catch(e) { flash((e as Error).message); } }
  async function loadDashboard() {
    try {
      const [orderData,summaryData,menuData,reportData] = await Promise.all([api.orders(),api.summary(),api.menu(true),api.reports()]);
      setOrders(orderData.orders); setSummary(summaryData.summary); setMenuItems(menuData.items); setReports(reportData.reports);
      if (user?.role === 'admin') { const users = await api.users(); setCustomers(users.customers); setStaffList(users.staff); }
    } catch(e) { flash((e as Error).message); }
  }
  function addToCart(id: number) {
    const item = menuItems.find(m=>m.menu_id===id);
    if (!item || !item.availability) return;
    setCart(previous=>{
      const present = previous.find(m=>m.menu_id===id);
      return present ? previous.map(m=>m.menu_id===id?{...m,quantity:Math.min(m.quantity+1,30)}:m) : [...previous,{menu_id:id,quantity:1}];
    });
    flash(`${item.food_name} added to your bag`);
  }
  function setQuantity(id:number, delta:number) { setCart(previous=>previous.map(m=>m.menu_id===id?{...m,quantity:m.quantity+delta}:m).filter(m=>m.quantity>0)); }
  async function submitAuth(event:FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      if (authMode==='login') {
        if (!authForm.identifier || !authForm.password) throw new Error('Enter your email/username and password');
        const {user:loggedIn} = await api.login(authForm.identifier,authForm.password); setUser(loggedIn); setAddress(loggedIn.address??'');
        flash(`Welcome back, ${loggedIn.name.split(' ')[0]}!`);
        if (loggedIn.role !== 'customer') go('dashboard');
      } else {
        if (authForm.password.length < 8) throw new Error('Your password must be at least 8 characters');
        const {user:registered} = await api.register({ customer_name:authForm.name, email:authForm.email,contact_number:authForm.phone,address:authForm.address,password:authForm.password });
        setUser(registered); setAddress(registered.address ?? ''); flash('Account created. Welcome to Bossing!');
      }
      setAuthOpen(false); setAuthForm({identifier:'',password:'',name:'',phone:'',email:'',address:''});
    } catch(e) { flash((e as Error).message); } finally { setBusy(false); }
  }
  function tryPreview(role: User['role']) { const next=previewRole(role); setUser(next); setAddress(next.address??''); setAuthOpen(false); flash(`Viewing ${role} preview`); if (role !== 'customer') go('dashboard'); }
  async function signOut() { try { await api.logout(); setUser(null); setOrders([]); setCartOpen(false); go('home'); flash('You have signed out'); } catch(e) { flash((e as Error).message); } }
  async function placeOrder() {
    if (!user) { setCartOpen(false); setAuthMode('login'); setAuthOpen(true); flash('Sign in first to place your order'); return; }
    if (user.role !== 'customer') { flash('Switch to a customer account to order'); return; }
    if (!cartDetails.length) return;
    if (fulfillment==='delivery' && !address.trim()) { flash('Please enter a delivery address'); return; }
    setBusy(true);
    try {
      const result = await api.placeOrder({ items:cart, order_type:fulfillment, delivery_address:fulfillment==='delivery'?address:undefined, customer_note:note });
      setCart([]); setCartOpen(false); setNote(''); go('orders'); flash(`Order #${result.order_id} placed! Total ${money(result.total_amount)}`);
      await loadOrders();
    } catch(e) { flash((e as Error).message); } finally { setBusy(false); }
  }
  async function advance(id:number,status:OrderStatus) { setBusy(true); try { await api.updateStatus(id,status); flash(`Order #${id} moved to ${status}`); await loadDashboard(); } catch(e) { flash((e as Error).message); } finally { setBusy(false); } }
  async function saveProduct(event:FormEvent) {
    event.preventDefault(); if (!editMenu) return; setBusy(true);
    try { await api.saveMenu(editMenu); setEditMenu(null); flash('Menu item saved'); await loadDashboard(); } catch(e) { flash((e as Error).message); } finally { setBusy(false); }
  }
  async function deleteProduct(id:number) { if (!window.confirm('Mark this item unavailable? Existing orders will be preserved.')) return; try { await api.deleteMenu(id); flash('Item marked unavailable'); await loadDashboard(); } catch(e) { flash((e as Error).message); } }
  async function generateReport() { setBusy(true); try { await api.generateReport(reportDate); flash('Sales report generated'); await loadDashboard(); } catch(e) { flash((e as Error).message); } finally { setBusy(false); } }
  async function saveFee(event:FormEvent) { event.preventDefault(); setBusy(true); try { const result=await api.updateSettings(Number(feeInput)); setDeliveryFee(result.delivery_fee); flash('Delivery fee updated'); } catch(e){ flash((e as Error).message); } finally { setBusy(false); } }
  async function createStaff(event:FormEvent) { event.preventDefault(); setBusy(true); try { await api.addStaff(staffForm); setAddStaff(false);setStaffForm({username:'',full_name:'',role:'staff',password:''});flash('Staff account created'); await loadDashboard(); } catch(e){ flash((e as Error).message); } finally { setBusy(false); } }
  async function changeStaff(record:StaffRecord, changes:Partial<StaffRecord>) { try { await api.changeStaff(record.admin_id, changes.role??record.role, changes.is_active??Boolean(record.is_active));flash('Staff account updated'); await loadDashboard(); } catch(e){ flash((e as Error).message); } }

  return <div className="app-shell">
    {DEMO && <div className="demo-banner"><Sparkles size={13}/> Interactive preview — orders and changes are saved in this browser. PHP/MySQL source is included in the project.</div>}
    <header className="site-header"><div className="header-inner"><Brand onClick={()=>go('home')}/>
      <nav className={`main-nav ${mobileNav?'nav-open':''}`} aria-label="Primary navigation">
        <button className={page==='home'?'active':''} onClick={()=>go('home')}>Home</button>
        <button className={page==='menu'?'active':''} onClick={()=>go('menu')}>Our menu</button>
        {user?.role==='customer' && <button className={page==='orders'?'active':''} onClick={()=>go('orders')}>My orders</button>}
        {isStaff && <button className={page==='dashboard'?'active':''} onClick={()=>go('dashboard')}>Dashboard</button>}
      </nav>
      <div className="header-actions">{user ? <div className="account-wrap"><span className="hello-name">Hi, {user.name.split(' ')[0]}</span><button className="icon-btn signout-btn" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={19}/></button></div> : <button className="sign-in" onClick={()=>{setAuthMode('login');setAuthOpen(true);}}>Log in <ArrowUpRight size={16}/></button>}
        <button className="bag-button" onClick={()=>setCartOpen(true)} aria-label={`Open bag with ${cartCount} items`}><ShoppingBag size={19}/>{cartCount>0&&<span>{cartCount}</span>}</button><button className="mobile-menu-btn icon-btn" aria-label="Toggle navigation" onClick={()=>setMobileNav(!mobileNav)}>{mobileNav?<X size={22}/>:<MenuIcon size={22}/>}</button></div>
    </div></header>

    {error && <div className="connection-error"><CircleHelp size={17}/>{error}<button aria-label="Dismiss" onClick={()=>setError('')}><X size={16}/></button></div>}
    {loading ? <div className="loading-screen"><span className="loading-spinner"/><h2>Warming up the kitchen…</h2></div> : <>
      {page==='home' && <main>
        <section className="hero container"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> THE TASTE OF HOME, IN A JAR</div><h1>Good food.<br/><span>Great</span> mood.<br/>Bossing-style.</h1><p>Big comfort, bold flavors, and that homemade goodness you crave. Meet your next favorite chicken pastel.</p><div className="hero-cta"><button className="btn btn-dark" onClick={()=>go('menu')}>Explore our menu <ArrowUpRight size={19}/></button><button className="btn btn-ghost" onClick={()=>document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth'})}>How it works <ArrowRight size={17}/></button></div><div className="hero-proof"><div className="proof-avatars"><span>J</span><span>M</span><span>K</span><span>+</span></div><div><div className="stars">★★★★★</div><small>Made for your comfort food cravings</small></div></div></div>
          <div className="hero-art"><div className="hero-arch"/><div className="hero-orbit orbit-one">100%<br/><small>comfort</small></div><div className="hero-orbit orbit-two"><Heart size={18} fill="currentColor"/> made with love</div><div className="hero-jar hero-jar-left"><Jar flavor="spicy" size="large"/></div><div className="hero-jar hero-jar-main"><Jar flavor="original" size="large"/></div><div className="hero-shadow"/><span className="hero-art-caption">YOUR NEW PANTRY FAVORITE <ArrowUpRight size={14}/></span></div></section>
        <section className="marquee"><div>HOMEMADE GOODNESS <span>✳</span> MADE WITH LOVE <span>✳</span> YOUR CRAVINGS, SORTED <span>✳</span> HOMEMADE GOODNESS <span>✳</span> MADE WITH LOVE <span>✳</span></div></section>
        <section className="featured container"><div className="section-head"><div><span className="eyebrow muted">BOSSING'S PICKS</span><h2>A jar for <em>every</em> craving.</h2></div><button className="text-link" onClick={()=>go('menu')}>See the full menu <ArrowUpRight size={19}/></button></div><div className="products-grid">{visibleProducts.slice(0,4).map(item=><ProductCard key={item.menu_id} item={item} onAdd={addToCart} onSelect={setProduct}/>)}</div></section>
        <section className="story-band" id="how-it-works"><div className="container story-layout"><div className="story-visual"><div className="story-burst">GOOD FOOD<br/>GOOD TIMES <span>✳</span></div><Jar flavor="garlic" size="large"/><div className="story-tape">Made with heart. Packed with flavor.</div></div><div className="story-copy"><span className="eyebrow">A LITTLE LOVE IN EVERY BITE</span><h2>Comfort food,<br/><em>the Bossing way.</em></h2><p>Some meals just feel like home. We take that feeling and pack it into our delicious chicken pastel, ready whenever cravings hit.</p><div className="three-steps"><div><span>01</span><strong>Pick your favorite</strong><small>Discover a flavor that speaks to you.</small></div><div><span>02</span><strong>Place your order</strong><small>Choose easy pickup or delivery.</small></div><div><span>03</span><strong>Enjoy every bite</strong><small>Comfort food is on its way.</small></div></div><button className="btn btn-dark" onClick={()=>go('menu')}>Order your favorites <ArrowUpRight size={19}/></button></div></div></section>
        <section className="bottom-cta container"><div><span className="eyebrow">HUNGRY YET?</span><h2>Your next good meal<br/>is just a click away.</h2><p>Something delicious is waiting for you.</p></div><button className="btn btn-cream" onClick={()=>go('menu')}>Let's order <ArrowUpRight size={19}/></button><span className="cta-spark">✳</span></section>
      </main>}

      {page==='menu' && <main className="page-main container"><div className="page-intro"><span className="eyebrow muted">THE GOOD STUFF</span><h1>What's cooking, <em>Bossing?</em></h1><p>Choose your favorite flavor and add some happiness to your bag.</p></div><div className="menu-tools"><label className="search-field"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search for something delicious…" aria-label="Search menu"/></label><span className="menu-counter"><SlidersHorizontal size={17}/>{visibleProducts.length} flavors available</span></div><div className="products-grid menu-grid">{visibleProducts.map(item=><ProductCard key={item.menu_id} item={item} onAdd={addToCart} onSelect={setProduct}/>)}</div>{!visibleProducts.length&&<div className="empty-state"><Search size={36}/><h3>No delicious matches</h3><p>Try another search or check back soon.</p><button className="btn btn-dark" onClick={()=>setSearch('')}>Clear search</button></div>}</main>}

      {page==='orders' && <main className="page-main container"><div className="page-intro intro-with-action"><div><span className="eyebrow muted">YOUR LITTLE FOOD DIARY</span><h1>My <em>orders.</em></h1><p>All your orders, from first craving to the last bite.</p></div><button className="btn btn-dark" onClick={()=>go('menu')}>Order again <ArrowUpRight size={18}/></button></div><div className="order-list">{orders.map(order=><OrderCard key={order.order_id} order={order}/>)}</div>{!orders.length&&<div className="empty-state"><PackageCheck size={42}/><h3>No orders yet</h3><p>Your first Bossing favorite is just a few clicks away.</p><button className="btn btn-dark" onClick={()=>go('menu')}>Browse our menu <ArrowUpRight size={17}/></button></div>}</main>}

      {page==='dashboard' && isStaff && <main className="dashboard"><aside className="dashboard-sidebar"><div className="dash-sidebar-caption">WORKSPACE</div>{([['overview','LayoutDashboard','Overview'],['orders','ShoppingBag','Orders'],['menu','UtensilsCrossed','Menu items'],['reports','CreditCard','Sales reports'],...(user?.role==='admin'?[['users','Users','Accounts'],['settings','Settings','Settings']]:[])] as string[][]).map(([key,icon,label])=><button key={key} className={dashTab===key?'selected':''} onClick={()=>setDashTab(key as DashTab)}>{icon==='LayoutDashboard'?<LayoutDashboard size={19}/>:icon==='ShoppingBag'?<ShoppingBag size={19}/>:icon==='UtensilsCrossed'?<UtensilsCrossed size={19}/>:icon==='CreditCard'?<CreditCard size={19}/>:icon==='Users'?<Users size={19}/>:<Settings size={19}/>} {label}</button>)}<div className="sidebar-foot"><ShieldCheck size={18}/> {user.role === 'admin' ? 'Administrator access' : 'Staff access'}</div></aside>
        <div className="dashboard-content"><div className="dash-heading"><div><span className="eyebrow muted">BOSSING CONTROL CENTER</span><h1>{dashTab==='overview'?'Good day, Bossing!':dashTab==='orders'?'Order queue':dashTab==='menu'?'Menu management':dashTab==='reports'?'Sales reports':dashTab==='users'?'User accounts':'Store settings'}</h1><p>{dashTab==='overview'?'Here’s what’s happening in the kitchen.':dashTab==='orders'?'Keep every order moving.':dashTab==='menu'?'Update the flavors your customers see.':dashTab==='reports'?'Track your completed sales by date.':dashTab==='users'?'Manage staff access and view customers.':'Adjust your store preferences.'}</p></div><span className="dash-date"><Clock3 size={15}/>{new Date().toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</span></div>
          {dashTab==='overview' && <><div className="stat-grid"><div className="stat-card"><span>All orders <ShoppingBag size={18}/></span><strong>{summary?.total_orders??0}</strong><small>Received so far</small></div><div className="stat-card"><span>In progress <Clock3 size={18}/></span><strong>{summary?.active_orders??0}</strong><small>Awaiting completion</small></div><div className="stat-card"><span>Completed <CheckCircle2 size={18}/></span><strong>{summary?.completed_orders??0}</strong><small>Happy customers</small></div><div className="stat-card stat-card-highlight"><span>Total sales <ArrowUpRight size={18}/></span><strong>{money(summary?.total_revenue??0)}</strong><small>Completed orders only</small></div></div><div className="dash-section-head"><h2>Orders needing attention</h2><button className="text-link" onClick={()=>setDashTab('orders')}>All orders <ArrowRight size={17}/></button></div><div className="dashboard-order-grid">{orders.filter(o=>!['completed','cancelled'].includes(o.order_status)).slice(0,4).map(order=><OrderCard key={order.order_id} order={order} staff busy={busy} onAdvance={advance} onCancel={id=>advance(id,'cancelled')}/>)}</div>{orders.every(o=>['completed','cancelled'].includes(o.order_status))&&<div className="empty-state compact"><CheckCircle2 size={30}/><h3>All caught up!</h3><p>New orders will appear here.</p></div>}</>}
          {dashTab==='orders' && <><div className="dash-section-head"><h2>Orders ({orders.length})</h2><button className="text-link" onClick={loadDashboard}>Refresh queue <ArrowRight size={17}/></button></div><div className="dashboard-order-grid">{orders.map(order=><OrderCard key={order.order_id} order={order} staff busy={busy} onAdvance={advance} onCancel={id=>advance(id,'cancelled')}/>)}</div>{!orders.length&&<div className="empty-state compact"><ShoppingBag size={35}/><h3>No orders in the queue</h3></div>}</>}
          {dashTab==='menu' && <><div className="dash-section-head"><h2>Products ({menuItems.length})</h2><button className="btn btn-dark btn-small" onClick={()=>setEditMenu({...blankMenu})}><Plus size={17}/> Add product</button></div><div className="manage-products">{menuItems.map(item=><div className="manage-product" key={item.menu_id}><div className={`manage-thumb product-${item.flavor}`}><Jar flavor={item.flavor} size="mini"/></div><div className="manage-product-name"><strong>{item.food_name}</strong><small>{item.category} · {item.availability?'Available':'Unavailable'}</small></div><span className="manage-price">{money(item.price)}</span><button className="btn btn-outline btn-small" onClick={()=>setEditMenu({...item})}>Edit</button><button className="icon-btn" onClick={()=>deleteProduct(item.menu_id)} title="Mark unavailable" aria-label={`Mark ${item.food_name} unavailable`}><Trash2 size={17}/></button></div>)}</div></>}
          {dashTab==='reports' && <><form className="report-generator" onSubmit={e=>{e.preventDefault();void generateReport();}}><div><strong>Generate daily sales report</strong><p>Reports count completed orders only, preserving accurate sales totals.</p></div><input type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)} required/><button className="btn btn-dark btn-small" disabled={busy}><Plus size={17}/> Generate</button></form><div className="dash-section-head"><h2>Saved reports</h2></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Orders</th><th>Total sales</th><th>Generated by</th></tr></thead><tbody>{reports.map(r=><tr key={r.report_id}><td>{r.report_date}</td><td>{r.total_orders}</td><td><strong>{money(r.total_sales)}</strong></td><td>{r.generated_by_name}</td></tr>)}</tbody></table></div>{!reports.length&&<div className="empty-state compact"><CreditCard size={32}/><h3>No reports yet</h3><p>Pick a date to generate your first report.</p></div>}</>}
          {dashTab==='users' && user.role==='admin' && <><div className="dash-section-head"><h2>Staff & administrators</h2><button className="btn btn-dark btn-small" onClick={()=>setAddStaff(true)}><Plus size={17}/> Add staff</button></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Full name</th><th>Username</th><th>Role</th><th>Active</th></tr></thead><tbody>{staffList.map(s=><tr key={s.admin_id}><td><strong>{s.full_name}</strong></td><td>{s.username}</td><td><select disabled={s.admin_id===user.id} value={s.role} onChange={e=>changeStaff(s,{role:e.target.value as 'admin'|'staff'})}><option value="staff">Staff</option><option value="admin">Administrator</option></select></td><td><label className="toggle-label"><input type="checkbox" checked={Boolean(s.is_active)} disabled={s.admin_id===user.id} onChange={e=>changeStaff(s,{is_active:e.target.checked})}/><span>{s.is_active?'Yes':'No'}</span></label></td></tr>)}</tbody></table></div><div className="dash-section-head customers-title"><h2>Registered customers</h2><span className="small-muted">{customers.length} records</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Contact</th></tr></thead><tbody>{customers.map(c=><tr key={c.customer_id}><td><strong>{c.customer_name}</strong></td><td>{c.email}</td><td>{c.contact_number}</td></tr>)}</tbody></table></div></>}
          {dashTab==='settings' && user.role==='admin' && <div className="settings-card"><h2>Delivery settings</h2><p>Set a flat delivery fee. The PHP backend calculates this amount at checkout.</p><form onSubmit={saveFee}><label>Delivery fee (PHP)<input type="number" min="0" max="1000" step="0.01" value={feeInput} onChange={e=>setFeeInput(e.target.value)}/></label><button className="btn btn-dark" disabled={busy}>Save changes <Check size={17}/></button></form></div>}
        </div>
      </main>}
    </>}

    <footer className="site-footer"><div className="container footer-inner"><div><Brand light onClick={()=>go('home')}/><p>Good food, great mood.<br/>Made with heart, enjoyed with love.</p></div><div className="footer-right"><span>QUICK LINKS</span><button onClick={()=>go('menu')}>Our menu</button><button onClick={()=>go('home')}>Home</button>{user?.role==='customer'&&<button onClick={()=>go('orders')}>Track orders</button>}</div><div className="footer-message">Stay hungry.<br/><em>Stay happy.</em><span>✳</span></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Bossing Chicken Pastel</span><span>Online Food Ordering System</span></div></footer>

    {toast && <div className="toast" role="status"><CheckCircle2 size={19}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss notification"><X size={15}/></button></div>}
    {cartOpen && <div className="overlay" onMouseDown={()=>setCartOpen(false)}><aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your shopping bag" onMouseDown={e=>e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow muted">JUST FOR YOU</span><h2>Your bag <span>({cartCount})</span></h2></div><button className="icon-btn" onClick={()=>setCartOpen(false)} aria-label="Close bag"><X size={23}/></button></div><div className="drawer-scroll">{cartDetails.length ? cartDetails.map(({item,quantity})=><div className="cart-line" key={item.menu_id}><div className={`cart-thumb product-${item.flavor}`}><Jar flavor={item.flavor} size="mini"/></div><div className="cart-line-info"><strong>{item.food_name}</strong><span>{money(item.price)}</span><div className="qty-control"><button aria-label={`Remove one ${item.food_name}`} onClick={()=>setQuantity(item.menu_id,-1)}><Minus size={14}/></button><span>{quantity}</span><button aria-label={`Add one ${item.food_name}`} onClick={()=>setQuantity(item.menu_id,1)} disabled={quantity>=30}><Plus size={14}/></button></div></div><button className="icon-btn remove-item" onClick={()=>setCart(cart.filter(c=>c.menu_id!==item.menu_id))} aria-label={`Remove ${item.food_name}`}><X size={17}/></button></div>) : <div className="drawer-empty"><ShoppingBag size={44}/><h3>Nothing in your bag yet</h3><p>Let's find something delicious!</p><button className="btn btn-dark" onClick={()=>{setCartOpen(false);go('menu');}}>Browse menu <ArrowRight size={17}/></button></div>}
      {cartDetails.length>0 && <div className="checkout-form"><h3>How would you like it?</h3><div className="fulfillment-choices"><button className={fulfillment==='pickup'?'chosen':''} onClick={()=>setFulfillment('pickup')}><ShoppingBag size={19}/> Pick-up</button><button className={fulfillment==='delivery'?'chosen':''} onClick={()=>setFulfillment('delivery')}><Truck size={19}/> Delivery</button></div>{fulfillment==='delivery'&&<label className="field">Delivery address<textarea rows={2} placeholder="House number, street, city" value={address} onChange={e=>setAddress(e.target.value)}/></label>}<label className="field">Special instructions (optional)<textarea rows={2} maxLength={500} placeholder="Anything we should know?" value={note} onChange={e=>setNote(e.target.value)}/></label><p className="payment-note"><CreditCard size={16}/> {fulfillment==='delivery'?'Cash on delivery':'Cash on pick-up'}</p></div>}</div>
      {cartDetails.length>0&&<div className="cart-summary"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>{fulfillment==='delivery'?'Delivery fee':'Pick-up'}</span><strong>{fulfillment==='delivery'?money(deliveryFee):'FREE'}</strong></div><div className="cart-total"><span>Total</span><strong>{money(total)}</strong></div><button className="btn btn-dark btn-full" disabled={busy} onClick={placeOrder}>{busy?'Placing order…':'Place order'} <ArrowRight size={19}/></button><small>All totals are confirmed by the server at checkout.</small></div>}</aside></div>}

    {authOpen && <div className="overlay modal-overlay" onMouseDown={()=>setAuthOpen(false)}><section className="modal auth-modal" role="dialog" aria-modal="true" aria-label={authMode==='login'?'Log in':'Create account'} onMouseDown={e=>e.stopPropagation()}><button className="modal-close icon-btn" onClick={()=>setAuthOpen(false)} aria-label="Close"><X size={21}/></button><div className="auth-logo"><Brand onClick={()=>{setAuthOpen(false);go('home');}}/></div><span className="eyebrow muted">{authMode==='login'?'WELCOME BACK, BOSSING':'WELCOME TO THE FAMILY'}</span><h2>{authMode==='login'?'Ready for something good?':'Let’s get you started.'}</h2><p>{authMode==='login'?'Sign in to keep the good food coming.':'Create an account and order your favorites.'}</p><form onSubmit={submitAuth} className="auth-fields">{authMode==='register'&&<><label className="field">Full name<input required maxLength={120} value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="Juan dela Cruz"/></label><label className="field">Contact number<input required maxLength={30} value={authForm.phone} onChange={e=>setAuthForm({...authForm,phone:e.target.value})} placeholder="09XX XXX XXXX"/></label><label className="field">Email address<input required type="email" maxLength={190} value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@example.com"/></label><label className="field">Address (optional)<input maxLength={350} value={authForm.address} onChange={e=>setAuthForm({...authForm,address:e.target.value})} placeholder="Street, city"/></label></>}{authMode==='login'&&<label className="field">Email address or staff username<input required value={authForm.identifier} onChange={e=>setAuthForm({...authForm,identifier:e.target.value})} placeholder="Email or username"/></label>}<label className="field">Password<input required minLength={8} maxLength={255} type="password" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="At least 8 characters"/></label><button className="btn btn-dark btn-full" disabled={busy}>{busy?'Please wait…':authMode==='login'?'Log in':'Create account'} <ArrowRight size={18}/></button></form><div className="auth-switch">{authMode==='login'?"Don't have an account?":'Already have an account?'} <button onClick={()=>setAuthMode(authMode==='login'?'register':'login')}>{authMode==='login'?'Sign up':'Log in'}</button></div>{DEMO&&<div className="preview-logins"><span>QUICK PREVIEW ACCESS</span><div><button onClick={()=>tryPreview('customer')}>Customer</button><button onClick={()=>tryPreview('staff')}>Staff</button><button onClick={()=>tryPreview('admin')}>Admin</button></div><small>Preview accounts are simulated; the PHP version uses real password authentication.</small></div>}</section></div>}

    {product&&<div className="overlay modal-overlay" onMouseDown={()=>setProduct(null)}><section className="modal detail-modal" role="dialog" aria-modal="true" aria-label={product.food_name} onMouseDown={e=>e.stopPropagation()}><button className="modal-close icon-btn" onClick={()=>setProduct(null)} aria-label="Close"><X size={21}/></button><div className={`detail-art product-${product.flavor}`}><Jar flavor={product.flavor} size="large"/></div><div className="detail-info"><span className="eyebrow muted">{product.category}</span><h2>{product.food_name}</h2><div className="detail-price">{money(product.price)} <span>per jar</span></div><p>{product.description}</p><div className="detail-perks"><span><Heart size={17}/> Comfort food</span><span><Flame size={17}/> Full of flavor</span><span><CheckCircle2 size={17}/> Made with care</span></div><button className="btn btn-dark btn-full" onClick={()=>{addToCart(product.menu_id);setProduct(null);setCartOpen(true);}}>Add to bag <Plus size={18}/></button></div></section></div>}

    {editMenu&&<div className="overlay modal-overlay" onMouseDown={()=>setEditMenu(null)}><section className="modal edit-modal" role="dialog" aria-modal="true" aria-label="Edit menu item" onMouseDown={e=>e.stopPropagation()}><button className="modal-close icon-btn" onClick={()=>setEditMenu(null)} aria-label="Close"><X size={21}/></button><h2>{editMenu.menu_id?'Edit product':'Add new product'}</h2><p>Customers will see updates as soon as they refresh the menu.</p><form onSubmit={saveProduct} className="edit-form"><label className="field">Product name<input required maxLength={140} value={editMenu.food_name} onChange={e=>setEditMenu({...editMenu,food_name:e.target.value})}/></label><label className="field">Description<textarea maxLength={3000} rows={3} value={editMenu.description??''} onChange={e=>setEditMenu({...editMenu,description:e.target.value})}/></label><div className="two-fields"><label className="field">Price (PHP)<input type="number" min="0" max="99999" step="0.01" required value={editMenu.price} onChange={e=>setEditMenu({...editMenu,price:Number(e.target.value)})}/></label><label className="field">Category<input required maxLength={70} value={editMenu.category} onChange={e=>setEditMenu({...editMenu,category:e.target.value})}/></label></div><div className="two-fields"><label className="field">Flavor artwork<select value={editMenu.flavor} onChange={e=>setEditMenu({...editMenu,flavor:e.target.value as MenuItem['flavor']})}><option value="original">Original</option><option value="spicy">Spicy</option><option value="garlic">Garlic</option><option value="chili-garlic">Chili garlic</option></select></label><label className="field">Availability<select value={editMenu.availability?'1':'0'} onChange={e=>setEditMenu({...editMenu,availability:e.target.value==='1'})}><option value="1">Available</option><option value="0">Unavailable</option></select></label></div><button className="btn btn-dark btn-full" disabled={busy}>Save product <Check size={17}/></button></form></section></div>}

    {addStaff&&<div className="overlay modal-overlay" onMouseDown={()=>setAddStaff(false)}><section className="modal edit-modal" role="dialog" aria-modal="true" aria-label="Add staff account" onMouseDown={e=>e.stopPropagation()}><button className="modal-close icon-btn" onClick={()=>setAddStaff(false)} aria-label="Close"><X size={21}/></button><h2>Invite your team</h2><p>Create a staff login with appropriate permissions.</p><form onSubmit={createStaff} className="edit-form"><label className="field">Full name<input required maxLength={120} value={staffForm.full_name} onChange={e=>setStaffForm({...staffForm,full_name:e.target.value})}/></label><label className="field">Username<input required minLength={3} maxLength={80} pattern="[a-zA-Z0-9_.-]+" value={staffForm.username} onChange={e=>setStaffForm({...staffForm,username:e.target.value})}/></label><label className="field">Temporary password<input required type="password" minLength={8} maxLength={255} value={staffForm.password} onChange={e=>setStaffForm({...staffForm,password:e.target.value})}/></label><label className="field">Role<select value={staffForm.role} onChange={e=>setStaffForm({...staffForm,role:e.target.value as 'staff'|'admin'})}><option value="staff">Staff — orders and menu</option><option value="admin">Administrator — full access</option></select></label><button className="btn btn-dark btn-full" disabled={busy}>Create account <Plus size={17}/></button></form></section></div>}
  </div>;
}
