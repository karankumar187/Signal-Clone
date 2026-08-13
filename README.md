# Signal Messenger Clone — Secure Messaging Platform

A full-stack Signal clone that replicates Signal's design, user experience, and core messaging workflows. Supports both **Desktop (Laptop/PC screen)** two-panel layout and **Mobile (Phone screen)** single-panel navigation.

![Signal Clone](https://api.dicebear.com/7.x/initials/svg?seed=SignalClone)

## 🚀 Features

- **Authentication / Onboarding**:
  - Mocked phone number authentication with fixed OTP (`123456`).
  - Display name and avatar profile setup.
  - Session persistence using JWT tokens.

- **Real-Time One-on-One & Group Messaging**:
  - WebSockets-powered real-time message delivery.
  - Delivery and read receipts (`✓` sent, `✓✓` delivered/read).
  - Live typing indicators ("User is typing...").
  - Persistent message history in SQLite.

- **Signal UI/UX Experience**:
  - Dark mode and custom design matching Signal Desktop and Mobile apps.
  - Responsive layout (Two-column layout on Desktop, fluid single-column with slide-in navigation on Mobile).
  - Navigation icons (Chats, Calls, Stories, Settings).
  - Modals for starting new Direct Messages and creating Groups with members.
  - End-to-end encryption UI banners and lock indicators (simulated).

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (TypeScript, App Router, Pure CSS Modules with Signal Palette)
- **Backend**: Python FastAPI
- **Database**: SQLite (SQLAlchemy ORM)
- **Real-Time**: WebSockets
- **Cloud Media**: Cloudinary integration / DiceBear avatars

---

## 🏗 Architecture & Database Schema

### Architecture
```
┌────────────────────────────────┐         WebSockets         ┌───────────────────────────────┐
│        Next.js Frontend        │ ◄────────────────────────► │        FastAPI Backend        │
│   (TypeScript + CSS Modules)   │      HTTP REST APIs        │    (Python + SQLAlchemy)      │
└────────────────────────────────┘ ─────────────────────────► └──────────────┬────────────────┘
                                                                             │
                                                                             ▼
                                                                     SQLite Database
```

### Database Schema (SQLAlchemy)
- **`users`**: `id`, `phone`, `display_name`, `about`, `avatar_url`, `created_at`, `last_seen`
- **`contacts`**: `id`, `user_id`, `contact_user_id`, `nickname`, `added_at`
- **`conversations`**: `id`, `is_group`, `group_name`, `group_avatar`, `created_at`, `created_by`
- **`participants`**: `id`, `conversation_id`, `user_id`, `joined_at`, `is_admin`
- **`messages`**: `id`, `conversation_id`, `sender_id`, `content`, `msg_type`, `status`, `created_at`
- **`message_reads`**: `id`, `message_id`, `user_id`, `read_at`

---

## ⚡ Quick Start / Local Setup

### 1. Prerequisites
- Node.js >= 18
- Python >= 3.9

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Seed initial mock users and chat history
python3 seed.py

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
Backend will run at `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will run at `http://localhost:3000`.

---

## 🧪 Testing the Application

1. Open `http://localhost:3000` in your browser.
2. Enter any phone number (e.g., `+1234567890`).
3. Enter the mock OTP `123456`.
4. Enter your display name.
5. You will land on the Signal chat main screen seeded with sample conversations and messages!
6. Open an Incognito window or second browser tab to test real-time WebSocket messaging between users.

## 🚀 Deployment

### 1. Deploy Backend (Render.com)

1. Create a free account on [Render.com](https://render.com) and click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Use the following settings:
   - **Name:** `signal-clone-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
4. *(Optional)* Add Cloudinary API keys in the **Environment Variables** section for cloud image hosting.
5. Click **Create Web Service**. 
6. Copy the resulting `.onrender.com` URL.

*Note: Render's free tier uses ephemeral storage, meaning your local SQLite database (`signal_clone.db`) will reset every time the server spins down. If you want persistent data, you'll need to use Render's free PostgreSQL database.*
*Tip: To keep your free Render server awake 24/7, use a free cron-job service (like [cron-job.org](https://cron-job.org/)) to ping your backend URL every 14 minutes.*

### 2. Deploy Frontend (Vercel.com)

1. Create a free account on [Vercel](https://vercel.com) and click **Add New** -> **Project**.
2. Import your GitHub repository.
3. Edit the **Root Directory** and select the `frontend` folder.
4. Expand the **Environment Variables** section and add:
   - **Key:** `NEXT_PUBLIC_API_URL`
   - **Value:** Your Render backend URL (e.g., `https://signal-clone-backend.onrender.com` without a trailing slash).
5. Click **Deploy**.

---

## 📄 License
MIT
