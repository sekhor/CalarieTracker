# Implementation Technology and Architecture Guide

## Purpose

This document explains the implementation technology and architecture used in this repository so it can be reused as a practical skill guide when creating a new project of a similar type.

This project is a **full-stack calorie tracking and nutrition coaching application** with:

- a **React frontend**
- a **Node.js + Express backend**
- **MSSQL** as the primary database
- a **local JSON fallback store** for resilience and demo mode
- **Azure OpenAI** integration for meal image analysis and nutrition chat

---

## 1. High-Level Architecture

The repository follows a **monorepo with separated client and server apps**.

```text
root/
├─ client/   -> React + Vite frontend
├─ server/   -> Express API + data/services layer
├─ docs/     -> architecture and implementation notes
└─ package.json -> root scripts for running both apps together
```

### Architecture style

This solution uses a **layered full-stack architecture**:

1. **Presentation layer**: React UI in `client/src`
2. **API layer**: Express routes in `server/src/routes`
3. **Business/service layer**: AI, retrieval, planning, insight logic in `server/src/services`
4. **Data access layer**: MSSQL and local JSON fallback in `server/src/config/db.js`
5. **Infrastructure layer**: environment variables, CORS, file upload, Azure OpenAI integration

This is a good architecture for a new project because it keeps responsibilities separated and makes it easier to expand features over time.

---

## 2. Technology Stack

## 2.1 Frontend Technologies

Located in: `C:\Users\khors\CalarieTracker\client`

- **React 19**
- **Vite** for frontend build/dev server
- **Axios** for API calls
- **Recharts** for charts and analytics visualizations
- **Lucide React** for icons
- **CSS-based custom design system** in `client/src/index.css`
- **Service Worker registration** for installability/PWA-like behavior

### Frontend implementation style

The frontend is implemented as a **single-page application (SPA)**.

Key characteristics:

- View switching is handled in `App.jsx` using local React state
- Shared API access is centralized in `client/src/services/api.js`
- Components are grouped by purpose:
  - `components/` for reusable UI pieces
  - `views/` for page-level screens
  - `hooks/` for custom hooks
  - `utils/` for helper functions

### Frontend skills demonstrated

To build a similar new project, the main frontend skills are:

- setting up a React app with Vite
- organizing a SPA without a heavy routing dependency
- building reusable components
- managing state with `useState`, `useEffect`, and `useMemo`
- centralizing backend communication with Axios
- handling auth tokens in browser storage
- building responsive dashboards and charts
- styling with a custom CSS token system

---

## 2.2 Backend Technologies

Located in: `C:\Users\khors\CalarieTracker\server`

- **Node.js**
- **Express 4**
- **dotenv** for environment configuration
- **cors** for origin control
- **multer** for file uploads
- **mssql** for Microsoft SQL Server access
- **axios** for calling Azure OpenAI APIs
- **nodemon** for backend development

### Backend implementation style

The backend is a **REST API server** with grouped route modules.

Main entry point:

- `server/src/index.js`

Major backend route groups:

- `auth`
- `meals`
- `analyze`
- `dashboard`
- `settings`
- `chat`
- `profile`
- `insights`
- `knowledge`
- `planner`

### Backend skills demonstrated

To create a similar backend, the main skills are:

- structuring an Express server by route modules
- adding middleware for auth and request parsing
- supporting file uploads with `multer`
- integrating with external AI APIs
- writing database-backed CRUD endpoints
- building service modules for business logic
- serving frontend static files in production
- supporting resilient fallback behavior when infrastructure is unavailable

---

## 2.3 Data Storage Technologies

Primary and fallback storage are both implemented.

### Primary database

- **Microsoft SQL Server (MSSQL)** via the `mssql` package

### Fallback database

- **JSON file storage** at `server/data/meals_data.json`

### Why this is architecturally useful

This is an example of a **resilient dual-storage strategy**:

- use MSSQL when available
- automatically fall back to local file storage if MSSQL connection fails

This makes the project easier to demo, test locally, and continue operating in degraded mode.

### Skills to reuse in a new project

- designing a persistence abstraction
- supporting primary + fallback data engines
- normalizing returned data shapes so the API stays consistent
- protecting business logic from infrastructure instability

---

## 2.4 AI and Intelligent Features

This project includes AI functionality through **Azure OpenAI**.

### AI capabilities implemented

1. **Meal image analysis**
   - image upload from frontend
   - backend processes image buffer
   - Azure OpenAI Vision-style chat completion estimates calories/macros

2. **Nutrition coach chat**
   - user sends question
   - backend classifies intent
   - system retrieves user context and knowledge context
   - prompt is constructed
   - Azure OpenAI chat generates a response
   - fallback response is generated if Azure is unavailable

3. **Knowledge ingestion and retrieval**
   - free text or uploaded documents can be stored
   - content is chunked
   - simple token scoring retrieves relevant chunks

4. **Meal planning and insights**
   - backend calculates patterns and generates recommendations

### Important architectural note

This is **not a pure vector database RAG architecture**.
It is closer to a **lightweight retrieval-augmented application pattern** using:

- chunking
- token-based matching
- contextual prompt building
- domain-specific fallback logic

That is actually a very useful skill for new projects because it is simpler and cheaper than full vector infrastructure.

---

## 3. Frontend Architecture

## 3.1 Main frontend structure

```text
client/src/
├─ App.jsx
├─ main.jsx
├─ components/
├─ views/
├─ services/
├─ hooks/
└─ utils/
```

### Responsibilities

- `main.jsx`
  - bootstraps React
  - imports global CSS
  - registers service worker

- `App.jsx`
  - acts as the frontend shell
  - manages auth bootstrap
  - loads initial data
  - switches between application views

- `services/api.js`
  - central API client
  - auth token storage helpers
  - Axios interceptors
  - all frontend-to-backend request functions

- `views/`
  - page-level features such as dashboard, scanner, planner, analytics, and chat

- `components/`
  - reusable smaller UI pieces like navbar, auth screen, meal modal, and image display

## 3.2 Frontend state strategy

The frontend mainly uses **local component state** instead of Redux/Zustand.

That means the project favors:

- simple state colocated with UI
- API-driven refresh patterns
- prop passing between the app shell and views

This is a good fit for a medium-sized application without highly complex shared client state.

## 3.3 Frontend integration pattern

The frontend talks to the backend through Axios using:

- a shared base URL
- request interceptors for bearer token auth
- response interceptors to clear auth on `401`

This is a strong reusable pattern for new applications.

---

## 4. Backend Architecture

## 4.1 Main backend structure

```text
server/src/
├─ index.js
├─ config/
│  └─ db.js
├─ middleware/
│  └─ auth.js
├─ routes/
├─ services/
└─ utils/
```

## 4.2 Request flow

Typical backend flow:

1. Client sends request
2. Express route receives request
3. Auth middleware validates bearer token if required
4. Route calls database helpers and/or service layer functions
5. Result is normalized into API response JSON
6. Client updates UI state

## 4.3 Route-layer responsibilities

The route layer handles:

- endpoint definitions
- request validation
- auth protection
- request parsing
- error handling
- returning HTTP responses

This layer should stay relatively thin.

## 4.4 Service-layer responsibilities

The service layer handles deeper business logic such as:

- Azure OpenAI requests
- chat orchestration
- classification
- retrieval
- insight generation
- safety checks
- meal planning
- knowledge ingestion
- coach memory updates

This separation is one of the most important reusable architecture skills in the project.

---

## 5. Authentication Architecture

Authentication is implemented with a **custom bearer token system**.

### How it works

1. User registers or logs in
2. Server generates a random token
3. Server stores a **SHA-256 hash** of the token
4. Raw token is returned to the client
5. Client stores token in `localStorage`
6. Client sends `Authorization: Bearer <token>`
7. Middleware hashes incoming token and compares it with stored token hash

### Benefits

- simple to implement
- no JWT dependency required
- token is not stored in raw form on the backend
- enough for a controlled app architecture

### Skills to reuse

- custom token authentication
- auth middleware design
- session bootstrap on frontend load
- protected API route design

### Limitation to understand

This is not a full enterprise identity solution. For a larger production system, you might later evolve this into:

- JWT + refresh token architecture
- OAuth/OpenID Connect
- external identity providers

---

## 6. Database and Persistence Architecture

The data layer is centralized in:

- `server/src/config/db.js`

This file handles:

- MSSQL connection
- local JSON fallback storage
- table initialization
- CRUD helper functions
- user data storage
- chat/session persistence
- knowledge document persistence
- profile and goals persistence
- coach memory persistence

### Architectural pattern used

This is a **repository-like centralized data access module**.

Even though it is not split into many repository files yet, it still demonstrates an important principle:

- keep persistence logic out of route handlers where possible

### Good reusable design idea

Return the same logical shape whether the current engine is:

- `mssql`
- `local_fallback`

That allows upper layers to remain mostly engine-agnostic.

---

## 7. AI Feature Architecture

## 7.1 Meal image analysis flow

```text
Frontend upload -> Express route -> multer parses file
-> azureOpenAI service -> Azure OpenAI API
-> structured nutrition JSON -> saved as meal record
```

### Reusable skills

- multipart upload handling
- image buffer processing
- prompt engineering for structured JSON output
- parsing and validating model output
- fallback simulation when external AI is unavailable

## 7.2 Nutrition coach chat flow

```text
User question
-> classify intent
-> load history/context
-> retrieve relevant data
-> build prompt
-> call Azure chat
-> fallback if needed
-> save messages and memories
```

### Reusable skills

- conversational workflow orchestration
- context-aware prompt construction
- safety filtering
- domain-specific response fallbacks
- storing conversational history

## 7.3 Knowledge ingestion flow

```text
User text/file
-> normalize text
-> chunk content
-> save chunks
-> retrieve matches by token overlap
```

### Reusable skills

- content ingestion pipeline design
- chunking strategy
- simple retrieval logic without vector search
- grounding AI responses in user-owned documents

---

## 8. API Design Pattern

The project uses a **REST-style API design**.

Examples:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/meals`
- `POST /api/meals`
- `PUT /api/meals/:id`
- `DELETE /api/meals/:id`
- `POST /api/analyze`
- `GET /api/dashboard/stats`
- `GET /api/chat/sessions`
- `POST /api/chat/message`
- `GET /api/profile`
- `POST /api/profile`
- `GET /api/knowledge`
- `POST /api/knowledge/text`
- `POST /api/knowledge/upload`
- `POST /api/planner/meal-plan`

### Good reusable API skills

- keeping route names feature-based
- separating resource CRUD from AI workflows
- protecting private resources with middleware
- returning consistent JSON payloads

---

## 9. Deployment and Runtime Architecture

## 9.1 Development runtime

The root project runs both apps together using `concurrently`.

Root scripts:

- `npm run dev` -> server + client together
- `npm run dev:server`
- `npm run dev:client`

### Development pattern

- frontend runs on Vite dev server
- backend runs on Express/nodemon
- Vite proxies `/api` calls to backend

## 9.2 Production runtime

The backend can serve the built frontend static files if a client build exists.

That means the production deployment can be simplified to:

- build frontend
- run backend
- backend serves `client/dist`

This is a common and very practical full-stack deployment pattern.

---

## 10. Key Architecture Strengths

This project demonstrates several strong implementation patterns that are valuable for new projects:

1. **Monorepo separation of frontend and backend**
2. **Layered backend structure**
3. **Centralized API client on frontend**
4. **Custom auth middleware**
5. **Resilient primary/fallback persistence model**
6. **Feature-based route organization**
7. **AI orchestration separated into services**
8. **Document ingestion and lightweight retrieval**
9. **Production serving of frontend from backend**
10. **Graceful fallback behavior when AI or DB is unavailable**

---

## 11. Skills Checklist for Creating a New Similar Project

If you want to use this repository as a skill blueprint, these are the implementation skills to learn and reuse.

### Full-stack foundation

- create a monorepo with `client` and `server`
- define root scripts to run both apps
- configure environment variables cleanly

### Frontend skills

- build a React SPA with Vite
- structure screens into views and reusable components
- create a centralized Axios API service
- manage auth state and token persistence
- build dashboard analytics and charts
- implement file upload UI
- add installable app behavior via service worker registration

### Backend skills

- build modular Express route handlers
- add middleware for auth, CORS, JSON parsing, and uploads
- design REST endpoints by feature area
- separate route handlers from service/business logic

### Data skills

- integrate with MSSQL
- create fallback local persistence
- normalize data shapes across storage engines
- store user profiles, chat history, and domain data

### AI skills

- call Azure OpenAI from backend
- design prompts that return structured JSON
- build chat orchestration pipelines
- retrieve app context before LLM calls
- create fallback logic when AI services fail

### Architecture skills

- design around layers and responsibilities
- keep infrastructure concerns isolated
- make the app resilient to dependency failure
- organize code for feature growth rather than only for initial speed

---

## 12. Recommended Template for a New Project

If you want to create a new project with the same architecture style, use this template:

```text
new-project/
├─ client/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ views/
│  │  ├─ services/
│  │  ├─ hooks/
│  │  └─ utils/
├─ server/
│  ├─ src/
│  │  ├─ config/
│  │  ├─ middleware/
│  │  ├─ routes/
│  │  ├─ services/
│  │  └─ utils/
├─ docs/
└─ package.json
```

### Suggested implementation order

1. create monorepo structure
2. set up frontend and backend independently
3. connect frontend to backend with proxy/API service
4. implement auth
5. implement core CRUD domain model
6. add analytics/dashboard aggregation
7. add AI features behind service modules
8. add fallback and resilience strategies
9. document architecture in `docs/`

---

## 13. Conclusion

This project is a strong example of how to build a **practical AI-enabled full-stack application** using straightforward technologies instead of overly complex infrastructure.

The most reusable skill is not just the choice of tools, but the combination of these architectural decisions:

- separate frontend and backend clearly
- keep API, service, and data concerns distinct
- centralize integrations
- build with fallback paths
- make AI features modular instead of scattering them through routes and UI

If you can reproduce those patterns, you can create a new project with similar quality and scalability.