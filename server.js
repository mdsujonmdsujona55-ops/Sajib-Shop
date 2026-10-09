const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "sajib-shop.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY,
 name TEXT NOT NULL,
 category TEXT NOT NULL DEFAULT '',
 price INTEGER NOT NULL CHECK(price >= 0),
 old_price INTEGER NOT NULL DEFAULT 0,
 emoji TEXT NOT NULL DEFAULT '🛍️',
 stock INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 customer_name TEXT NOT NULL,
 phone TEXT NOT NULL,
 address TEXT NOT NULL,
 area TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 subtotal INTEGER NOT NULL,
 delivery INTEGER NOT NULL,
 total INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'নতুন',
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id INTEGER NOT NULL REFERENCES orders(id),
 product_id INTEGER,
 product_name TEXT NOT NULL,
 unit_price INTEGER NOT NULL,
 quantity INTEGER NOT NULL
);
`);
const initial = [
[1,"ওয়্যারলেস ব্লুটুথ হেডফোন","ইলেকট্রনিক্স",1250,1800,"🎧",50],
[2,"স্মার্ট ওয়াচ","ইলেকট্রনিক্স",1650,2200,"⌚",30],
[3,"স্টাইলিশ ব্যাকপ্যাক","ব্যাগ",990,1350,"🎒",40],
[4,"লেডিস হ্যান্ডব্যাগ","ব্যাগ",1150,1500,"👜",35],
[5,"ক্যাজুয়াল স্নিকার্স","ফ্যাশন",1450,1900,"👟",25],
[6,"সানগ্লাস","ফ্যাশন",450,650,"🕶️",60],
[7,"স্কিন কেয়ার সেট","বিউটি",850,1100,"🧴",25],
[8,"কফি মগ সেট","হোম ও লিভিং",520,700,"☕",40],
[9,"ডিজিটাল টেবিল ল্যাম্প","হোম ও লিভিং",780,990,"💡",20],
[10,"রান্নাঘরের স্টোরেজ বক্স","হোম ও লিভিং",390,500,"🥡",40],
[11,"শিশুদের খেলনা","খেলনা",620,800,"🧸",25],
[12,"স্পোর্টস পানির বোতল","খেলাধুলা",350,450,"🥤",45],
[13,"পাওয়ার ব্যাংক","ইলেকট্রনিক্স",1350,1700,"🔋",30],
[14,"টি-শার্ট","ফ্যাশন",550,750,"👕",50],
[15,"বই ও নোটবুক সেট","স্টেশনারি",280,350,"📚",70]
];
const insert = db.prepare("INSERT OR IGNORE INTO products (id,name,category,price,old_price,emoji,stock) VALUES (?,?,?,?,?,?,?)");
const tx = db.transaction(() => initial.forEach(p => insert.run(...p)));
tx();

app.use(express.json({limit:"100kb"}));
app.use(session({
 secret: process.env.SESSION_SECRET || "CHANGE_THIS_SESSION_SECRET_BEFORE_DEPLOYING",
 resave:false, saveUninitialized:false,
 store:new SQLiteStore({db:"sessions.sqlite",dir:path.dirname(DB_PATH)}),
 cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:8*60*60*1000}
}));
const requireAdmin = (req,res,next) => req.session.admin ? next() : res.status(401).json({error:"অ্যাডমিন লগইন প্রয়োজন"});
app.use(express.static(path.join(__dirname,"public")));

app.get("/api/products",(req,res)=>{
 const rows=db.prepare("SELECT id,name,category AS cat,price,old_price AS old,emoji,stock FROM products WHERE active=1 ORDER BY id DESC").all();
 res.json(rows);
});
app.post("/api/orders",(req,res)=>{
 const {customerName,phone,address,area,note="",items}=req.body||{};
 if(!customerName||!phone||!address||!["inside","outside"].includes(area)||!Array.isArray(items)||!items.length)
   return res.status(400).json({error:"সব প্রয়োজনীয় তথ্য ও অন্তত একটি পণ্য দিন"});
 if(String(customerName).length>120||String(phone).length>30||String(address).length>600||String(note).length>1000)
   return res.status(400).json({error:"কিছু তথ্যের দৈর্ঘ্য বেশি"});
 const normalized=[];
 for(const item of items){
   const id=Number(item.productId), qty=Number(item.quantity);
   if(!Number.isInteger(id)||!Number.isInteger(qty)||qty<1||qty>50) return res.status(400).json({error:"পণ্যের তথ্য সঠিক নয়"});
   const p=db.prepare("SELECT id,name,price,stock FROM products WHERE id=? AND active=1").get(id);
   if(!p) return res.status(400).json({error:"একটি পণ্য পাওয়া যায়নি"});
   if(p.stock<qty) return res.status(400).json({error:`${p.name} পর্যাপ্ত স্টকে নেই`});
   normalized.push({...p,quantity:qty});
 }
 const subtotal=normalized.reduce((s,p)=>s+p.price*p.quantity,0);
 const delivery=area==="inside"?80:120;
 const create=db.transaction(()=>{
   const info=db.prepare("INSERT INTO orders(customer_name,phone,address,area,note,subtotal,delivery,total) VALUES(?,?,?,?,?,?,?,?)")
    .run(String(customerName).trim(),String(phone).trim(),String(address).trim(),area,String(note).trim(),subtotal,delivery,subtotal+delivery);
   const orderId=Number(info.lastInsertRowid);
   const add=db.prepare("INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity) VALUES(?,?,?,?,?)");
   const reduce=db.prepare("UPDATE products SET stock=stock-? WHERE id=?");
   normalized.forEach(p=>{add.run(orderId,p.id,p.name,p.price,p.quantity);reduce.run(p.quantity,p.id)});
   return orderId;
 });
 try { const orderId=create(); res.status(201).json({ok:true,orderId,total:subtotal+delivery}); }
 catch(e){res.status(500).json({error:"অর্ডার সংরক্ষণ করা যায়নি"});}
});

app.post("/api/admin/login", (req,res)=>{
 const {username,password}=req.body||{};
 const admin=db.prepare("SELECT id,username,password_hash FROM admins WHERE username=?").get(String(username||""));
 if(!admin||!bcrypt.compareSync(String(password||""),admin.password_hash)) return res.status(401).json({error:"ইউজারনেম বা পাসওয়ার্ড ভুল"});
 req.session.regenerate(err=>{
   if(err) return res.status(500).json({error:"লগইন করা যায়নি"});
   req.session.admin={id:admin.id,username:admin.username};
   res.json({ok:true,username:admin.username});
 });
});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/me",requireAdmin,(req,res)=>res.json({username:req.session.admin.username}));
app.get("/api/admin/orders",requireAdmin,(req,res)=>{
 const orders=db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 500").all();
 const getItems=db.prepare("SELECT product_name AS name,unit_price AS price,quantity FROM order_items WHERE order_id=?");
 res.json(orders.map(o=>({...o,items:getItems.all(o.id)})));
});
app.patch("/api/admin/orders/:id",requireAdmin,(req,res)=>{
 const statuses=["নতুন","নিশ্চিত","প্রসেসিং","পাঠানো হয়েছে","সম্পন্ন","বাতিল"];
 if(!statuses.includes(req.body.status)) return res.status(400).json({error:"স্ট্যাটাস সঠিক নয়"});
 const result=db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status,Number(req.params.id));
 if(!result.changes) return res.status(404).json({error:"অর্ডার পাওয়া যায়নি"});
 res.json({ok:true});
});
app.get("/api/admin/products",requireAdmin,(req,res)=>res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all()));
app.post("/api/admin/products",requireAdmin,(req,res)=>{
 const {name,category="",price,old_price=0,emoji="🛍️",stock=0}=req.body||{};
 if(!String(name||"").trim()||!Number.isFinite(Number(price))||Number(price)<0||!Number.isInteger(Number(stock))||Number(stock)<0)
   return res.status(400).json({error:"পণ্যের নাম, দাম ও স্টক সঠিকভাবে দিন"});
 const result=db.prepare("INSERT INTO products(name,category,price,old_price,emoji,stock) VALUES(?,?,?,?,?,?)")
 .run(String(name).trim(),String(category),Number(price),Number(old_price)||0,String(emoji),Number(stock));
 res.status(201).json({id:Number(result.lastInsertRowid)});
});
app.patch("/api/admin/products/:id",requireAdmin,(req,res)=>{
 const {name,category,price,old_price=0,emoji="🛍️",stock=0,active=1}=req.body||{};
 if(!String(name||"").trim()||!Number.isFinite(Number(price))||Number(price)<0||!Number.isInteger(Number(stock))||Number(stock)<0)
   return res.status(400).json({error:"পণ্যের তথ্য সঠিক নয়"});
 const r=db.prepare("UPDATE products SET name=?,category=?,price=?,old_price=?,emoji=?,stock=?,active=? WHERE id=?")
 .run(String(name).trim(),String(category),Number(price),Number(old_price)||0,String(emoji),Number(stock),active?1:0,Number(req.params.id));
 if(!r.changes) return res.status(404).json({error:"পণ্য পাওয়া যায়নি"});
 res.json({ok:true});
});
app.get("/admin", (req,res)=>res.sendFile(path.join(__dirname,"public","admin.html")));
app.listen(PORT,()=>console.log(`Sajib Shop চালু: http://localhost:${PORT}`));
