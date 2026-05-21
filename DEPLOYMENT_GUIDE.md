# 🚀 Deployment Guide for InBill Web App

This guide explains how to deploy the root InBill Next.js application as a production-grade web platform accessible from any desktop, tablet, or mobile browser.

Because InBill is a hybrid application, it can be deployed in two primary ways depending on your preferred database topology.

---

## 🗄️ Database Architecture Options

Before deploying, choose how you want to manage data persistence:

### Option A: Serverless Deploy (Vercel) + Neon Postgres (Recommended)
* **Best for**: Serverless scale, zero maintenance, global availability, and native mobile syncing.
* **How it works**: Ephemeral serverless functions handle API requests, and data is saved to a fast, cloud-hosted serverless PostgreSQL instance (Neon).
* **Cost**: 100% Free tier compatible.

### Option B: Persistent Deploy (Render / VPS) + SQLite
* **Best for**: Simple single-server hosting, full control of files, and maintaining a local `store.db` file.
* **How it works**: A persistent VM hosts the Next.js process and mounts a persistent disk volume to write updates to `store.db` locally.

---

## ☁️ Method A: Deploying to Vercel (Neon Postgres)

### Step 1: Set Up your Neon Postgres Database
1. Go to [Neon.tech](https://neon.tech/) and sign up for a free account.
2. Create a new project and select your preferred region.
3. Copy the **Connection String** (it will look like `postgresql://username:password@ep-host-name.pooler.neon.tech/neondb?sslmode=require`).

### Step 2: Push your Repository to GitHub
Make sure your project is pushed to a private or public GitHub repository.

### Step 3: Import to Vercel
1. Log in to [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Connect your GitHub account and select your `inbill` repository.
3. Under **Build & Development Settings**, configure:
   * **Build Command**: `next build`
   * **Output Directory**: `.next`
4. Under **Environment Variables**, add the following keys:
   * `IS_WEB` = `true` (forces Next.js to compile dynamic API routes instead of Electron exports)
   * `DATABASE_URL` = `<your_neon_postgres_connection_string>`
   * `GEMINI_API_KEY` = `<your_google_gemini_api_key>` (optional, pre-configures AI invoice parsing)
5. Click **Deploy**.

*Vercel will build the application in under 2 minutes. Your platform is now live with global SSL, automated caching, and high performance!*

---

## 🖥️ Method B: Deploying to Render (Persistent SQLite)

If you wish to retain your SQLite database file (`store.db`) without using a cloud Postgres server, deploy on Render with a **Persistent Disk Volume**.

### Step 1: Create a Render Web Service
1. Log in to [Render](https://render.com/) and create a new **Web Service**.
2. Connect your GitHub repository.
3. Configure the following service settings:
   * **Runtime**: `Node`
   * **Build Command**: `npm run web-build`
   * **Start Command**: `npx next start -p $PORT`

### Step 2: Mount a Persistent Disk
1. Scroll down to **Advanced** and click **Add Disk**.
2. Configure your disk settings:
   * **Name**: `inbill-db-disk`
   * **Mount Path**: `/data`
   * **Size**: `1 GB` (more than enough for millions of ERP invoices)

### Step 3: Add Environment Variables
Add these key-value pairs in the **Environment** tab:
* `IS_WEB` = `true`
* `INBILL_DB_PATH` = `/data/store.db` (tells InBill to write to the persistent disk directory)
* `GEMINI_API_KEY` = `<your_gemini_api_key>` (optional)

### Step 4: Click Deploy
Render will spin up a persistent container, attach the disk, compile the Next.js bundle, and host your app live!

---

## 🔑 Environment Variables Reference

| Variable Name | Purpose | Example Value |
| :--- | :--- | :--- |
| `IS_WEB` | Tells the build framework to skip Electron desktop bundling. | `true` |
| `DATABASE_URL` | Cloud Postgres connection string (for serverless Vercel deploy). | `postgresql://...` |
| `INBILL_DB_PATH` | Path where local SQLite `store.db` resides (for persistent container deploys). | `/data/store.db` |
| `GEMINI_API_KEY` | Google Gemini developer key for parsing invoice OCR files. | `AIzaSy...` |
