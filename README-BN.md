# Sajib Shop — Full-stack starter

এই প্রজেক্টে আছে:
- বাংলা, মোবাইল-ফ্রেন্ডলি storefront (`public/index.html`)
- Express.js backend (`server.js`)
- SQLite database: products, orders, order items, admin accounts
- Admin dashboard (`/admin`) — অর্ডার দেখা/স্ট্যাটাস বদলানো, পণ্য যোগ/সম্পাদনা
- ঢাকা delivery ৳80, ঢাকার বাইরে ৳120
- নতুন অর্ডার সার্ভারে সেভ হয়; browser থেকে TXT ডাউনলোডের বদলে order ID ফেরত আসে

## 1. যা লাগবে
Node.js 20 LTS (অথবা compatible current LTS), npm, এবং কম্পিউটার। শুধু HTML ফাইল খুলে backend চালু হবে না।

## 2. লোকালি চালু করা
1. ZIP extract করুন।
2. এই ফোল্ডারে terminal/Command Prompt খুলুন।
3. Dependencies ইনস্টল করুন:
   ```bash
   npm install
   ```
   `better-sqlite3` ইনস্টল করতে কোনো কোনো সিস্টেমে build tools প্রয়োজন হতে পারে।
4. `.env.example`-কে `.env` নামে কপি করুন।
5. `.env`-এর `SESSION_SECRET`-কে দীর্ঘ, অনুমান করা কঠিন random string দিয়ে বদলান।
6. Admin account তৈরি করুন:
   ```bash
   npm run create-admin
   ```
   prompt-এ username ও অন্তত ১২ অক্ষরের শক্তিশালী password দিন। Password source code-এ লিখবেন না।
7. সার্ভার চালু করুন:
   ```bash
   npm start
   ```
8. Storefront: http://localhost:3000
9. Admin panel: http://localhost:3000/admin

প্রথম চালুর সময় `data/sajib-shop.db` তৈরি হবে এবং demo products যোগ হবে। Admin panel দিয়ে নতুন পণ্য যোগ/দাম/স্টক সম্পাদনা করা যাবে। Storefront `/api/products` থেকে database-এর পণ্য লোড করে; admin panel-এ যোগ করা পণ্য refresh-এর পর storefront-এ দেখা যাবে।

## 3. Online hosting
Node.js server চালাতে পারে এমন hosting লাগবে (যেমন VPS বা Node.js application hosting)। শুধু static hosting/GitHub Pages-এ এই backend চলবে না।

- Project files server-এ upload করুন এবং `npm install` চালান।
- Environment variables সেট করুন: `NODE_ENV=production`, `PORT` (host সাধারণত দেয়), এবং secure random `SESSION_SECRET`।
- `data/` directory ও database file persistent storage-এ রাখুন; deploy/restart-এ মুছে যায় এমন temporary filesystem ব্যবহার করবেন না।
- HTTPS বাধ্যতামূলক করুন; production-এ session cookie secure=true থাকে।
- প্রথমবার server-এর terminal-এ `npm run create-admin` চালিয়ে admin তৈরি করুন।
- Domain ও HTTPS configure করে public URL পরীক্ষা করুন।
- Database-এর নিয়মিত backup নিন; hosting-এ persistent volume ও backup সুবিধা যাচাই করুন।

## 4. Order flow
Customer checkout → `POST /api/orders` → server-side product price/stock verification → SQLite-এ order + items সংরক্ষণ → order ID ফেরত → admin `/admin`-এ অর্ডার দেখা ও status পরিবর্তন।

## 5. গুরুত্বপূর্ণ সীমাবদ্ধতা / production checklist
- এটি starter implementation, Daraz-এর সম্পূর্ণ সমতুল্য নয়। Real payment gateway, courier API, SMS/WhatsApp notifications, return/refund, customer login, product image upload, multi-vendor tools, analytics, rate limiting, CSRF hardening, privacy policy/terms এবং production monitoring যোগ করা হয়নি।
- Checkout price server database থেকে নেওয়া হয়; browser পাঠানো price বিশ্বাস করা হয় না।
- Frontend catalogue API থেকে load করে; নতুন পণ্য যোগের পর পেজ refresh করুন।
- SQLite ছোট/মাঝারি স্টোরের starter হিসেবে উপযোগী; বড় traffic/scale-এর জন্য managed PostgreSQL-এর মতো DB বিবেচনা করুন।
- Public deploy করার আগে security review করুন, backups পরীক্ষা করুন, HTTPS ব্যবহার করুন, strong credentials রাখুন, এবং admin route-এ rate limiting যোগ করুন।
- Customer name, phone, address ব্যক্তিগত তথ্য। প্রয়োজনের বাইরে সংগ্রহ/শেয়ার করবেন না।

## 6. Main files
- `public/index.html` — customer storefront
- `public/admin.html` — admin UI
- `server.js` — API, authentication, database logic
- `create-admin.js` — secure password hash করে initial admin user বানায়
- `package.json` — dependencies and commands
