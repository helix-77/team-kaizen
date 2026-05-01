# RentPi — Microservices Rental Platform

> **Team Kaizen** · HACKSPARK Hackathon — *TECHNOCRACY LITE, Dept. of ECE, RUET*

A full-stack rental marketplace rebuilt from the ground up as a **6-service microservices architecture**. RentPi lets users browse, search, and analyse rental data backed by a Central API containing 10 million+ transactions, 500K+ products, and 100K+ users.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Service Details](#service-details)
  - [API Gateway](#1-api-gateway-port-8000)
  - [User Service](#2-user-service-port-8001)
  - [Rental Service](#3-rental-service-port-8002)
  - [Analytics Service](#4-analytics-service-port-8003)
  - [Agentic Service](#5-agentic-service-port-8004)
  - [Frontend](#6-frontend-port-3000)
- [Algorithms Implemented](#algorithms-implemented)
- [Bonus Features](#bonus-features)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Problem Coverage](#problem-coverage)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND (:3000)                        │
│                   HTML / CSS / JS SPA (Express)                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP (via browser)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (:8000)                        │
│           Express + http-proxy-middleware + CORS                 │
│   /status → aggregated health  |  /* → proxy to services       │
└──┬──────────┬──────────┬──────────┬──────────────────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
│ User   │ │ Rental │ │Analytics │ │ Agentic  │
│ :8001  │ │ :8002  │ │ :8003    │ │ :8004    │
│ (PG)   │ │        │ │          │ │ (Mongo)  │
└───┬────┘ └────────┘ └──────────┘ └──────────┘
    │         │  │         │            │
    ▼         └──┴─────────┴────────────┘
┌────────┐            │
│Postgres│    Central API (External)
│ :5432  │    https://technocracy.brittoo.xyz
└────────┘
┌────────┐
│MongoDB │
│ :27017 │
└────────┘
```

All inter-service communication uses **Docker internal DNS** (`http://service-name:port`). The frontend communicates exclusively through the API Gateway — never directly with downstream services or the Central API.

---

## Tech Stack

| Layer          | Technology                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| **Runtime**    | Node.js 20 (Alpine)                                                       |
| **Framework**  | Express.js                                                                 |
| **Gateway**    | `http-proxy-middleware`, `cors`, `axios`                                   |
| **Auth**       | `bcrypt` (hashing) + `jsonwebtoken` (JWT sessions)                        |
| **Database**   | PostgreSQL 16 (user data), MongoDB 7 (chat history)                       |
| **AI/LLM**     | Groq SDK (`llama-3.3-70b-versatile`)                                      |
| **Algorithms** | `@datastructures-js/priority-queue` (heaps), custom BFS, sliding window   |
| **Frontend**   | Vanilla HTML / CSS / JS — served by Express                               |
| **Infra**      | Docker, Docker Compose, multi-stage builds, Alpine base images             |

---

## Quick Start

### Prerequisites

- **Docker Desktop** v24+ with Docker Compose v2

### 1. Clone & configure

```bash
git clone <repo-url>
cd team-kaizen
cp .env.example .env
# Edit .env — paste your CENTRAL_API_TOKEN and GROQ_API_KEY
```

### 2. Build & run

```bash
docker compose up --build -d
```

### 3. Verify

Wait ~30 seconds for all health checks, then:

```bash
curl http://localhost:8000/status
```

Expected response:

```json
{
  "service": "api-gateway",
  "status": "OK",
  "downstream": {
    "user-service": "OK",
    "rental-service": "OK",
    "analytics-service": "OK",
    "agentic-service": "OK"
  }
}
```

### 4. Access

| URL                        | Description           |
| -------------------------- | --------------------- |
| `http://localhost:3000`     | Frontend SPA          |
| `http://localhost:8000`     | API Gateway           |
| `http://localhost:8000/status` | Health dashboard   |

---

## Service Details

### 1. API Gateway (Port 8000)

Central entry point for all client requests. Proxies traffic to downstream services and provides an aggregated health-check endpoint.

**Key endpoints:**

| Method | Path           | Upstream             |
| ------ | -------------- | -------------------- |
| GET    | `/status`      | Parallel health poll |
| `*`    | `/users/**`    | → User Service       |
| `*`    | `/rentals/**`  | → Rental Service     |
| `*`    | `/analytics/**`| → Analytics Service  |
| `*`    | `/chat/**`     | → Agentic Service    |

---

### 2. User Service (Port 8001)

Handles authentication, user profiles, and loyalty discount calculation.

**Key endpoints:**

| Method | Path                       | Description                       |
| ------ | -------------------------- | --------------------------------- |
| POST   | `/users/register`          | Register with email + password    |
| POST   | `/users/login`             | Returns JWT token                 |
| GET    | `/users/profile`           | JWT-protected profile + discount  |
| GET    | `/status`                  | Health check                      |

**Loyalty discount tiers (P6):**

| Security Score | Tier     | Discount |
| -------------- | -------- | -------- |
| ≥ 90           | Gold     | 15%      |
| ≥ 75           | Silver   | 10%      |
| ≥ 50           | Bronze   | 5%       |
| < 50           | Standard | 0%       |

---

### 3. Rental Service (Port 8002)

Proxies product/rental data from the Central API, applies algorithms, and enriches responses with pagination, filtering, and computational endpoints.

**Key endpoints:**

| Method | Path                            | Description                                |
| ------ | ------------------------------- | ------------------------------------------ |
| GET    | `/rentals/products`             | Paginated product listing with filters     |
| GET    | `/rentals/products/:id`         | Single product detail                      |
| GET    | `/rentals/availability/:id`     | Merged busy intervals + free windows (P7)  |
| GET    | `/rentals/cheapest`             | Top-K cheapest rentals via Min-Heap (P8)   |
| GET    | `/rentals/most-expensive`       | Top-K most expensive via Max-Heap (P9)     |
| GET    | `/rentals/device-graph/:id`     | BFS device dependency traversal (P10)      |
| GET    | `/rentals/feed`                 | Unified, merged rental feed (P12)          |
| GET    | `/status`                       | Health check                               |

---

### 4. Analytics Service (Port 8003)

Processes rental data for insights: time-series trends, peak detection, and seasonal recommendations.

**Key endpoints:**

| Method | Path                            | Description                                |
| ------ | ------------------------------- | ------------------------------------------ |
| GET    | `/analytics/peak-window`        | 7-day sliding window peak period (P11)     |
| GET    | `/analytics/time-series`        | Time-series rental trends (P12)            |
| GET    | `/analytics/price-spikes`       | Monotonic stack surge detection (P13)      |
| GET    | `/analytics/summary`            | Category summary statistics (P12)          |
| GET    | `/analytics/recommendations`    | Seasonal recommendation engine (P14)       |
| GET    | `/status`                       | Health check                               |

---

### 5. Agentic Service (Port 8004)

AI-powered chatbot grounded in real RentPi data. Uses Groq (Llama 3.3 70B) for natural language understanding with on-topic filtering and persistent conversation history.

**Key endpoints:**

| Method | Path                            | Description                                |
| ------ | ------------------------------- | ------------------------------------------ |
| POST   | `/chat`                         | Send message (with sessionId)              |
| GET    | `/chat/sessions`                | List all sessions (sorted by recency)      |
| GET    | `/chat/:sessionId/history`      | Full conversation history                  |
| DELETE | `/chat/:sessionId`              | Delete session + messages                  |
| GET    | `/status`                       | Health check                               |

**Features:**
- On-topic keyword filtering — off-topic messages return a canned refusal without consuming LLM tokens
- Real-time data grounding via internal calls to Analytics and Rental services
- Auto-generated session names via a lightweight LLM call on first message
- MongoDB-backed persistent history with session resume

---

### 6. Frontend (Port 3000)

Premium dark-mode SPA built with vanilla HTML/CSS/JS, served by Express.

**Pages:**

| Route            | Description                                                    |
| ---------------- | -------------------------------------------------------------- |
| `/login`         | Login form with JWT storage                                    |
| `/register`      | Registration form                                              |
| `/products`      | Paginated product list with category filter                    |
| `/availability`  | Product availability checker (merged intervals from P7)        |
| `/chat`          | Full chatbot with session sidebar, typing indicator, bubbles   |
| `/trending`      | Today's seasonal recommendations widget (P18)                  |
| `/profile`       | User profile with discount tier display (extra page)           |
| `/analytics`     | Category trends and surge calendar (extra page)                |

---

## Algorithms Implemented

Each algorithm is implemented as a **pure, testable function** isolated in `/algorithms` directories, separate from request-handling logic.

| Problem | Algorithm              | Technique                     | File                                       |
| ------- | ---------------------- | ----------------------------- | ------------------------------------------ |
| **P7**  | Availability Windows   | **Interval Merge** (sort + sweep) | `rental-service/src/algorithms/mergeIntervals.js`  |
| **P8**  | Cheapest K Rentals     | **Min-Heap** (priority queue) | `rental-service/src/algorithms/cheapestK.js`       |
| **P9**  | Most Expensive K       | **Max-Heap** (priority queue) | `rental-service/src/algorithms/mostExpensiveK.js`  |
| **P10** | Device Dependencies    | **BFS Graph Traversal**       | `rental-service/src/algorithms/deviceGraph.js`     |
| **P11** | 7-Day Peak Window      | **Sliding Window**            | `analytics-service/src/algorithms/peakWindow.js`   |
| **P13** | Price Surge Detection  | **Monotonic Stack**           | `analytics-service/src/algorithms/priceSpikes.js`  |

---

## Bonus Features

### B2: Graceful Rate Limit Handling (Exponential Backoff + Jitter)

Every service that calls the Central API uses a shared `centralApiClient.js` module:

- On `429` response → reads `retryAfterSeconds` from the JSON body
- Retries with `retryAfterSeconds × 2^attempt` with **±20% random jitter**
- Max **3 retries** with structured logging:
  ```
  [retry 1/3] waiting 18s before retrying GET /api/data/products
  ```
- After 3 failures → returns `503 Service Unavailable` with `lastRetryAfter` and `suggestion`

### B3: Clean Code & Modular Architecture

- Algorithms are isolated as pure functions in dedicated `/algorithms` directories
- Business logic separated from Express route handlers
- Centralized API client pattern across all services

---

## Project Structure

```
team-kaizen/
├── docker-compose.yml          # Orchestration for all 8 containers
├── .env.example                # Template — copy to .env
├── .gitignore
│
├── api-gateway/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── index.js            # Proxy + aggregated health check
│
├── user-service/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            # Express app entry
│       ├── db.js               # PostgreSQL pool + schema init
│       ├── centralApiClient.js # Shared API client with backoff
│       ├── middleware/
│       │   └── auth.js         # JWT verification middleware
│       └── routes/
│           └── users.js        # Auth + profile + discount logic
│
├── rental-service/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── centralApiClient.js
│       ├── algorithms/
│       │   ├── mergeIntervals.js   # P7: Interval merge
│       │   ├── cheapestK.js        # P8: Min-Heap
│       │   ├── mostExpensiveK.js   # P9: Max-Heap
│       │   └── deviceGraph.js      # P10: BFS graph
│       └── routes/
│           └── rentals.js
│
├── analytics-service/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── centralApiClient.js
│       ├── algorithms/
│       │   ├── peakWindow.js       # P11: Sliding window
│       │   └── priceSpikes.js      # P13: Monotonic stack
│       └── routes/
│           └── analytics.js
│
├── agentic-service/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── grounding.js        # Real-time data grounding for LLM
│       ├── models/
│       │   └── Conversation.js # MongoDB schemas (sessions + messages)
│       └── routes/
│           └── chat.js         # Groq LLM + history + session mgmt
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── server.js               # Express static file server
    └── public/
        ├── index.html          # SPA shell with router
        ├── style.css           # Premium dark-mode styles
        └── app.js              # Client-side routing + API integration
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable              | Required | Description                                |
| --------------------- | -------- | ------------------------------------------ |
| `CENTRAL_API_URL`     | ✅        | Central API base URL                       |
| `CENTRAL_API_TOKEN`   | ✅        | Team token (from judges)                   |
| `GROQ_API_KEY`        | ✅        | Groq API key for LLM-powered chatbot       |
| `JWT_SECRET`          | ✅        | Secret for JWT signing                      |
| `POSTGRES_USER`       | ✅        | Postgres username (default: `rentpi`)       |
| `POSTGRES_PASSWORD`   | ✅        | Postgres password                           |
| `POSTGRES_DB`         | ✅        | Postgres database name                      |
| `DATABASE_URL`        | ✅        | Full Postgres connection string             |
| `MONGO_URI`           | ✅        | MongoDB connection string                   |

> ⚠️ **Never commit `.env` to version control.** The `.gitignore` already excludes it.

---

## Problem Coverage

| #   | Problem                      | Status | Points |
| --- | ---------------------------- | ------ | ------ |
| P1  | Health Checks                | ✅      | 20     |
| P2  | User Authentication          | ✅      | 40     |
| P3  | Product Proxy                | ✅      | 30     |
| P4  | Docker Compose + Multistage  | ✅      | 40     |
| P5  | Paginated Product Listing    | ✅      | 50     |
| P6  | The Loyalty Discount         | ✅      | 35     |
| P7  | Is It Available?             | ✅      | 65     |
| P8  | The Record Day (Min-Heap)    | ✅      | 70+15  |
| P9  | Renter Favorites (Max-Heap)  | ✅      | 60+10  |
| P10 | The Long Vacation (BFS)      | ✅      | 65     |
| P11 | Seven-Day Rush (Sliding Win) | ✅      | 80     |
| P12 | The Unified Feed             | ✅      | 80     |
| P13 | Chasing the Surge (Mon.Stack)| ✅      | 55     |
| P14 | What's In Season?            | ✅      | 60+10  |
| P15 | RentPi Assistant (Groq LLM)  | ✅      | 80     |
| P16 | Chat That Remembers          | ✅      | 60     |
| P17 | The RentPi Dashboard         | ✅      | 80     |
| P18 | Trending Widget              | ✅      | 50     |
| P19 | Lean Images                  | ✅      | 40     |
| B2  | Graceful Rate Limit Handling | ✅      | +40    |
| B3  | Clean Code & Modularity      | ✅      | —      |

---

## Team Kaizen

Built with ☕ during HACKSPARK — *TECHNOCRACY LITE, Dept. of ECE, RUET*