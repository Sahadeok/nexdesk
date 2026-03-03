# 🚀 NexDesk — Setup Instructions (Follow These Steps Exactly)

## STEP 1 — Get Your Supabase Keys

1. Go to: https://supabase.com/dashboard/project/ihbeajjjdgtqswbjxziu/settings/api
2. Copy these two values:
   - **Project URL** (looks like: https://ihbeajjjdgtqswbjxziu.supabase.co) -https://ihbeajjjdgtqswbjxziu.supabase.co
   - **anon public** key (long text starting with "eyJ...") -eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYmVhampqZGd0cXN3Ymp4eml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODc1NzYsImV4cCI6MjA4Nzg2MzU3Nn0.160fbYCbdECRpied-F4tlSHIMtewQ93BG6Q9wcJ-UM8
3. Keep these safe — you need them in Step 3.

---

## STEP 2 — Download & Open Project

1. Download the nexdesk.zip file I gave you
2. Extract/unzip it on your laptop
3. Open the folder — you should see: app/, lib/, package.json etc.

---

## STEP 3 — Create Environment File

1. Inside the nexdesk folder, find the file: `.env.local.example`
2. **Copy** that file and **rename the copy** to: `.env.local`
3. Open `.env.local` in Notepad
4. Replace `YOUR_SUPABASE_ANON_KEY_HERE` with your actual anon key from Step 1
5. Save the file

It should look like this:
```
NEXT_PUBLIC_SUPABASE_URL=https://ihbeajjjdgtqswbjxziu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c....(your key)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## STEP 4 — Run on Your Laptop (Test First)

Open **Command Prompt** or **PowerShell** in the nexdesk folder:

```
npm install
npm run dev
```

- Wait for it to say "Ready - started server on http://localhost:3000"
- Open your browser → go to: http://localhost:3000
- You should see the NexDesk login page! ✅

---

## STEP 5 — Push to GitHub

In the same terminal, run these commands ONE BY ONE:

```
git init
git add .
git commit -m "Phase 1: NexDesk login page complete"
git branch -M main
git remote add origin https://github.com/Sahadeok/nexdesk.git
git push -u origin main

git config --global user.email "sahadeok@gmail.com"
git config --global user.name "Sahadeok"


## tonek git- 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
```

---

## STEP 6 — Deploy on Vercel (Auto Deploy)

1. Go to: https://vercel.com/sahadeoks-projects
2. Click **"Add New Project"**
3. Select your **nexdesk** GitHub repository
4. Click **"Import"**
5. In the **Environment Variables** section, add:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`  → Value: your Supabase URL
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Value: your anon key
6. Click **"Deploy"**
7. Wait 2 minutes → Your app is LIVE! 🎉

---

## STEP 7 — Setup Supabase Auth (Allow Email Login)

1. Go to: https://supabase.com/dashboard/project/ihbeajjjdgtqswbjxziu/auth/providers
2. Make sure **Email** provider is ENABLED
3. Go to: https://supabase.com/dashboard/project/ihbeajjjdgtqswbjxziu/auth/url-configuration
4. Under **Site URL** → put your Vercel URL (e.g. https://nexdesk.vercel.app)
5. Under **Redirect URLs** → add: `https://nexdesk.vercel.app/auth/callback`
6. Click **Save**

---

## STEP 8 — Create Your First Admin User (Test Login)

1. Go to: https://supabase.com/dashboard/project/ihbeajjjdgtqswbjxziu/auth/users
2. Click **"Invite User"** or **"Add User"**
3. Enter your email + a password
4. Go to your login page → login with that email + password
5. You should see the dashboard! ✅

---

## ❓ If Anything Goes Wrong

Just tell me (Claude) the exact error message you see — I will fix it immediately!

Common issues:
- **"Module not found"** → Run `npm install` again
- **"Invalid API key"** → Check your .env.local file
- **"Redirect URL mismatch"** → Check Supabase Site URL setting (Step 7)
