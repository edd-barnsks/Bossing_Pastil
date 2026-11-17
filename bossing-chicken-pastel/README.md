# Bossing Chicken Pastel — Online Food Ordering System

Full-stack student project based on *Bossing Chicken Pastel Project Proposal.pptx*.

- **Frontend:** React 19 + TypeScript + Vite, responsive for phones and desktops
- **Backend:** PHP 8.2+ (JSON API, PHP sessions, PDO prepared statements)
- **Database:** MySQL 8.0+ or current MariaDB (InnoDB, relationships, indexes)
- **Local deployment:** XAMPP on Windows, or PHP + MySQL from the command line
- **Hosted presentation preview:** TypeScript frontend with browser-local sample records; does not connect to PHP/MySQL

## 1. Quick start on Windows with XAMPP

1. Install **XAMPP** (Apache, PHP and MySQL/MariaDB) and **Node.js 20.19+ or 22.12+**.
2. Extract this whole project folder into `C:\xampp\htdocs\bossing-chicken-pastel`.
3. In the XAMPP Control Panel, start **Apache** and **MySQL**.
4. Visit `http://localhost/phpmyadmin`. Import **`backend/sql/schema.sql`** using the **Import** tab. This creates the `bossing_ordering` database and its eight tables. The four menu entries are sample products and prices. Change them through the staff dashboard as needed.
5. Open Command Prompt inside the project folder and run:

   ```bat
   npm install
   npm run build
   C:\xampp\php\php.exe backend\tools\create_admin.php
   ```

   Follow the prompts to create your administrator login. The password is hashed in the database. **No default admin password is included.**
6. Open **`http://localhost/bossing-chicken-pastel/`** in your browser. The server redirects to the built TypeScript frontend under `/dist/`.
7. Log in using the administrator username and password you created. Then you can create staff accounts, manage prices and availability, see orders, update statuses, generate sales reports, and edit the delivery fee.

Customers can register from the website. They sign in using their email address, whereas staff and administrators sign in using their usernames.

### Database connection

The PHP server reads these environment variables: `DB_HOST` (default `127.0.0.1`), `DB_PORT` (default `3306`), `DB_NAME` (default `bossing_ordering`), `DB_USER` (default `root`), and `DB_PASSWORD` (default empty). The defaults match a fresh local XAMPP installation with no MySQL root password. If your MySQL credentials differ, configure the environment variables for Apache/PHP. Never put database credentials inside TypeScript frontend files.

## 2. Development with hot reload

Use two terminals from the project root (plus a running MySQL service):

```bash
# Terminal A: PHP API
php -S 127.0.0.1:8000 -t .

# Terminal B: TypeScript frontend
npm install
npm run dev
```

Open the local Vite URL (normally `http://localhost:5173`). Vite forwards `/api` to the PHP server. For non-demo builds, the browser fetches only the `/api/index.php?route=...` endpoint. No third-party backend is required.

For a no-backend UI presentation, use `npm run build:demo`, then `npm run preview`. The demo stores menu edits and orders in this browser only. **Do not use demo mode for real customer orders.** Use the normal `npm run build` for XAMPP and real MySQL data.

## 3. Features

| Customer | Staff | Administrator |
| --- | --- | --- |
| Register and sign in | Sign in using staff username | Sign in using admin username |
| Browse and search menu | View all customer orders | All staff features |
| Add/remove products from cart | Advance or cancel orders | Create, edit, deactivate staff accounts |
| Pick delivery or pickup | Manage menu products and availability | View customer records |
| Checkout with cash on delivery/pickup | Generate daily sales reports | Change delivery fee |
| Track order status and history of own orders | View order summaries | Manage staff roles |

Order statuses follow: `pending → confirmed → preparing → ready → completed`, with cancellation allowed before completion. The API checks status transitions and logs staff changes in `order_status_history`.

At checkout, PHP re-fetches current available products, applies the stored prices and delivery fee, and saves the order and its item details in a single transaction. The browser's displayed price is only an estimate until the server confirms checkout. Sales reports count **completed orders**.

The system deliberately uses **cash on delivery** and **cash on pickup**. It does not collect payment-card details or integrate an online payment gateway, since the proposal does not require one.

## 4. ERD implementation and additions

The six tables from slide 7 remain: `customer`, `order_tbl`, `order_detail`, `menu_item`, `admin_user`, `sales_report`.

Changes required for a working system:

| Original ERD | Implementation choice |
| --- | --- |
| `customer.password` and `admin_user.password` | Changed to `password_hash` so passwords are never stored in plain text |
| `order_tbl` | Added address, note, payment method, subtotal, delivery fee; retained order type, total amount, status, `processed_by` |
| `order_detail` | Added `food_name_snapshot` so past receipts remain accurate after a product is renamed; kept `unit_price`, `quantity`, `subtotal` |
| `menu_item` | Added description, flavor artwork key, timestamps; retained availability, category, price |
| `sales_report` | Preserved date, totals and `generated_by`; added timestamp and per-staff-per-date uniqueness |
| **New:** `order_status_history` | Audit record of who changed an order's status and when |
| **New:** `system_setting` | Stores the editable delivery fee |

See `docs/erd.md` for the complete relationship diagram. Foreign keys, unique constraints and indexed search fields are defined in `backend/sql/schema.sql`. The optional `backend/sql/advanced_sql.sql` demonstrates a SQL function, a stored procedure, and two triggers for later database-programming milestones; import it separately after the schema when required by your instructor.

## 5. Project layout

```text
bossing-chicken-pastel/
├── src/                    React + TypeScript website
├── api/                    PHP JSON API and connection setup
│   ├── index.php           API routes and business rules
│   └── bootstrap.php       PDO database connection, session and CSRF helpers
├── backend/
│   ├── sql/schema.sql      Database + starter menu records
│   ├── sql/advanced_sql.sql Optional procedures/function/triggers
│   └── tools/create_admin.php
├── docs/erd.md             Updated ERD description
├── dist/                   Built frontend (after npm run build)
├── index.php               Apache redirect to /dist/
├── package.json
└── vite.config.ts
```

## 6. Security and deployment notes

- PHP uses `password_hash`, `password_verify`, session cookies marked HttpOnly and SameSite, and a CSRF header on all state-changing API requests.
- Database requests use PDO prepared statements; server-side permission checks restrict staff and administrator actions.
- Invalid quantities, unavailable items, bad role changes and invalid status changes are rejected by the PHP backend.
- Staff passwords must be provided individually; never share the administrator account across your team.
- Use HTTPS and non-default database credentials for any real public deployment. Add a rate limiter, backups, and business delivery-zone rules before accepting genuine public orders.
- This frontend can be deployed as static assets, but **PHP and MySQL cannot execute on static-only hosting**. For a public full-stack launch, use hosting that explicitly supports PHP 8.2+ and MySQL, configure secure environment variables, and point the domain to the folder containing `index.php` and `api/`.
- The jar visuals in the frontend are stylized illustrations; replace them with your own product photos when available.

## 7. Manual verification checklist

1. Register a customer and log out/in with the same email.
2. Add two different flavors and verify their quantities and total in the cart.
3. Place one pickup order, then one delivery order with address and delivery fee.
4. Log in as staff, open the order queue and progress each order through its allowed status steps.
5. Log in as administrator and change a product price. Existing order line prices should remain unchanged.
6. Generate a sales report for a day containing a completed order. Cancelled and pending orders should not count.
7. Try customer access to `/api/index.php?route=users` and confirm a 403 response; try editing the order price using browser developer tools and confirm PHP ignores it.

**Academic-project note:** Product names, prices and delivery fee are seeded from a simplified interpretation of the proposal mockups, not a verified live restaurant price list. Update the data before submitting or using the project with real customers.
