const Database=require("better-sqlite3");
const bcrypt=require("bcryptjs");
const readline=require("readline");
const path=require("path");
const fs=require("fs");
const dbPath=process.env.DB_PATH||path.join(__dirname,"data","sajib-shop.db");
fs.mkdirSync(path.dirname(dbPath),{recursive:true});
const db=new Database(dbPath);
db.exec(`CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (datetime('now')));`);
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
rl.question("নতুন admin username দিন: ",username=>{
 if(!username.trim()){console.log("Username খালি রাখা যাবে না");rl.close();return;}
 rl.question("শক্তিশালী admin password দিন: ",password=>{
  if(password.length<12){console.log("নিরাপত্তার জন্য অন্তত ১২ অক্ষরের পাসওয়ার্ড ব্যবহার করুন।");rl.close();return;}
  try{db.prepare("INSERT INTO admins(username,password_hash) VALUES(?,?)").run(username.trim(),bcrypt.hashSync(password,12));console.log("Admin account তৈরি হয়েছে। পাসওয়ার্ড নিরাপদে রাখুন।");}
  catch(e){console.log("অ্যাকাউন্ট তৈরি হয়নি: "+e.message);}
  rl.close();db.close();
 });
});
