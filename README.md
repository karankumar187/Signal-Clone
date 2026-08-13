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

---

## 📄 License
MIT
