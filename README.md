# restaurant-voice-AI
# AI Voice + WhatsApp Restaurant Ordering Student Build Guide

> A complete, step-by-step technical playbook to build the AI ordering system described in the BRD. **Stack-switcher edition** — choose Python (FastAPI) or Node.js (Express) for the backend; both run the same telephony + WhatsApp + AI stack.
> 

---

---

## 1.  Project Overview (from BRD)

**Project Name:** AI-Powered Voice and WhatsApp Ordering System for Restaurants
**Type:** Multi-tenant SaaS — voice AI + WhatsApp commerce
**Owner:** *[Student Name]***Start Date:** *[DD-MM-YYYY]***Target Go-Live:** *[DD-MM-YYYY]***Status:** Planning / In Progress / Live

### What It Does

A platform that any restaurant (cloud kitchen, takeaway, multi-outlet chain) installs to:

- **Answer phone calls automatically** with an AI voice agent that takes orders
- **Accept WhatsApp orders** via text OR voice notes — same AI brain
- **Understand mixed-language inputs** (e.g. Hinglish: “Bro, ek paneer butter masala family pack”)
- **Confirm every order verbally** before submission (zero-tolerance for wrong orders)
- **Send orders to the kitchen/POS** automatically via webhook
- **Generate UPI/card payment links** via Razorpay, sent on WhatsApp
- **Send delivery status updates** to the customer
- Provide a **live ops console** for staff to watch active calls and step in if needed

### What This Is NOT

- Not a delivery management system (Dunzo / Shadowfax handle the actual delivery)
- Not a POS replacement (sends orders to existing POS via webhook)
- Not a chatbot platform (it’s a single, vertical-specific assistant)
- Not aiming to replace humans — it has a “talk to a person” escape hatch at every step

### Why This Project Matters for Students

- **First real-time voice AI project** — entirely different mental model from request/response
- **Streaming WebSocket + audio** — production-grade pattern used by every voice agent (Vapi, Bland, Retell)
- **Latency-sensitive engineering** — sub-second budgets force you to think about every millisecond
- **AI function calling** — proper structured output, not just text generation
- **Multi-channel architecture** — voice + WhatsApp share the same brain
- **A genuinely impressive portfolio project** — voice agents are the most-hyped AI vertical of 2025-26

---

## 2. Why This Project Is Different

Voice AI has a fundamentally different architecture than every other project in your course:

| Other Projects | Voice AI |
| --- | --- |
| Request/response | Bidirectional audio streams |
| 200ms response is fine | 800ms feels broken to a human caller |
| LLM JSON output once | LLM called multiple times mid-call |
| State stored in DB | State held in memory during call |
| Test with curl | Test by calling a phone number |
| One protocol (HTTP) | Three protocols (HTTP + WebSocket + audio codecs) |

📌 **The mental shift:** in voice AI, **time is the resource**. Every API call eats 200-500ms. Add 4 hops (STT → LLM → TTS → audio out) and you’re already at 1.5 seconds. People hang up. The architecture is designed entirely around minimizing this.

---

## 3.  The Hard Part: Voice AI Latency Budget

This is the conceptual core of the project. Internalize this BEFORE writing any code.

### The latency budget for natural conversation

Humans expect responses in **<800ms** in a phone call. Anything over 1.5s feels broken. Here’s where every millisecond goes:

```
USER FINISHES SPEAKING                    [t = 0ms]
    │
    ▼
End-of-speech detection                   [t = 200ms]   ← VAD silence threshold
    │
    ▼
Final STT transcript ready                [t = 250ms]   ← partials helped
    │
    ▼
LLM "first token" latency                 [t = 600ms]   ← Anthropic Haiku TTFT
    │
    ▼
LLM "complete intent" understood          [t = 900ms]
    │
    ▼
TTS first audio chunk                     [t = 1100ms]  ← streaming TTS
    │
    ▼
Audio reaches user's phone                [t = 1300ms]  ← network + buffer
```

That 1.3 seconds is **already too slow** for natural conversation. Three tricks make it bearable:

1. **Streaming everywhere** — STT streams partials, LLM streams tokens, TTS streams audio. Don’t wait for complete responses.
2. **TTS caching** — common responses (“What size?”, “Anything else?”) are pre-rendered.
3. **Aggressive end-of-speech detection** — VAD silence threshold of 200ms (not 500ms).

### The provider stack we use

| Stage | Provider | Why |
| --- | --- | --- |
| **Telephony** | Twilio Voice (intl) / Exotel (India) | Reliable, well-documented Media Streams |
| **STT** | **Deepgram** (streaming) | <200ms partials, supports Hinglish |
| **LLM** | **Anthropic Claude Haiku** | Fast TTFT, good function calling |
| **TTS** | **ElevenLabs** (streaming) | Best voice quality with low latency |

📌 **Don’t use OpenAI Whisper API for real-time** — it doesn’t stream. Deepgram is the industry standard.

---

## 4. Stack Choice — Python vs Node

This guide covers **both stacks**. The architecture is identical. Pick based on your team’s preference.

| Aspect | Node.js (Express + ws) | Python (FastAPI + websockets) |
| --- | --- | --- |
| WebSocket handling | Native + battle-tested | First-class support |
| Twilio SDK | Excellent | Excellent |
| Deepgram SDK | Excellent | Excellent |
| Async/await | Built-in | Requires `asyncio` discipline |
| Whisper local (free) | Hard | Easy via `faster-whisper` |
| Course consistency | Matches majority | Matches AI/ML projects |
| Concurrent call handling | Lighter memory | Heavier but more capable |
| **Recommended for** | Production-grade voice infra | Cost-conscious students who want local STT |

📌 **Frontend code is identical for both tracks.** Backend code blocks are tagged with **🐍 Python** or **🟩 Node** — pick your flavor and follow that lane.

---

## 5.  Tech Stack

### 🟩 Node.js Track

| Layer | Tool |
| --- | --- |
| Backend | **Express + TypeScript** |
| WebSocket | **ws** library |
| ORM | **Prisma** |
| Database | **PostgreSQL** (Supabase) |
| Cache / Queue | **Redis** + **BullMQ** |
| Telephony | **Twilio Voice + Media Streams** |
| WhatsApp | **Twilio WhatsApp** OR **360dialog** |
| STT | **Deepgram** (streaming) |
| LLM | **Anthropic Claude Haiku** |
| TTS | **ElevenLabs** streaming + Redis cache |
| Payments | **Razorpay** |
| Storage | **Supabase Storage** (call recordings) |

### Python Track

| Layer | Tool |
| --- | --- |
| Backend | **FastAPI** + Uvicorn |
| WebSocket | Native FastAPI WebSocket |
| ORM | **SQLAlchemy 2.0 (async)** |
| Database | **PostgreSQL** (Supabase) |
| Cache / Queue | **Redis** + **Celery** |
| Telephony | **Twilio Voice + Media Streams** |
| WhatsApp | **Twilio WhatsApp** OR **360dialog** |
| STT (option A) | **Deepgram** (streaming) |
| STT (option B) | **faster-whisper** (local, free) |
| LLM | **Anthropic Claude Haiku** |
| TTS | **ElevenLabs** OR **Piper** (local) |
| Payments | **Razorpay** |
| Storage | **Supabase Storage** |

### Frontend (both tracks identical)

| Layer | Tool |
| --- | --- |
| Framework | **React 18 + TypeScript + Vite** |
| Styling | **Tailwind + Shadcn/UI** |
| State (server) | `@tanstack/react-query` |
| Realtime | **Supabase Realtime** for live order feed |
| Audio playback | **react-h5-audio-player** |

---

## 6.  Pre-Requisites Checklist

### Accounts (free tier where possible)

- [ ]  GitHub
- [ ]  Supabase (free Postgres + Storage)
- [ ]  Upstash Redis (free)
- [ ]  **Twilio** (~$15 free trial credit — covers ~500 minutes of calls)
- [ ]  **Deepgram** ($200 free credit — generous for this project)
- [ ]  **Anthropic** (~$5 credit — Haiku is cheap)
- [ ]  **ElevenLabs** (free 10K chars/month — enough for testing)
- [ ]  **Razorpay** test mode (free, no GST needed for test)
- [ ]  Vercel + Render

### Tools Installed

- [ ]  Either Node.js 20+ OR Python 3.11+
- [ ]  **ngrok** (REQUIRED — Twilio webhooks need a public HTTPS URL)
- [ ]  FFmpeg (for any audio format conversion)
- [ ]  Git, VS Code, Postman
- [ ]  A real phone you can call from for testing

### Skills Required

- [ ]  Either TypeScript OR Python fundamentals
- [ ]  Async/await fluency (voice = lots of concurrent operations)
- [ ]  **WebSocket basics** — read MDN docs if unfamiliar
- [ ]  HTTP / REST / JSON
- [ ]  Comfort with audio terms (sample rate, mu-law, PCM)

### Credentials Saved (in `.env`)

- [ ]  `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- [ ]  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_FROM`
- [ ]  `DEEPGRAM_API_KEY`
- [ ]  `ANTHROPIC_API_KEY`
- [ ]  `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
- [ ]  `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- [ ]  `PUBLIC_URL` (your ngrok URL during dev)

---

## 7.  System Architecture

```
┌──────────────┐                                ┌──────────────────┐
│  CUSTOMER    │ ─── phone call ────────────▶  │  Twilio Voice    │
│  (caller)    │                                └────────┬─────────┘
└──────────────┘                                         │
                                                         │ TwiML: <Connect><Stream>
                                                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  YOUR BACKEND                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  WebSocket /voice-stream — bidirectional audio with Twilio   │    │
│  │     │ inbound mu-law 8kHz                                    │    │
│  │     ▼                                                        │    │
│  │  Deepgram WebSocket — streaming STT (partials + finals)     │    │
│  │     │ transcript                                             │    │
│  │     ▼                                                        │    │
│  │  Conversation State Machine                                  │    │
│  │     │ user said "X" → next state                             │    │
│  │     ▼                                                        │    │
│  │  Anthropic Claude — function call: addItem / removeItem /...│    │
│  │     │ AI response text                                       │    │
│  │     ▼                                                        │    │
│  │  ElevenLabs TTS — streaming audio                            │    │
│  │     │ audio chunks                                           │    │
│  │     ▼                                                        │    │
│  │  Twilio WebSocket — outbound mu-law to caller                │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                       │                           │
                       ▼                           ▼
                ┌──────────────┐           ┌──────────────────┐
                │  PostgreSQL  │           │  Razorpay        │
                │  - calls     │           │  - payment links │
                │  - orders    │           └──────────────────┘
                │  - menu      │                   │
                └──────────────┘                   ▼
                                          ┌────────────────────┐
                                          │  WhatsApp message  │
                                          │  "Pay here: ..."   │
                                          └────────────────────┘

WhatsApp lane (parallel, same brain):
  Twilio WhatsApp webhook → STT (if voice note) → State Machine → LLM → reply
```

### The Three Critical Decisions

**1. Streaming everywhere.** Audio in, transcript in chunks, LLM tokens streaming, TTS streaming. Never wait for “done.”

**2. State machine, not pure LLM.** The LLM is good at parsing intent (“user wants 2 paneer butter masalas”). The state machine governs the conversation flow (“we just got the items — now ask for delivery address”). Pure LLM-driven dialogues drift and forget.

**3. Voice and WhatsApp share the brain.** Both feed the same conversation engine. Different I/O, same logic.

---

## 8.  Folder Structure

### 🟩 Node.js Track

```
server/
├── src/
│   ├── index.ts
│   ├── config/
│   │   ├── env.ts
│   │   ├── prisma.ts
│   │   └── redis.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── menu.ts
│   │   ├── orders.ts
│   │   ├── twilio-voice.ts        # /voice/incoming → TwiML
│   │   ├── twilio-whatsapp.ts     # /whatsapp/inbound webhook
│   │   ├── razorpay-webhook.ts
│   │   └── reports.ts
│   ├── ws/
│   │   └── voiceStream.ts         # ← THE CORE WebSocket handler
│   ├── services/
│   │   ├── stt/deepgram.ts
│   │   ├── llm/claude.ts          # function-calling
│   │   ├── llm/tools.ts           # tool definitions
│   │   ├── tts/elevenlabs.ts
│   │   ├── tts/cache.ts
│   │   ├── conversation/
│   │   │   ├── stateMachine.ts    # ← THE CORE state machine
│   │   │   └── transcript.ts
│   │   ├── orders/
│   │   │   ├── parse.ts
│   │   │   ├── confirm.ts
│   │   │   └── recommend.ts
│   │   ├── menu/cache.ts
│   │   ├── payment/razorpay.ts
│   │   ├── notifications/whatsapp.ts
│   │   └── pos/dispatcher.ts      # webhook to kitchen
│   ├── jobs/
│   │   ├── queue.ts
│   │   └── postCallProcessing.ts
│   ├── middleware/auth.ts
│   └── utils/audio.ts             # mu-law / PCM helpers
├── prisma/schema.prisma
└── package.json
```

### Python Track

```
server/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── db.py
│   ├── celery_app.py
│   ├── models/
│   ├── schemas/
│   ├── routes/
│   │   ├── auth.py
│   │   ├── menu.py
│   │   ├── orders.py
│   │   ├── twilio_voice.py
│   │   ├── twilio_whatsapp.py
│   │   ├── razorpay_webhook.py
│   │   └── reports.py
│   ├── ws/
│   │   └── voice_stream.py        # FastAPI WebSocket
│   ├── services/
│   │   ├── stt/
│   │   │   ├── deepgram.py
│   │   │   └── whisper_local.py   # optional
│   │   ├── llm/
│   │   │   ├── claude.py
│   │   │   └── tools.py
│   │   ├── tts/
│   │   │   ├── elevenlabs.py
│   │   │   └── cache.py
│   │   ├── conversation/
│   │   │   ├── state_machine.py
│   │   │   └── transcript.py
│   │   ├── orders/...
│   │   ├── payment/razorpay.py
│   │   └── pos/dispatcher.py
│   ├── tasks/
│   │   └── post_call_processing.py
│   ├── middleware/auth.py
│   └── utils/audio.py
├── workers/worker.py
├── alembic/
└── requirements.txt
```

### Frontend (`/client`)

```
client/
├── src/
│   ├── api/{axios,supabase}.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── LiveOrders.tsx          # active calls + recent orders
│   │   ├── OrderDetail.tsx
│   │   ├── Menu.tsx
│   │   ├── ConversationReplay.tsx  # listen to + read transcript
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── ui/                     # shadcn
│   │   ├── orders/
│   │   ├── conversation/
│   │   │   ├── TranscriptViewer.tsx
│   │   │   └── AudioPlayer.tsx
│   │   └── live/
│   │       └── ActiveCallCard.tsx
│   ├── hooks/useRealtimeOrders.ts
│   └── App.tsx
└── package.json
```

---

## 9. Database Design

```sql
-- TENANT = ONE RESTAURANT
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_number text unique,         -- Twilio number this restaurant uses
  whatsapp_number text,
  pos_webhook_url text,             -- where to push new orders
  pos_api_key text,                 -- HMAC for outgoing
  upi_id text,                      -- for direct UPI without Razorpay
  greeting_text text default 'Hello, welcome to our restaurant. How can I help you?',
  voice_id text default 'EXAVITQu4vr4xnSDxMaL',  -- ElevenLabs voice
  language text default 'en-IN',
  business_hours jsonb,
  delivery_radius_km int default 5,
  created_at timestamptz default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  email text unique not null,
  password_hash text not null,
  name text,
  role text default 'staff' check (role in ('owner','manager','staff'))
);

-- MENU
create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  name text,
  display_order int
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  category_id uuid references menu_categories(id),
  name text not null,
  description text,
  aliases text[],                   -- ['paneer butter', 'PBM'] for STT
  price_paise int not null,         -- ₹450 = 45000
  is_available boolean default true,
  is_veg boolean default true,
  spice_level text,
  options jsonb,                    -- [{name:'Size', choices:[{name:'Half', delta:-100}, ...]}]
  created_at timestamptz default now()
);
create index menu_restaurant_avail on menu_items(restaurant_id, is_available);

-- CALLS (one row per voice call)
create table calls (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  twilio_call_sid text unique,
  caller_phone text,
  direction text default 'inbound',
  status text default 'in_progress',  -- in_progress|completed|failed|abandoned
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds int,
  recording_url text,
  full_transcript jsonb,              -- [{role, text, ts}]
  order_id uuid,
  created_at timestamptz default now()
);
create index calls_restaurant_status on calls(restaurant_id, status);

-- WHATSAPP CONVERSATIONS
create table whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  customer_phone text,
  status text default 'active',
  last_message_at timestamptz,
  full_transcript jsonb,
  order_id uuid,
  created_at timestamptz default now(),
  unique (restaurant_id, customer_phone)
);

-- ORDERS
create table orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  channel text not null check (channel in ('voice','whatsapp','manual')),
  customer_phone text,
  customer_name text,
  delivery_address text,
  delivery_latlng text,
  items jsonb not null,             -- [{menu_item_id, name, qty, price, options}]
  subtotal_paise int,
  delivery_fee_paise int default 0,
  total_paise int,
  status text default 'pending'
    check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  payment_status text default 'unpaid'
    check (payment_status in ('unpaid','link_sent','paid','refunded')),
  payment_link_url text,
  razorpay_order_id text,
  razorpay_payment_id text,
  source_call_id uuid references calls(id),
  source_whatsapp_id uuid references whatsapp_conversations(id),
  notes text,
  pos_dispatched_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index orders_restaurant_status on orders(restaurant_id, status, created_at desc);
create index orders_customer_phone on orders(customer_phone, created_at desc);

-- ORDER STATUS HISTORY (audit trail)
create table order_status_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  from_status text,
  to_status text,
  changed_by text,                  -- 'system' | user_id | 'pos_webhook'
  changed_at timestamptz default now()
);

-- CUSTOMER PROFILE (for recommendations)
create table customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  phone text not null,
  name text,
  total_orders int default 0,
  total_spent_paise int default 0,
  last_order_at timestamptz,
  preferences jsonb,                -- favorite items, dietary
  unique(restaurant_id, phone)
);
```

---

## 10.  External Service Setup

### 10.1 Twilio (the most important setup)

1. twilio.com → Sign up, get $15 trial credit
2. Buy a phone number (~₹100/month for Indian number, or use trial US number)
3. **Console → Phone Numbers → Configure** your number:
    - Voice → A Call Comes In → Webhook → `https://YOUR_NGROK.ngrok.io/twilio/voice/incoming` (POST)
4. **Messaging → Try WhatsApp** → join the sandbox by texting “join `” to +1 415 523 8886`
    - WhatsApp inbound webhook: `https://YOUR_NGROK.ngrok.io/twilio/whatsapp/inbound`

### 10.2 Deepgram

- console.deepgram.com → API key with `Member` role + Speech permissions
- Save `DEEPGRAM_API_KEY`

### 10.3 ElevenLabs

- elevenlabs.io → Settings → API Keys
- Voices → pick one (recommend “Rachel” or “Adam” for English; explore Indian voices for ₹)
- Save `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`

### 10.4 Anthropic

- console.anthropic.com → API key

### 10.5 Razorpay

- razorpay.com → Test Mode → Settings → API Keys
- Save `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`
- For test mode, use test cards listed in their docs

### 10.6 ngrok

```bash
brew install ngrok    # or download from ngrok.com
ngrok http 3000
# Note the https URL — paste into Twilio webhook config
```

📌 ngrok’s **free tier URL changes every restart**. Pay for a static domain (~₹700/mo) if you do this for a while.

---

## 11.  Step 1 — Project Setup

### 🟩 Node.js Track

```bash
mkdir voice-orders && cd voice-orders
mkdir server client

cd server
npm init -y
npm install express ws cors helmet morgan dotenv zod \
            @prisma/client jsonwebtoken bcryptjs \
            bullmq ioredis \
            twilio @deepgram/sdk @anthropic-ai/sdk \
            elevenlabs razorpay axios
npm install -D typescript @types/node @types/express @types/cors \
               @types/jsonwebtoken @types/bcryptjs @types/ws \
               ts-node-dev tsx prisma
npx tsc --init
npx prisma init
```

`server/.env`:

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<32+ chars>
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
DEEPGRAM_API_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
ELEVENLABS_API_KEY=xxx
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
PUBLIC_URL=https://YOUR_NGROK.ngrok.io
PORT=3000
```

`server/package.json` scripts:

```json
{
  "scripts": {
    "dev":         "tsx watch src/index.ts",
    "dev:worker":  "tsx watch src/workers/worker.ts",
    "build":       "tsc",
    "start":       "node dist/index.js",
    "migrate":     "prisma migrate deploy"
  }
}
```

### Python Track

```bash
cd server
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn[standard] websockets sqlalchemy[asyncio] asyncpg \
            alembic pydantic[email] python-jose[cryptography] passlib[bcrypt] \
            python-multipart python-dotenv \
            celery redis \
            twilio deepgram-sdk anthropic elevenlabs \
            razorpay httpx
pip freeze > requirements.txt
```

Same `.env` as Node track.

### Frontend

```bash
cd ../client
npm create vite@latest . -- --template react-ts
npm install
npm install axios react-router-dom @tanstack/react-query \
            @supabase/supabase-js \
            react-h5-audio-player framer-motion recharts date-fns
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init
npx shadcn@latest add button input label dialog select textarea badge card tabs table progress toast
```

---

## 12. Step 2 — Auth & Multi-Tenancy

Standard JWT pattern (same as previous projects). Skipping boilerplate.

The cardinal rule: **every Postgres query filters by `restaurant_id`.** Voice calls map to a restaurant by **the Twilio number that received the call** — so when a call comes in, the first thing you do is `SELECT * FROM restaurants WHERE phone_number = ?`.

---

## 13. Step 3 — Menu & Catalog Management

The menu must be loaded into memory before every call (the LLM needs to know what’s orderable). Cache it in Redis with 5-minute TTL.

### 🟩 Node — `services/menu/cache.ts`

```tsx
import { redis } from "../../config/redis";
import { prisma } from "../../config/prisma";

const TTL = 300;

export async function getMenuForLLM(restaurantId: string) {
  const cacheKey = `menu:${restaurantId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const items = await prisma.menuItem.findMany({
    where: { restaurantId, isAvailable: true },
    include: { category: true },
    orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }]
  });

  const menu = items.map(i => ({
    id: i.id,
    name: i.name,
    aliases: i.aliases,
    description: i.description,
    price: i.pricePaise / 100,
    category: i.category?.name,
    options: i.options
  }));

  await redis.setex(cacheKey, TTL, JSON.stringify(menu));
  return menu;
}

export async function invalidateMenu(restaurantId: string) {
  await redis.del(`menu:${restaurantId}`);
}
```

📌 **Why caching matters here:** during a call, you might call `getMenuForLLM()` 5+ times. With cache: ~1ms. Without: 50ms × 5 = 250ms wasted in the latency budget.

---

## 14.  Step 4 — Inbound Voice Call Handler (TwiML)

When Twilio receives a call to your number, it makes a webhook request. We respond with **TwiML** that tells Twilio: “open a WebSocket back to me, send me audio.”

### 🟩 Node — `routes/twilio-voice.ts`

```tsx
import { Router } from "express";
import twilio from "twilio";
import { prisma } from "../config/prisma";

const router = Router();

router.post("/incoming", async (req, res) => {
  const calledNumber = req.body.To;          // your Twilio number
  const callerNumber = req.body.From;
  const callSid = req.body.CallSid;

  // Match restaurant by called number
  const restaurant = await prisma.restaurant.findUnique({
    where: { phoneNumber: calledNumber }
  });
  if (!restaurant) {
    const v = new twilio.twiml.VoiceResponse();
    v.say("Sorry, this number is not configured. Goodbye.");
    v.hangup();
    res.type("text/xml").send(v.toString());
    return;
  }

  // Persist call row
  const call = await prisma.call.create({
    data: {
      restaurantId: restaurant.id,
      twilioCallSid: callSid,
      callerPhone: callerNumber,
      status: "in_progress"
    }
  });

  // Generate TwiML: greeting + WebSocket stream
  const v = new twilio.twiml.VoiceResponse();
  v.say({ voice: "Polly.Aditi" }, restaurant.greetingText);
  const connect = v.connect();
  connect.stream({
    url: `${process.env.PUBLIC_URL!.replace("https", "wss")}/voice-stream`
  }).parameter({ name: "callId", value: call.id });

  res.type("text/xml").send(v.toString());
});

// Twilio status callback (call ended)
router.post("/status", async (req, res) => {
  const callSid = req.body.CallSid;
  const status = req.body.CallStatus;       // 'completed','busy','failed','no-answer'
  const duration = parseInt(req.body.CallDuration ?? "0", 10);

  await prisma.call.update({
    where: { twilioCallSid: callSid },
    data: {
      status: status === "completed" ? "completed" : "failed",
      endedAt: new Date(),
      durationSeconds: duration
    }
  });
  res.sendStatus(200);
});

export default router;
```

### Python — `routes/twilio_voice.py`

```python
from fastapi import APIRouter, Request, Response
from twilio.twiml.voice_response import VoiceResponse, Connect
from app.db import SessionLocal
from app.models.call import Call
from app.models.restaurant import Restaurant
from sqlalchemy import select
import os

router = APIRouter(prefix="/twilio/voice", tags=["voice"])

@router.post("/incoming")
async def incoming(request: Request):
    form = await request.form()
    called_number = form.get("To")
    caller_number = form.get("From")
    call_sid = form.get("CallSid")

    async with SessionLocal() as db:
        restaurant = (await db.execute(
            select(Restaurant).where(Restaurant.phone_number == called_number)
        )).scalar_one_or_none()
        if not restaurant:
            v = VoiceResponse()
            v.say("Sorry, this number is not configured.")
            v.hangup()
            return Response(content=str(v), media_type="text/xml")

        call = Call(restaurant_id=restaurant.id, twilio_call_sid=call_sid,
                    caller_phone=caller_number, status="in_progress")
        db.add(call); await db.commit(); await db.refresh(call)

    v = VoiceResponse()
    v.say(restaurant.greeting_text, voice="Polly.Aditi")
    connect = Connect()
    public_url = os.getenv("PUBLIC_URL").replace("https", "wss")
    stream = connect.stream(url=f"{public_url}/voice-stream")
    stream.parameter(name="callId", value=str(call.id))
    v.append(connect)

    return Response(content=str(v), media_type="text/xml")
```

📌 **The greeting via `<Say>` is intentional.** It buys you ~3 seconds of cover time for the WebSocket to establish. By the time the customer says “Hi,” the AI is ready.

---

## 15.  Step 5 — WebSocket Media Stream + Real-Time STT

This is the heart of the voice system. Twilio sends 8kHz mu-law audio in 20ms frames over WebSocket. We forward to Deepgram, get transcripts back.

### 🟩 Node — `ws/voiceStream.ts`

```tsx
import { WebSocketServer } from "ws";
import { Server } from "http";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { handleStateMachine } from "../services/conversation/stateMachine";
import { synthesize } from "../services/tts/elevenlabs";
import { prisma } from "../config/prisma";

const dg = createClient(process.env.DEEPGRAM_API_KEY!);

interface CallContext {
  callId: string;
  restaurantId: string;
  streamSid: string;
  twilioWs: any;
  dgConn: any;
  transcript: { role: string; text: string; ts: number }[];
}

export function attachVoiceWS(server: Server) {
  const wss = new WebSocketServer({ server, path: "/voice-stream" });

  wss.on("connection", (twilioWs) => {
    let ctx: CallContext | null = null;

    twilioWs.on("message", async (msg) => {
      const data = JSON.parse(msg.toString());

      if (data.event === "start") {
        const callId = data.start.customParameters?.callId;
        const call = await prisma.call.findUnique({ where: { id: callId } });
        if (!call) return twilioWs.close();

        // Open Deepgram live connection
        const dgConn = dg.listen.live({
          model: "nova-2",
          language: "en-IN",          // supports Hinglish well
          encoding: "mulaw",
          sample_rate: 8000,
          punctuate: true,
          interim_results: true,
          endpointing: 200,           // 200ms silence = end-of-speech
          smart_format: true,
          vad_events: true
        });

        ctx = {
          callId, restaurantId: call.restaurantId,
          streamSid: data.start.streamSid,
          twilioWs, dgConn,
          transcript: []
        };

        dgConn.on(LiveTranscriptionEvents.Transcript, async (data: any) => {
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          if (!transcript) return;
          if (data.is_final) {
            console.log("USER:", transcript);
            ctx!.transcript.push({ role: "user", text: transcript, ts: Date.now() });

            // Run conversation logic
            const reply = await handleStateMachine(ctx!, transcript);
            if (reply) {
              await speak(ctx!, reply);
            }
          }
        });

        dgConn.on(LiveTranscriptionEvents.Error, (err: any) =>
          console.error("Deepgram error:", err));

      } else if (data.event === "media" && ctx) {
        // Forward audio to Deepgram
        const audio = Buffer.from(data.media.payload, "base64");
        ctx.dgConn.send(audio);

      } else if (data.event === "stop" && ctx) {
        await prisma.call.update({
          where: { id: ctx.callId },
          data: {
            fullTranscript: ctx.transcript as any,
            status: "completed", endedAt: new Date()
          }
        });
        ctx.dgConn.finish();
      }
    });

    twilioWs.on("close", () => {
      if (ctx) ctx.dgConn?.finish();
    });
  });
}

async function speak(ctx: CallContext, text: string) {
  ctx.transcript.push({ role: "assistant", text, ts: Date.now() });
  const audioStream = await synthesize(text);   // returns AsyncIterable<Buffer>
  for await (const chunk of audioStream) {
    // Convert TTS output (PCM 16k or mp3 → mu-law 8k) and send to Twilio
    const mulaw = await pcmToMulaw8k(chunk);
    ctx.twilioWs.send(JSON.stringify({
      event: "media",
      streamSid: ctx.streamSid,
      media: { payload: mulaw.toString("base64") }
    }));
  }
}

// helper — convert TTS PCM/mp3 to mu-law 8kHz (use audio library or ffmpeg pipe)
async function pcmToMulaw8k(buf: Buffer): Promise<Buffer> {
  // Implementation: spawn ffmpeg, pipe input/output
  // OR ask ElevenLabs for output_format=ulaw_8000 directly (best!)
  return buf;
}
```

### Python — `ws/voice_stream.py`

```python
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
import json, base64, asyncio, os
from app.services.conversation.state_machine import handle_state_machine
from app.services.tts.elevenlabs import synthesize_stream
from app.db import SessionLocal
from app.models.call import Call
from sqlalchemy import select
from datetime import datetime

router = APIRouter()
dg = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))

@router.websocket("/voice-stream")
async def voice_stream(ws: WebSocket):
    await ws.accept()
    ctx = {"transcript": []}
    dg_conn = None

    try:
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)

            if data["event"] == "start":
                call_id = data["start"]["customParameters"].get("callId")
                async with SessionLocal() as db:
                    call = (await db.execute(
                        select(Call).where(Call.id == call_id)
                    )).scalar_one_or_none()
                if not call:
                    await ws.close(); return

                ctx.update({
                    "call_id": call_id, "restaurant_id": str(call.restaurant_id),
                    "stream_sid": data["start"]["streamSid"], "ws": ws
                })

                dg_conn = dg.listen.asynclive.v("1")

                async def on_transcript(_, result, **kwargs):
                    text = result.channel.alternatives[0].transcript
                    if not text: return
                    if result.is_final:
                        ctx["transcript"].append({"role":"user","text":text,"ts":datetime.utcnow().isoformat()})
                        reply = await handle_state_machine(ctx, text)
                        if reply: await speak(ctx, reply)

                async def on_error(_, error, **kwargs):
                    print("Deepgram error:", error)

                dg_conn.on(LiveTranscriptionEvents.Transcript, on_transcript)
                dg_conn.on(LiveTranscriptionEvents.Error, on_error)

                await dg_conn.start(LiveOptions(
                    model="nova-2", language="en-IN",
                    encoding="mulaw", sample_rate=8000,
                    interim_results=True, endpointing=200,
                    punctuate=True, smart_format=True
                ))

            elif data["event"] == "media" and dg_conn:
                audio = base64.b64decode(data["media"]["payload"])
                await dg_conn.send(audio)

            elif data["event"] == "stop":
                if dg_conn: await dg_conn.finish()
                break

    except WebSocketDisconnect:
        if dg_conn: await dg_conn.finish()
    finally:
        if "call_id" in ctx:
            async with SessionLocal() as db:
                await db.execute(
                    Call.__table__.update()
                        .where(Call.id == ctx["call_id"])
                        .values(full_transcript=ctx["transcript"],
                                status="completed", ended_at=datetime.utcnow())
                )
                await db.commit()

async def speak(ctx, text):
    ctx["transcript"].append({"role":"assistant","text":text,"ts":datetime.utcnow().isoformat()})
    async for chunk in synthesize_stream(text, output_format="ulaw_8000"):
        await ctx["ws"].send_text(json.dumps({
            "event": "media",
            "streamSid": ctx["stream_sid"],
            "media": {"payload": base64.b64encode(chunk).decode()}
        }))
```

📌 **Critical optimization:** request ElevenLabs output as `ulaw_8000` directly. This skips a server-side audio conversion step and saves ~100ms per response.

---

## 16.  Step 6 — Conversation State Machine (THE CORE)

Pure-LLM dialogues drift. The state machine keeps the conversation on rails.

### Conversation flow

```
GREETING → COLLECTING_ITEMS → CONFIRMING_ITEMS → COLLECTING_ADDRESS
   ↑                                  │                  │
   │                                  ▼                  ▼
   │                            CUSTOMIZING        COLLECTING_PAYMENT
   │                                  │                  │
   └──── ESCAPE: human handoff ←──────┴──────── COMPLETED
```

### 🟩 Node — `services/conversation/stateMachine.ts`

```tsx
import { redis } from "../../config/redis";
import { askLLM } from "../llm/claude";
import { getMenuForLLM } from "../menu/cache";
import { prisma } from "../../config/prisma";

type State = "greeting" | "collecting_items" | "confirming_items"
  | "collecting_address" | "collecting_payment" | "completed";

interface ConversationState {
  state: State;
  cart: any[];                   // [{id, name, qty, price, options}]
  customer_phone?: string;
  delivery_address?: string;
  payment_pref?: "cash" | "online";
}

const STATE_TTL = 60 * 30;       // 30 min

async function getState(callId: string): Promise<ConversationState> {
  const raw = await redis.get(`conv:${callId}`);
  return raw ? JSON.parse(raw) : { state: "greeting", cart: [] };
}

async function saveState(callId: string, state: ConversationState) {
  await redis.setex(`conv:${callId}`, STATE_TTL, JSON.stringify(state));
}

export async function handleStateMachine(ctx: any, userText: string): Promise<string | null> {
  const state = await getState(ctx.callId);
  const menu = await getMenuForLLM(ctx.restaurantId);

  // Escape phrases — handoff
  const lower = userText.toLowerCase();
  if (/agent|human|person|talk to someone|cancel/.test(lower)) {
    state.state = "completed";
    await saveState(ctx.callId, state);
    return "Sure, I'll connect you with a team member. Please hold on.";
    // (Phase 2: actually transfer the call via Twilio <Dial>)
  }

  // Hand off to LLM with current state + tools
  const llmResult = await askLLM({
    state: state.state,
    cart: state.cart,
    user_text: userText,
    menu,
    transcript: ctx.transcript.slice(-10)
  });

  // Apply tool calls to state
  if (llmResult.tool_calls?.length) {
    for (const call of llmResult.tool_calls) {
      applyTool(state, call, menu);
    }
  }

  // Advance state machine if appropriate
  if (state.state === "greeting" && state.cart.length > 0) {
    state.state = "collecting_items";
  }
  if (llmResult.intent === "ready_to_confirm" && state.cart.length > 0) {
    state.state = "confirming_items";
  }
  if (llmResult.intent === "items_confirmed") {
    state.state = "collecting_address";
  }
  if (llmResult.intent === "address_provided" && state.delivery_address) {
    state.state = "collecting_payment";
  }
  if (llmResult.intent === "payment_chosen") {
    await finalizeOrder(ctx, state);
    state.state = "completed";
  }

  await saveState(ctx.callId, state);
  return llmResult.reply;
}

function applyTool(state: ConversationState, call: any, menu: any[]) {
  if (call.name === "add_item") {
    const item = menu.find(m =>
      m.id === call.input.menu_item_id ||
      m.name.toLowerCase() === call.input.name?.toLowerCase()
    );
    if (item) {
      state.cart.push({
        id: item.id, name: item.name, qty: call.input.qty ?? 1,
        price: item.price, options: call.input.options ?? []
      });
    }
  } else if (call.name === "remove_item") {
    state.cart = state.cart.filter(c => c.id !== call.input.menu_item_id);
  } else if (call.name === "set_address") {
    state.delivery_address = call.input.address;
  } else if (call.name === "set_payment") {
    state.payment_pref = call.input.method;
  }
}

async function finalizeOrder(ctx: any, state: ConversationState) {
  const subtotal = state.cart.reduce((s, c) => s + c.price * c.qty, 0);
  const order = await prisma.order.create({
    data: {
      restaurantId: ctx.restaurantId,
      channel: "voice",
      customerPhone: ctx.callerPhone,
      deliveryAddress: state.delivery_address,
      items: state.cart as any,
      subtotalPaise: Math.round(subtotal * 100),
      totalPaise: Math.round(subtotal * 100),
      status: "pending",
      sourceCallId: ctx.callId
    }
  });
  // Async: dispatch to POS, generate payment link
  await dispatchToPOSAsync(order.id);
  if (state.payment_pref === "online") {
    await generatePaymentLinkAsync(order.id);
  }
}
```

📌 **State persisted in Redis with 30-min TTL** so a dropped call can be resumed if the customer calls back.

---

## 17. Step 7 — AI Order Parser (LLM with Function Calling)

The LLM must do exactly two things: (1) understand intent, (2) call structured tools to update the cart. **No free-form ordering.**

### 🟩 Node — `services/llm/tools.ts`

```tsx
export const TOOLS = [
  {
    name: "add_item",
    description: "Add an item to the customer's cart",
    input_schema: {
      type: "object",
      properties: {
        menu_item_id: { type: "string" },
        name: { type: "string" },
        qty: { type: "integer", minimum: 1 },
        options: { type: "array", items: { type: "string" } }
      },
      required: ["name", "qty"]
    }
  },
  {
    name: "remove_item",
    description: "Remove an item from the cart",
    input_schema: {
      type: "object",
      properties: { menu_item_id: { type: "string" } },
      required: ["menu_item_id"]
    }
  },
  {
    name: "set_address",
    description: "Set customer's delivery address",
    input_schema: {
      type: "object",
      properties: { address: { type: "string" } },
      required: ["address"]
    }
  },
  {
    name: "set_payment",
    description: "Set the customer's payment method",
    input_schema: {
      type: "object",
      properties: { method: { type: "string", enum: ["cash","online"] } },
      required: ["method"]
    }
  },
  {
    name: "respond",
    description: "Respond to the user with a short voice-friendly message",
    input_schema: {
      type: "object",
      properties: {
        reply: { type: "string", description: "Your spoken reply (≤2 sentences)" },
        intent: {
          type: "string",
          enum: ["asking","clarifying","ready_to_confirm","items_confirmed",
                 "address_provided","payment_chosen","escalate"]
        }
      },
      required: ["reply", "intent"]
    }
  }
];
```

### 🟩 Node — `services/llm/claude.ts`

```tsx
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS } from "./tools";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = (state: string) => `You are a friendly Indian restaurant phone agent.
The conversation state is:${state}.

RULES:
- Output ONE 'respond' tool call AND zero+ structured tool calls (add_item, remove_item, set_address, set_payment).
- Speak in short, voice-natural sentences. ≤2 sentences per reply.
- After every cart change, briefly recap: "Added 2 paneer butter masala. Anything else?"
- Before finalizing, ALWAYS read back the entire order with prices and ask for confirmation.
- Never invent menu items. If something isn't in the menu, say "Sorry, we don't have that — would you like X instead?"
- Match the language the customer uses (English, Hindi, or Hinglish).
- Be quick. People are on a phone, not chatting.`;

export async function askLLM(args: {
  state: string;
  cart: any[];
  user_text: string;
  menu: any[];
  transcript: any[];
}) {
  const userMsg = `MENU (use these item names exactly):
${args.menu.slice(0, 50).map(m =>
  `-${m.name} (${m.aliases?.join(", ") ?? ""}): ₹${m.price}`).join("\n")}

CURRENT CART:
${args.cart.map(c => `-${c.qty}×${c.name} @ ₹${c.price}`).join("\n") || "(empty)"}

USER JUST SAID: "${args.user_text}"

Respond with the 'respond' tool, plus any cart-modification tools needed.`;

  const res = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 400,
    temperature: 0.3,
    system: SYSTEM(args.state),
    tools: TOOLS as any,
    messages: [
      ...args.transcript.map((t: any) => ({
        role: t.role === "user" ? "user" as const : "assistant" as const,
        content: t.text
      })),
      { role: "user" as const, content: userMsg }
    ]
  });

  // Extract tool calls
  const toolCalls: any[] = [];
  let reply = "";
  let intent = "asking";
  for (const block of res.content) {
    if (block.type === "tool_use") {
      if (block.name === "respond") {
        reply = (block.input as any).reply;
        intent = (block.input as any).intent;
      } else {
        toolCalls.push({ name: block.name, input: block.input });
      }
    }
  }
  return { reply, intent, tool_calls: toolCalls };
}
```

📌 **Why function calling instead of JSON parsing?** The Anthropic SDK validates the schema for you. Parser bugs from “the model added a trailing comma” vanish.

---

## 18. Step 8 — TTS with Caching

Common phrases get cached. “What’s your address?” only synthesizes once ever.

### 🟩 Node — `services/tts/elevenlabs.ts` + `cache.ts`

```tsx
import { redis } from "../../config/redis";
import crypto from "crypto";

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID!;
const TTL_DAYS = 7 * 86400;

function key(text: string, voiceId: string) {
  return `tts:${voiceId}:${crypto.createHash("md5").update(text).digest("hex")}`;
}

export async function synthesize(text: string): Promise<AsyncIterable<Buffer>> {
  // Check cache
  const k = key(text, VOICE_ID);
  const cached = await redis.getBuffer(k);
  if (cached) {
    // Yield the buffer in one chunk
    return (async function* () { yield cached; })();
  }

  // Streaming fetch from ElevenLabs (output ulaw_8000 directly!)
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?output_format=ulaw_8000`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });
  if (!res.ok) throw new Error(`ElevenLabs error:${await res.text()}`);

  // Pipe stream + collect chunks for cache
  const reader = res.body!.getReader();
  const chunks: Buffer[] = [];

  return (async function* () {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const buf = Buffer.from(value);
      chunks.push(buf);
      yield buf;
    }
    // Cache for next time (async, don't block)
    redis.setex(k, TTL_DAYS, Buffer.concat(chunks)).catch(() => {});
  })();
}
```

📌 With caching, common phrases respond in ~80ms (Redis fetch + base64 encoding) instead of 600ms (ElevenLabs round-trip). This is the single biggest perceived-latency win.

---

## 19.  Step 9 — WhatsApp Ordering

Same brain, different I/O.

### 🟩 Node — `routes/twilio-whatsapp.ts`

```tsx
import { Router } from "express";
import { prisma } from "../config/prisma";
import { handleStateMachine } from "../services/conversation/stateMachine";
import { transcribeAudioUrl } from "../services/stt/deepgram";
import twilio from "twilio";

const router = Router();
const twClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

router.post("/inbound", async (req, res) => {
  const fromPhone = (req.body.From as string).replace("whatsapp:", "");
  const toPhone   = (req.body.To as string).replace("whatsapp:", "");
  const text      = req.body.Body as string;
  const numMedia  = parseInt(req.body.NumMedia ?? "0", 10);

  res.sendStatus(200);   // Twilio expects fast response

  // Match restaurant
  const restaurant = await prisma.restaurant.findFirst({
    where: { whatsappNumber: toPhone }
  });
  if (!restaurant) return;

  // Get or create conversation
  const convo = await prisma.whatsappConversation.upsert({
    where: { restaurantId_customerPhone: { restaurantId: restaurant.id, customerPhone: fromPhone } },
    create: {
      restaurantId: restaurant.id, customerPhone: fromPhone,
      lastMessageAt: new Date()
    },
    update: { lastMessageAt: new Date() }
  });

  // Resolve user input — text OR voice note
  let userText = text;
  if (numMedia > 0 && req.body.MediaContentType0?.startsWith("audio/")) {
    userText = await transcribeAudioUrl(
      req.body.MediaUrl0,
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    console.log("Voice note transcribed:", userText);
  }

  // Run through the same state machine
  const ctx = {
    callId: convo.id,           // reuse same Redis key pattern
    restaurantId: restaurant.id,
    callerPhone: fromPhone,
    transcript: ((convo.fullTranscript as any[]) ?? [])
  };
  ctx.transcript.push({ role: "user", text: userText, ts: Date.now() });

  const reply = await handleStateMachine(ctx, userText);
  if (reply) {
    ctx.transcript.push({ role: "assistant", text: reply, ts: Date.now() });
    await twClient.messages.create({
      from: `whatsapp:${toPhone}`,
      to: `whatsapp:${fromPhone}`,
      body: reply
    });
  }

  // Save updated transcript
  await prisma.whatsappConversation.update({
    where: { id: convo.id },
    data: { fullTranscript: ctx.transcript as any }
  });
});

export default router;
```

### Voice note transcription

```tsx
// services/stt/deepgram.ts (REST one-shot for short audio)
import { createClient } from "@deepgram/sdk";
const dg = createClient(process.env.DEEPGRAM_API_KEY!);

export async function transcribeAudioUrl(url: string, sid: string, token: string): Promise<string> {
  // Twilio-hosted media needs basic auth
  const res = await fetch(url, {
    headers: { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64") }
  });
  const audio = Buffer.from(await res.arrayBuffer());

  const { result } = await dg.listen.prerecorded.transcribeFile(audio, {
    model: "nova-2", language: "en-IN", smart_format: true
  });
  return result?.results.channels[0].alternatives[0].transcript ?? "";
}
```

---

## 20.  Step 10 — Recommendation Engine

Per the BRD: *“suggest items based on previous orders, time of day, and popular menu items.”*

```tsx
// services/orders/recommend.ts
export async function getRecommendations(restaurantId: string, customerPhone: string) {
  const customer = await prisma.customer.findUnique({
    where: { restaurantId_phone: { restaurantId, phone: customerPhone } },
    include: {
      // Aggregate from orders
    }
  });

  const recs: string[] = [];

  // 1. Past favorites — items this customer has ordered 2+ times
  const pastOrders = await prisma.order.findMany({
    where: { restaurantId, customerPhone },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  const itemFrequency: Record<string, number> = {};
  for (const o of pastOrders) {
    for (const item of o.items as any[]) {
      itemFrequency[item.name] = (itemFrequency[item.name] ?? 0) + item.qty;
    }
  }
  const favorites = Object.entries(itemFrequency)
    .filter(([_, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => name);

  // 2. Time-of-day popular (last 30 days, this hour ± 2)
  const hour = new Date().getHours();
  const timePopular = await prisma.$queryRaw<Array<{name: string}>>`
    SELECT (item->>'name') AS name, SUM((item->>'qty')::int) AS qty
    FROM orders, jsonb_array_elements(items) item
    WHERE restaurant_id =${restaurantId}
      AND created_at > now() - interval '30 days'
      AND EXTRACT(HOUR FROM created_at) BETWEEN${hour - 2} AND${hour + 2}
    GROUP BY name ORDER BY qty DESC LIMIT 2
  `;

  return [...favorites, ...timePopular.map(t => t.name)].slice(0, 3);
}
```

The state machine can call this at the GREETING stage and inject recommendations into the prompt: *“By the way, you’ve often ordered Paneer Butter Masala. Would you like that today?”*

---

## 21.  Step 11 — Payment Link Generation (Razorpay)

```tsx
// services/payment/razorpay.ts
import Razorpay from "razorpay";

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function createPaymentLink(args: {
  amountPaise: number; orderId: string; customerPhone: string; restaurantName: string;
}): Promise<string> {
  const link = await rzp.paymentLink.create({
    amount: args.amountPaise,
    currency: "INR",
    description: `Order from${args.restaurantName}`,
    customer: { contact: args.customerPhone },
    notify: { sms: false, email: false },        // we send our own WhatsApp
    callback_url: `${process.env.PUBLIC_URL}/razorpay/callback?order_id=${args.orderId}`,
    callback_method: "get",
    notes: { order_id: args.orderId }
  } as any);
  return link.short_url;
}
```

After link generation, send via WhatsApp:

```tsx
async function sendPaymentLinkWhatsApp(order: any, restaurant: any, linkUrl: string) {
  await twClient.messages.create({
    from: `whatsapp:${restaurant.whatsappNumber}`,
    to: `whatsapp:${order.customerPhone}`,
    body: `Hi! Your order from${restaurant.name} is ready for confirmation. Total: ₹${order.totalPaise/100}\n\nPay here:${linkUrl}`
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { paymentLinkUrl: linkUrl, paymentStatus: "link_sent" }
  });
}
```

### Webhook for payment confirmation

```tsx
router.post("/razorpay/webhook", express.raw({type:"*/*"}), async (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const body = req.body.toString();
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body).digest("hex");
  if (signature !== expected) return res.status(400).send("invalid signature");

  const data = JSON.parse(body);
  if (data.event === "payment_link.paid") {
    const orderId = data.payload.payment_link.entity.notes.order_id;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "paid",
        razorpayPaymentId: data.payload.payment.entity.id
      }
    });
    // (notify customer, mark ready for kitchen)
  }
  res.sendStatus(200);
});
```

---

## 22. Step 12 — POS / Kitchen Webhook Out

Send confirmed orders to the restaurant’s existing system.

```tsx
// services/pos/dispatcher.ts
import crypto from "crypto";
import axios from "axios";

export async function dispatchToPOS(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId }, include: { restaurant: true }
  });
  if (!order || !order.restaurant.posWebhookUrl) return;

  const payload = {
    order_id: order.id,
    items: order.items,
    total_paise: order.totalPaise,
    customer_phone: order.customerPhone,
    delivery_address: order.deliveryAddress,
    notes: order.notes,
    placed_at: order.createdAt
  };

  const signature = crypto
    .createHmac("sha256", order.restaurant.posApiKey ?? "")
    .update(JSON.stringify(payload))
    .digest("hex");

  try {
    await axios.post(order.restaurant.posWebhookUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Order-Signature": signature
      },
      timeout: 5000
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { posDispatchedAt: new Date(), status: "confirmed" }
    });
  } catch (err) {
    console.error("POS dispatch failed:", err);
    // Retry queue (BullMQ): enqueue for later
  }
}
```

For restaurants without a webhook, the **Live Orders dashboard** (Step 26) is their kitchen view.

---

## 23. Step 13 — Status Updates & Customer Notifications

When a kitchen marks an order as “preparing → out_for_delivery → delivered” (via dashboard or POS callback), notify the customer on WhatsApp.

```tsx
// services/notifications/whatsapp.ts
const STATUS_MESSAGES: Record<string, string> = {
  confirmed: "Your order has been confirmed! 🎉 We'll start preparing it now.",
  preparing: "We're cooking your order right now 👨‍🍳",
  out_for_delivery: "Your order is on the way! 🛵 ETA 25 mins.",
  delivered: "Enjoy your meal! 🍽️ Reply with feedback anytime."
};

export async function notifyStatusChange(orderId: string, newStatus: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId }, include: { restaurant: true }
  });
  if (!order || !order.customerPhone) return;
  const msg = STATUS_MESSAGES[newStatus];
  if (!msg) return;

  await twClient.messages.create({
    from: `whatsapp:${order.restaurant.whatsappNumber}`,
    to: `whatsapp:${order.customerPhone}`,
    body: `${msg}\n\nOrder #${order.id.slice(0,6).toUpperCase()}`
  });
}
```

Trigger this from a Postgres trigger on `orders.status` change OR explicitly in routes that update status.

---

## 24. Step 14 — Reporting & Analytics

```tsx
// routes/reports.ts
router.get("/dashboard", requireAuth, async (req, res) => {
  const restaurantId = req.restaurantId!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayOrders, todayRevenue, missedCalls, avgOrderValue, topItems] = await Promise.all([
    prisma.order.count({ where: { restaurantId, createdAt: { gte: today } } }),
    prisma.order.aggregate({
      _sum: { totalPaise: true },
      where: { restaurantId, paymentStatus: "paid", createdAt: { gte: today } }
    }),
    prisma.call.count({
      where: { restaurantId, status: "abandoned", createdAt: { gte: today } }
    }),
    prisma.order.aggregate({
      _avg: { totalPaise: true },
      where: { restaurantId, createdAt: { gte: today } }
    }),
    prisma.$queryRaw`
      SELECT (item->>'name') AS name, SUM((item->>'qty')::int) AS qty
      FROM orders, jsonb_array_elements(items) item
      WHERE restaurant_id =${restaurantId}
        AND created_at >=${today}
      GROUP BY name ORDER BY qty DESC LIMIT 5
    `
  ]);

  res.json({
    today_orders: todayOrders,
    today_revenue_paise: todayRevenue._sum.totalPaise ?? 0,
    missed_calls: missedCalls,
    aov_paise: avgOrderValue._avg.totalPaise ?? 0,
    top_items: topItems
  });
});
```

---

## 25.  Step 15 — Frontend: Setup, Routing, Auth

Standard Vite + Shadcn + AuthContext (skipping boilerplate). Routes:

```tsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/"                   element={<LiveOrders />} />
    <Route path="/orders/:id"         element={<OrderDetail />} />
    <Route path="/menu"               element={<Menu />} />
    <Route path="/conversations/:id"  element={<ConversationReplay />} />
    <Route path="/reports"            element={<Reports />} />
    <Route path="/settings"           element={<Settings />} />
  </Route>
</Routes>
```

---

## 26. Step 16 — Frontend: Live Order Console

The kitchen’s main screen. Shows active calls + recent orders, real-time.

```tsx
import { useEffect, useState } from "react";
import { supabase } from "../api/supabase";

export default function LiveOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch
    supabase.from("orders").select("*")
      .order("created_at", { ascending: false })
      .limit(20).then(({ data }) => setOrders(data ?? []));

    supabase.from("calls").select("*").eq("status", "in_progress")
      .then(({ data }) => setActiveCalls(data ?? []));

    // Realtime subscriptions
    const ch = supabase.channel("orders-live")
      .on("postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          (payload) => {
            setOrders(prev => {
              const idx = prev.findIndex(o => o.id === (payload.new as any)?.id);
              if (payload.eventType === "INSERT") return [payload.new, ...prev].slice(0, 20);
              if (payload.eventType === "UPDATE" && idx >= 0) {
                const next = [...prev]; next[idx] = payload.new; return next;
              }
              return prev;
            });
          })
      .on("postgres_changes",
          { event: "*", schema: "public", table: "calls" },
          () => {
            supabase.from("calls").select("*").eq("status", "in_progress")
              .then(({ data }) => setActiveCalls(data ?? []));
          })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="p-6 grid grid-cols-3 gap-6">
      <div className="col-span-2">
        <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
        {orders.map(o => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
      <div>
        <h2 className="text-xl font-bold mb-4">📞 Active Calls ({activeCalls.length})</h2>
        {activeCalls.map(c => (
          <Card key={c.id} className="p-3 mb-2 border-l-4 border-l-green-500">
            <div className="text-sm font-mono">{c.caller_phone}</div>
            <div className="text-xs text-muted-foreground">
              Started {timeAgo(c.started_at)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: any) {
  const updateStatus = async (newStatus: string) => {
    await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
  };
  return (
    <Card className="p-4 mb-3">
      <div className="flex justify-between">
        <div>
          <div className="font-semibold">#{order.id.slice(0,6).toUpperCase()} · {order.customer_phone}</div>
          <div className="text-sm">{(order.items as any[]).map(i => `${i.qty}× ${i.name}`).join(", ")}</div>
          <div className="text-xs text-muted-foreground">{order.delivery_address}</div>
        </div>
        <div className="text-right">
          <div className="font-mono">₹{(order.total_paise / 100).toFixed(0)}</div>
          <Badge>{order.status}</Badge>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        {["pending","confirmed","preparing","out_for_delivery","delivered"].map(s => (
          <Button key={s} size="sm" variant={order.status === s ? "default" : "outline"}
                  onClick={() => updateStatus(s)}>
            {s.replace("_", " ")}
          </Button>
        ))}
      </div>
    </Card>
  );
}
```

---

## 27. Step 17 — Frontend: Menu Manager

Standard CRUD table → clicking add/edit opens a modal. Validation: name required, price > 0, aliases as comma-separated tags. Skipping boilerplate.

📌 **Save aliases generously.** “Paneer Butter Masala” should also have aliases `["PBM", "paneer butter", "butter paneer"]`. Improves STT match rate.

---

## 28.  Step 18 — Frontend: Conversation Replay

Audio player + synchronized transcript. Critical for debugging “why did the AI mishear?”

```tsx
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";

export default function ConversationReplay() {
  const { id } = useParams<{ id: string }>();
  const { data: call } = useQuery({
    queryKey: ["call", id],
    queryFn: () => api.get(`/calls/${id}`).then(r => r.data)
  });
  if (!call) return <p>Loading...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Call from {call.caller_phone}</h1>
      <div className="my-4">
        {call.recording_url && <AudioPlayer src={call.recording_url} />}
      </div>
      <div className="space-y-2">
        {(call.full_transcript as any[]).map((t, i) => (
          <div key={i} className={t.role === "user" ? "text-left" : "text-right"}>
            <div className={`inline-block max-w-2xl p-3 rounded-lg ${
              t.role === "user" ? "bg-muted" : "bg-primary text-primary-foreground"
            }`}>
              <div className="text-xs opacity-70 mb-1">
                {t.role === "user" ? "Customer" : "AI"} · {new Date(t.ts).toLocaleTimeString()}
              </div>
              {t.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

📌 **Twilio recording requires explicit setup:** add `<Record />` to your TwiML or enable recording on the Twilio number. This is a Phase 2 feature for most students — start with text-only transcripts.

---

## 29.  Step 19 — Frontend: Reports

Standard Recharts dashboards on the `/reports/dashboard` API. Today’s revenue, top items, peak hours, missed calls. Skipping boilerplate.

---

## 30.  Step 20 — Testing

### Local end-to-end voice test

```bash
# Terminal 1
npm run dev      # OR uvicorn app.main:app --reload --port 3000

# Terminal 2
ngrok http 3000

# Update Twilio number webhook to https://YOUR_NGROK.ngrok.io/twilio/voice/incoming

# Call your Twilio number from any phone
```

### What to listen for

- Greeting plays within 2 seconds of call connecting
- After your speech, AI responds in <2 seconds
- AI doesn’t interrupt you mid-sentence
- AI doesn’t go quiet for >3 seconds
- AI confirms the order accurately before finalizing

### Test Checklist (BRD Section 8)

- [ ]  **Voice:** Place a 3-item order via phone call. Verify items captured correctly.
- [ ]  **Voice:** Try Hinglish: “Bhai do paneer butter masala bhejdo.” AI should understand.
- [ ]  **Voice:** Say “Talk to a person” — AI should hand off.
- [ ]  **WhatsApp text:** Send “Menu” → bot lists items.
- [ ]  **WhatsApp voice note:** Record “I want 2 pizzas” — STT transcribes, AI orders.
- [ ]  **Order finalization:** Final summary spoken. After “yes,” WhatsApp gets payment link.
- [ ]  **Razorpay test card** completes payment → order status flips to `paid`.
- [ ]  **Status update:** Mark order “preparing” in dashboard → customer gets WhatsApp message.
- [ ]  **POS dispatcher:** Verify webhook to your test endpoint receives the order with HMAC signature.
- [ ]  **Multi-tenant:** Two restaurants with two different Twilio numbers — orders never cross-contaminate.
- [ ]  **Latency:** Time from “I want pizza” to AI’s first word reply: <2 seconds.

---

## 31.  Step 21 — Deployment

### Backend → Render

- **Web service** (handles HTTP + WebSocket)
- ⚠️ Render free tier sleeps after 15 min idle — **first call after sleep takes 30s**. Use paid tier (~₹1500/mo) or Fly.io free tier (better for WebSockets).

### Database → Supabase

- Run migrations
- Enable Realtime on `orders` and `calls` tables for the live console

### Frontend → Vercel

### Twilio webhooks (production)

Update Twilio number webhooks from ngrok URL to `https://your-prod-domain.com/twilio/voice/incoming`. Add `https://...status` for the status callback.

### Production Pre-Flight Checklist

- [ ]  WebSocket endpoint accessible at `wss://your-domain.com/voice-stream`
- [ ]  Twilio status callback configured
- [ ]  HMAC signature verification on Razorpay webhook (Step 21)
- [ ]  HMAC signature on POS dispatcher (Step 22)
- [ ]  Rate limit on `/twilio/whatsapp/inbound` (someone could DoS)
- [ ]  WhatsApp templates submitted + approved (proactive messages need them)
- [ ]  Phone numbers in DLT registry if using SMS fallback
- [ ]  Voice recording consent disclaimer in greeting (legal)
- [ ]  Backup: when Deepgram or ElevenLabs are down, what happens? (Twilio default voice as fallback)

---

## 32.  Common Pitfalls & How to Avoid Them

| Pitfall | Symptom | Fix |
| --- | --- | --- |
| Slow first response | AI takes 4+ sec to answer first user input | Pre-warm Deepgram + Anthropic connections during greeting |
| Audio format mismatch | Caller hears static or silence | Always request ulaw_8000 from ElevenLabs directly |
| LLM forgets cart | After 3 turns, AI re-asks for items | Pass full transcript + cart in every prompt; rely on state machine, not just context |
| WebSocket drops mid-call | Call ends abruptly | Add reconnection logic; keep transcript in Redis to resume |
| TTS not cached | Every call spends 600ms on every reply | Cache by hash; pre-warm common phrases at deploy |
| LLM invents menu items | “Paneer in tandoor sauce” suggested | Pass exact menu in prompt; system prompt: “Never invent” |
| Twilio webhook 5s timeout | Call drops if any handler is slow | Always respond <500ms; do work async |
| Razorpay webhook unsigned | Anyone can mark orders as paid | Always verify HMAC |
| State machine drift | After 5 turns, conversation goes off-rails | Use enum states + explicit transitions, not pure LLM intent |
| Voice activity detection too aggressive | AI cuts caller off mid-sentence | endpointing=200ms is borderline; use 300ms if needed |
| WhatsApp 24-hour window | Outbound to old customer fails | Use templated messages for proactive sends |
| Multiple Prisma instances | Connection pool exhausted | Singleton pattern (same as previous projects) |
| Long menu in prompt | Latency creeps up | Limit to top 50 items by category for prompt; keep full list in DB |
| Free Render tier cold start | First call after sleep loses 30s | Pay for paid tier OR use Fly.io |

---

## 33.  Week-by-Week Build Schedule (15 hrs/week)

| Week | Goals |
| --- | --- |
| **1** | Setup, Twilio number, ngrok, basic auth, menu CRUD |
| **2** | TwiML inbound endpoint, dummy `<Say>` greeting that plays |
| **3** | **WebSocket connection working** with Twilio Media Streams (just log audio bytes) |
| **4** | **Deepgram streaming STT** wired to WebSocket. Print transcripts. |
| **5** | First Anthropic function-call response → speak via ElevenLabs (round trip!) |
| **6** | Conversation state machine, cart management, order finalization |
| **7** | TTS caching, latency tuning, reduce response time to <2s |
| **8** | WhatsApp inbound (text + voice notes) reusing the same brain |
| **9** | Razorpay payment links + webhook + WhatsApp delivery |
| **10** | POS dispatcher, status updates, customer notifications |
| **11** | Live Orders dashboard, conversation replay, reports |
| **12** | Testing, deployment, end-to-end verification |

⚠️ **Week 3 is the make-or-break week.** If you can’t get a Twilio Media Stream WebSocket connected and printing audio bytes, the rest doesn’t matter. Allocate generously.

---

## 34. Cost Estimate (Monthly — Student / MVP)

| Item | Cost |
| --- | --- |
| Render web (paid tier for WebSockets) | ~₹1,500 |
| Vercel free | ₹0 |
| Supabase free | ₹0 |
| Upstash Redis free | ₹0 |
| Twilio (~500 minutes calls @ ₹1.5/min) | ~₹750 |
| Twilio WhatsApp | ~₹400 |
| Deepgram (~500 mins STT) | ~₹400 |
| Anthropic Haiku (~5K turns) | ~₹250 |
| ElevenLabs (Starter plan, 30K chars) | ~₹450 |
| Razorpay test mode | ₹0 |
| Domain (optional) | ~₹100 |
| **Total** | **₹3,500–₹4,000/mo** |

📌 **Cost-saving for students:** use Whisper local (Python) + Piper local TTS = ₹0 STT/TTS. Slower (~3-4s response) but free for development.

---

## 35.  What You’ll Learn

- ✅ **First real-time voice AI project** — entire new architectural mental model
- ✅ Twilio Voice + Media Streams (industry-standard telephony)
- ✅ WebSocket bidirectional streaming
- ✅ Real-time STT (Deepgram)
- ✅ Streaming TTS with caching (ElevenLabs)
- ✅ AI **function calling** for structured output (not JSON parsing)
- ✅ **State machine + LLM hybrid** — production pattern
- ✅ Latency engineering — every millisecond matters
- ✅ Multi-channel architecture (voice + WhatsApp share one brain)
- ✅ Audio format handling (mu-law, PCM, sample rates)
- ✅ Payments via Razorpay with HMAC webhooks
- ✅ A genuinely impressive project for any AI engineer interview

---

## 36.  Glossary

| Term | Meaning |
| --- | --- |
| **TwiML** | Twilio Markup Language — XML that controls call flow |
| **Media Streams** | Twilio feature: bidirectional WebSocket audio with the caller |
| **mu-law (μ-law)** | Audio compression used in telephony, 8kHz |
| **PCM** | Uncompressed audio (Pulse-Code Modulation) |
| **VAD** | Voice Activity Detection — when did the user stop talking? |
| **Endpointing** | The “silence threshold” before VAD declares end-of-speech |
| **TTFT** | Time To First Token — how fast LLM starts replying |
| **Function calling** | LLM-native structured tool invocation (vs. parsing JSON) |
| **Streaming TTS** | TTS that returns audio chunks as it generates, vs all-at-once |
| **BSP** | WhatsApp Business Solution Provider |
| **HMAC** | Cryptographic signature for verifying webhook authenticity |
| **State machine** | Discrete states + explicit transitions for dialogue flow |

---

## 37.  Appendices

### Appendix A — BRD ↔︎ Build Mapping

| BRD Item | Implemented In |
| --- | --- |
| 5.1 Voice-Based Order Processing | Steps 4-8 (TwiML + WS + STT + LLM + TTS) |
| 5.2 WhatsApp Ordering Automation | Step 9 |
| 5.3 Recommendation Engine | Step 10 |
| 5.4 Order Management Integration | Step 12 (POS dispatcher) |
| 5.5 Payment and Billing Automation | Step 11 (Razorpay) |
| 5.6 Delivery and Status Updates | Step 13 |
| 5.7 Reporting and Analytics | Step 14 |
| 5.8 Multi-Language Support | Deepgram language: “en-IN” handles Hinglish; Phase 2 for Telugu/Tamil |
| Risks: Voice recognition errors | Confirmation step in state machine + escape phrase handoff |
| Risks: WhatsApp API restrictions | Templated proactive messages; user-initiated flows are unrestricted |
| Risks: System downtime | Multi-instance Render deploys + Twilio retry behavior |
| Business Rule: Orders confirmed before processing | State machine `confirming_items` step is mandatory |

### Appendix B — Latency Budget Cheat Sheet

```
TARGET: <1500ms from user's last word to AI's first audio chunk

Acceptable budget:
  VAD endpointing:           200ms   (Deepgram)
  Final transcript ready:     50ms   (Deepgram already had partials)
  LLM TTFT (Haiku):          500ms   (Anthropic)
  LLM complete intent:       300ms   (Anthropic; with streaming you start TTS earlier)
  TTS first chunk:           250ms   (ElevenLabs)
  Network + Twilio:          150ms
  ─────────────────────────────────
  TOTAL:                    1450ms

Tricks to compress:
  - TTS cache hit: skip ~500ms
  - LLM streaming → TTS streaming: cut ~200ms more
  - Same-region servers (Mumbai for India): cut ~100ms
```

### Appendix C — cURL Quick Tests

```bash
# Test menu CRUD
curl -X POST http://localhost:3000/menu/items \
  -H "Authorization: Bearer JWT" -H "Content-Type: application/json" \
  -d '{"name":"Paneer Butter Masala","aliases":["PBM","butter paneer"],"pricePaise":29900,"isVeg":true}'

# Simulate Twilio voice webhook (won't work fully without WS but verifies TwiML)
curl -X POST http://localhost:3000/twilio/voice/incoming \
  -d "From=+919876543210&To=+18001234567&CallSid=CA123"

# Simulate WhatsApp inbound
curl -X POST http://localhost:3000/twilio/whatsapp/inbound \
  -d "From=whatsapp:+919876543210&To=whatsapp:+18001234567&Body=Hi+I+want+pizza"

# Manual order creation (admin)
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer JWT" -H "Content-Type: application/json" \
  -d '{"channel":"manual","items":[{"name":"Paneer Butter Masala","qty":2,"price":299}],"customerPhone":"+919876543210"}'
```

### Appendix D — ElevenLabs Output Formats Reference

```
ulaw_8000           ← USE THIS for Twilio voice — no conversion needed!
mp3_44100_128       ← high quality, needs conversion for telephony
pcm_16000           ← clean PCM, needs ffmpeg → mulaw
pcm_24000           ← higher quality PCM, same conversion need
```