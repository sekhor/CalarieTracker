# Nutrition Coach Chat Agent with Hybrid RAG — Technical Implementation Blueprint

## 1. Purpose

This document defines the implementation blueprint for adding a Nutrition Coach chat agent to the CalorieTracker application. The feature should allow authenticated users to chat with an assistant that can:

- answer questions using the user's meal, calorie, and macro history
- compare intake against goals
- explain trends and recurring habits
- provide practical nutrition guidance
- evolve into a hybrid RAG assistant that can also consult uploaded documents, recipes, and persistent memory

This blueprint is aligned to the current repository stack:

- Backend: Node.js + Express + CommonJS
- Frontend: React + Vite
- Auth: bearer token middleware already implemented
- Data storage: MSSQL with JSON local fallback
- AI integration: Azure OpenAI already used for meal photo analysis

---

## 2. Solution Summary

### 2.1 Target capability

Add an in-app chat experience that behaves like a nutrition coach and can answer prompts such as:

- "How am I doing today?"
- "What meals pushed me over calories this week?"
- "Why am I low on protein?"
- "What should I eat for dinner to stay under target?"
- "Review my eating habits and suggest improvements"

### 2.2 Architecture approach

Use a hybrid RAG design with three layers:

1. **Structured retrieval**
   - fetch user meals, goals, and trend summaries from MSSQL or local JSON fallback
2. **LLM reasoning**
   - Azure OpenAI chat completion produces grounded explanations and coaching suggestions
3. **Semantic retrieval (future phase)**
   - embeddings and vector search over uploaded docs, recipes, memory, and long-form content

For MVP, structured retrieval is the primary retrieval mechanism because the current app data is mostly structured and numerical.

---

## 3. Current Repository Alignment

Based on the existing codebase:

- authenticated API routes already use `requireAuth`
- meals are stored with calories and macros
- daily goals are already stored and returned by settings/dashboard endpoints
- Azure OpenAI configuration already exists in `server/src/services/azureOpenAI.js`
- dashboard analytics already compute today's totals and 7-day trends

This means the chat feature should be added incrementally rather than as a full platform rewrite.

---

## 4. Functional Scope

### 4.1 MVP scope

The first implementation should support:

- daily summary questions
- weekly summary questions
- calorie and macro goal adherence analysis
- meal history Q&A
- behavior pattern explanations
- meal recommendation prompts based on remaining calories/macros
- basic nutrition coaching with safety limits

### 4.2 Out of scope for MVP

Avoid in the first version:

- medical diagnosis
- supplement dosing guidance
- crash dieting advice
- automatic meal plan generation for complex clinical needs
- document-based semantic RAG unless foundation is complete

---

## 5. High-Level System Architecture

### 5.1 Backend modules to add

Create the following backend modules:

- `server/src/routes/chat.js`
- `server/src/routes/profile.js`
- `server/src/services/azureChat.js`
- `server/src/services/chatAdvisor.js`
- `server/src/services/chatClassifier.js`
- `server/src/services/chatRetrieval.js`
- `server/src/services/chatPromptBuilder.js`
- `server/src/services/chatHistory.js`
- `server/src/services/chatSafety.js`

Future modules:

- `server/src/services/embeddingService.js`
- `server/src/services/vectorStore.js`
- `server/src/services/knowledgeIngestion.js`

### 5.2 Frontend modules to add

- `client/src/views/CoachChatView.jsx`
- `client/src/components/ChatThread.jsx`
- `client/src/components/ChatComposer.jsx`
- `client/src/components/ChatSourcePills.jsx`
- `client/src/components/QuickPromptChips.jsx`
- optionally `client/src/components/SessionList.jsx`

### 5.3 Existing files to update

- `server/src/index.js` — register chat/profile routes
- `server/src/config/db.js` — add new data structures and data access helpers
- `client/src/App.jsx` — add Coach view state and rendering
- `client/src/components/Navbar.jsx` — add chat tab
- `client/src/services/api.js` — add chat/profile API functions

---

## 6. Data Model Blueprint

### 6.1 New entity: UserNutritionProfiles

Purpose: store nutrition context to improve coaching quality.

Suggested fields:

- `id` INT IDENTITY PRIMARY KEY
- `user_id` INT NOT NULL UNIQUE
- `age` INT NULL
- `sex` NVARCHAR(20) NULL
- `height_cm` FLOAT NULL
- `weight_kg` FLOAT NULL
- `activity_level` NVARCHAR(50) NULL
- `goal_type` NVARCHAR(50) NULL
- `dietary_style` NVARCHAR(50) NULL
- `allergies_json` NVARCHAR(MAX) NULL
- `disliked_foods_json` NVARCHAR(MAX) NULL
- `preferred_cuisines_json` NVARCHAR(MAX) NULL
- `meals_per_day_target` INT NULL
- `medical_disclaimer_ack` BIT DEFAULT 0
- `created_at` DATETIME2 DEFAULT GETDATE()
- `updated_at` DATETIME2 DEFAULT GETDATE()

Recommended goal type values:

- `fat_loss`
- `maintenance`
- `muscle_gain`
- `general_health`

Recommended activity levels:

- `sedentary`
- `light`
- `moderate`
- `active`
- `very_active`

### 6.2 New entity: ChatSessions

Purpose: group conversations for a user.

Suggested fields:

- `id` INT IDENTITY PRIMARY KEY
- `user_id` INT NOT NULL
- `title` NVARCHAR(255) NULL
- `created_at` DATETIME2 DEFAULT GETDATE()
- `updated_at` DATETIME2 DEFAULT GETDATE()

### 6.3 New entity: ChatMessages

Purpose: persist the thread and assistant metadata.

Suggested fields:

- `id` INT IDENTITY PRIMARY KEY
- `session_id` INT NOT NULL
- `user_id` INT NOT NULL
- `role` NVARCHAR(20) NOT NULL
- `content` NVARCHAR(MAX) NOT NULL
- `message_type` NVARCHAR(50) NULL
- `sources_json` NVARCHAR(MAX) NULL
- `retrieval_summary_json` NVARCHAR(MAX) NULL
- `created_at` DATETIME2 DEFAULT GETDATE()

### 6.4 Local fallback JSON additions

Extend the local store shape to include:

```json
{
  "meals": [],
  "users": [],
  "user_settings": {},
  "user_profiles": {},
  "chat_sessions": [],
  "chat_messages": []
}
```

---

## 7. Database Layer Implementation Changes

Update `server/src/config/db.js` to include:

### 7.1 MSSQL initialization additions

Create tables if missing:

- `UserNutritionProfiles`
- `ChatSessions`
- `ChatMessages`

### 7.2 New exported DB functions

Add helper functions:

- `getUserNutritionProfile(userId)`
- `saveUserNutritionProfile(userId, profile)`
- `createChatSession(userId, title)`
- `getChatSessions(userId)`
- `getChatMessages(userId, sessionId)`
- `saveChatMessage(payload)`
- `deleteChatSession(userId, sessionId)`

### 7.3 Local fallback behavior

Ensure the JSON fallback fully mirrors:

- profile storage
- session creation
- message persistence
- user isolation by `user_id`

---

## 8. Backend API Blueprint

### 8.1 Chat routes

Create `server/src/routes/chat.js`.

#### `POST /api/chat/message`

Primary endpoint for the assistant.

Request:

```json
{
  "session_id": 1,
  "message": "How can I stay under calories tonight?"
}
```

Response:

```json
{
  "session_id": 1,
  "intent": "meal_recommendation",
  "reply": "You have about 620 calories left today, so a high-protein dinner around 450-550 kcal would keep you on track.",
  "sources": [
    { "type": "goals", "label": "Daily Goals" },
    { "type": "today_meals", "label": "Today's Meals" }
  ],
  "retrieval_summary": {
    "today_calories": 1380,
    "goal_calories": 2000,
    "remaining_calories": 620
  },
  "safety": {
    "medical_disclaimer": false,
    "estimate_disclaimer": true
  }
}
```

#### `GET /api/chat/sessions`

Returns all chat sessions for the current user.

#### `GET /api/chat/sessions/:id/messages`

Returns message history for a specific session.

#### `POST /api/chat/sessions`

Optional explicit session creation endpoint.

#### `DELETE /api/chat/sessions/:id`

Optional archive/delete behavior.

### 8.2 Profile routes

Create `server/src/routes/profile.js`.

#### `GET /api/profile`

Returns current user nutrition profile.

#### `POST /api/profile`

Creates or updates the user nutrition profile.

Request example:

```json
{
  "age": 31,
  "sex": "female",
  "height_cm": 165,
  "weight_kg": 68,
  "activity_level": "light",
  "goal_type": "fat_loss",
  "dietary_style": "high_protein",
  "allergies": ["shellfish"],
  "disliked_foods": ["tofu"],
  "preferred_cuisines": ["mediterranean"]
}
```

---

## 9. Backend Service Responsibilities

### 9.1 `azureChat.js`

Purpose: wrap Azure OpenAI text chat completion calls.

Responsibilities:

- reuse Azure endpoint/key settings
- support text-only messages
- isolate model request logic from route/controller logic

Suggested API:

- `sendNutritionChat({ messages, temperature, maxTokens })`

Recommended defaults:

- temperature: `0.3`
- max tokens: `500` to `800`

### 9.2 `chatAdvisor.js`

Purpose: orchestrate the end-to-end response flow.

Main function:

- `handleChatMessage({ userId, sessionId, message })`

Flow:

1. validate input
2. load or create session
3. classify user question
4. run safety checks
5. retrieve structured context
6. load recent chat history
7. build prompt
8. call Azure chat service
9. save user and assistant messages
10. return final payload

### 9.3 `chatClassifier.js`

Purpose: determine the intent and expected retrieval path.

MVP should be rule-based.

Output example:

```js
{
  intent: 'goal_adherence',
  dateRange: 'today',
  requestedMetric: 'calories',
  needsRecommendation: true,
  confidence: 0.92
}
```

Suggested intents:

- `daily_summary`
- `weekly_summary`
- `goal_adherence`
- `macro_gap_analysis`
- `meal_history_lookup`
- `meal_recommendation`
- `habit_analysis`
- `nutrition_education`
- `unsafe_or_medical`

### 9.4 `chatRetrieval.js`

Purpose: gather the structured evidence required to answer the question.

Suggested methods:

- `getStructuredContext({ userId, classification, message })`
- `getTodaySummary(userId)`
- `getWeeklySummary(userId, days)`
- `getMealsByDateRange(userId, fromDate, toDate)`
- `getTopCalorieMeals(userId, days)`
- `getMacroAdherence(userId, days)`
- `getMealTypePatterns(userId, days)`
- `getGoalContext(userId)`
- `getProfileContext(userId)`

Structured output example:

```js
{
  goals: {
    daily_calorie_target: 2000,
    protein_target_g: 140,
    carbs_target_g: 225,
    fat_target_g: 65
  },
  profile: {
    goal_type: 'fat_loss',
    dietary_style: 'high_protein'
  },
  today: {
    calories: 1380,
    protein_g: 88,
    carbs_g: 120,
    fat_g: 42,
    meals: []
  },
  weekly: {
    avg_calories: 1965,
    avg_protein_g: 101,
    avg_carbs_g: 210,
    avg_fat_g: 71,
    days_over_calories: 3
  },
  patterns: {
    highest_calorie_meal_type: 'Dinner',
    lowest_protein_meal_type: 'Breakfast'
  },
  sources: [
    { type: 'goals', label: 'Daily Goals' },
    { type: 'today_meals', label: "Today's Meals" },
    { type: 'weekly_trend', label: 'Last 7 Days' }
  ]
}
```

### 9.5 `chatPromptBuilder.js`

Purpose: assemble the LLM prompt from all retrieved context.

Inputs:

- user message
- classification result
- structured context
- recent history
- safety flags

Outputs:

- array of Azure chat messages

### 9.6 `chatHistory.js`

Purpose: read/write chat data for both MSSQL and local fallback.

Suggested methods:

- `createSession(userId, title)`
- `getSessions(userId)`
- `getSessionMessages(userId, sessionId, limit)`
- `saveMessage(payload)`
- `touchSession(sessionId)`
- `deleteSession(userId, sessionId)`

### 9.7 `chatSafety.js`

Purpose: detect harmful or out-of-scope nutrition prompts.

Suggested methods:

- `evaluateMessageRisk(message)`
- `shouldRefuse(flags)`
- `buildSafetyInstruction(flags)`

Example risks:

- crash dieting
- compensatory fasting or purging requests
- medical diagnosis requests
- unsafe calorie restriction
- eating-disorder-adjacent prompts

---

## 10. Retrieval Logic Blueprint

### 10.1 Question categories and retrieval sources

#### Daily summary

Questions:

- "How am I doing today?"
- "What did I eat today?"

Retrieve:

- today's meals
- today's calorie/macro totals
- goals
- remaining daily budget

#### Weekly summary

Questions:

- "How did I do this week?"
- "Am I getting better?"

Retrieve:

- last 7 days
- average daily calories/macros
- number of over-goal days
- major meal-type contributors

#### Goal adherence

Questions:

- "Am I hitting protein?"
- "Why am I over calories?"

Retrieve:

- goals
- 7-day or 14-day intake averages
- top impact meals
- meal type patterns

#### Recommendation questions

Questions:

- "What should I eat tonight?"
- "Suggest a low-calorie dinner"

Retrieve:

- today's remaining calories/macros
- dietary preferences
- allergies/dislikes
- recent repeated dinner patterns

### 10.2 Retrieval date windows

Recommended windows:

- today
- yesterday
- last 7 days
- last 14 days
- last 30 days

Default rules:

- daily summary: today
- weekly summary: last 7 days
- habit analysis: 14 to 30 days depending on available data
- recommendation: today + recent meal pattern context

### 10.3 Pattern extraction helpers

Add helper calculations for:

- average calories by meal type
- average protein by meal type
- count of meals by type
- top calorie meals
- lowest protein meals
- repeated meal names after basic normalization

Normalization should at minimum:

- lowercase strings
- trim whitespace
- strip punctuation where practical

---

## 11. Prompt Engineering Blueprint

### 11.1 System prompt goals

The assistant must:

- act as a nutrition coaching assistant
- use retrieved user data as the factual source of truth
- never invent meals or totals
- acknowledge uncertainty where estimates are involved
- provide practical, non-judgmental advice
- refuse medical diagnosis and dangerous behavior requests

### 11.2 Prompt structure

The prompt should include:

1. assistant role and tone
2. grounding rules
3. safety rules
4. profile and goals context
5. retrieved meal/trend evidence
6. explicit response instructions

### 11.3 Example assembled prompt

```text
User question:
How can I stay under calories tonight?

User goals:
- calorie target: 2000
- protein target: 140g
- carbs target: 225g
- fat target: 65g
- goal type: fat_loss

Profile:
- dietary style: high_protein
- allergies: peanuts
- disliked foods: mushrooms

Retrieved context:
- Today calories: 1380
- Today protein: 88g
- Today carbs: 120g
- Today fat: 42g
- Remaining calories: 620
- Remaining protein gap: 52g
- Today's meals:
  1. Breakfast: Avocado toast, 420 kcal, 19g protein
  2. Lunch: Salmon bowl, 560 kcal, 42g protein
  3. Snack: Yogurt parfait, 400 kcal, 27g protein

Behavior notes:
- Dinner is your highest calorie meal on 5 of the last 7 days.
- Average dinner calories over the last 7 days: 780 kcal.

Instructions:
- Give a direct answer first.
- Use only the provided data as user-specific facts.
- Suggest 2-3 realistic dinner options.
- Keep the answer concise.
- Do not provide medical advice.
```

---

## 12. Safety and Guardrails

### 12.1 Required boundaries

The assistant must not:

- diagnose diseases
- recommend starvation or crash dieting
- support purging or compensatory restriction
- provide treatment instructions
- act as a substitute for a clinician or registered dietitian in medical contexts

### 12.2 Required disclaimer behavior

Use a disclaimer when:

- meal values are estimated from AI image analysis
- the user asks for medical or highly individualized health advice
- the profile data is incomplete for a sensitive recommendation

### 12.3 Example refusal handling

If the user asks:

- "How little can I eat tomorrow?"
- "I binged. Should I skip meals the next day?"
- "Can you diagnose why I can't lose weight?"

The assistant should:

- decline harmful or diagnostic guidance
- redirect to balanced, safer alternatives
- recommend professional help where appropriate

---

## 13. Frontend Blueprint

### 13.1 Navigation changes

Update `client/src/components/Navbar.jsx` to add a new tab:

- `id: 'coach'`
- `label: 'Nutrition Coach'`

### 13.2 New main view

Create `client/src/views/CoachChatView.jsx`.

Responsibilities:

- display sessions or a single active thread
- show assistant messages and user messages
- submit prompts
- show source pills and loading state
- offer quick suggestion chips

### 13.3 Suggested state model

- `sessions`
- `activeSessionId`
- `messages`
- `draft`
- `isSending`
- `error`

### 13.4 New UI components

#### `ChatThread.jsx`

Renders ordered messages.

#### `ChatComposer.jsx`

Handles draft input, send action, Enter/Shift+Enter behavior.

#### `ChatSourcePills.jsx`

Displays sources returned by the backend, such as:

- Daily Goals
- Today's Meals
- Last 7 Days

#### `QuickPromptChips.jsx`

Starter prompts:

- Summarize my day
- Review my week
- Am I hitting protein?
- Why am I over calories?
- Suggest a dinner under 600 kcal
- What should I eat next?

### 13.5 Frontend API additions

Add to `client/src/services/api.js`:

- `sendChatMessage(payload)`
- `fetchChatSessions()`
- `fetchChatSessionMessages(sessionId)`
- `createChatSession(payload)`
- `deleteChatSession(sessionId)`
- `fetchNutritionProfile()`
- `saveNutritionProfile(profile)`

---

## 14. UX Requirements

### 14.1 Chat UX

- create a session if one is not selected
- optimistically show the user's message
- show loading state while the assistant responds
- auto-scroll to latest message
- retain sources metadata under assistant responses

### 14.2 Empty state

Display a welcome prompt such as:

"Ask me about calories, meals, macros, or what to eat next."

### 14.3 Error state

Provide:

- inline error message
- retry action if send fails

### 14.4 Accessibility

- Enter sends
- Shift+Enter adds newline
- buttons have accessible labels
- focus states remain visible

---

## 15. Authentication and Security Requirements

### 15.1 Route protection

All new routes must use the existing `requireAuth` middleware.

### 15.2 User data isolation

Every DB and fallback query must scope by `user_id`.

### 15.3 Prompt injection prevention

For future document retrieval:

- treat retrieved text as data, not instructions
- do not allow retrieved content to override system prompt rules
- place retrieved content in clearly delimited context blocks

---

## 16. Azure OpenAI Configuration Blueprint

### 16.1 Suggested environment variables

Reuse current Azure configuration and optionally support a separate chat deployment:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_CHAT_DEPLOYMENT` (optional)
- `AZURE_OPENAI_API_VERSION`

### 16.2 Recommended chat settings

- temperature: `0.3`
- max tokens: `500` to `800`
- response mode: plain text for MVP

---

## 17. Semantic RAG Phase Blueprint

### 17.1 When to add

Only after MVP chat grounded in meals/goals is working well.

### 17.2 Candidate knowledge sources

- uploaded diet plans
- recipes
- long-form notes
- saved coach summaries
- future educational content

### 17.3 Chunking strategy

- chunk size: 500 to 900 characters
- overlap: 100 to 150 characters

Store metadata such as:

- `user_id`
- `document_id`
- `doc_type`
- `created_at`
- `tags`

### 17.4 Vector store options

Recommended future options:

- Azure AI Search
- pgvector
- Qdrant

Given current Azure usage, Azure AI Search is the best aligned future option.

---

## 18. File Structure Plan

### Backend

```text
server/src/
  routes/
    chat.js
    profile.js
  services/
    azureChat.js
    chatAdvisor.js
    chatClassifier.js
    chatHistory.js
    chatPromptBuilder.js
    chatRetrieval.js
    chatSafety.js
    embeddingService.js      (future)
    vectorStore.js           (future)
    knowledgeIngestion.js    (future)
```

### Frontend

```text
client/src/
  views/
    CoachChatView.jsx
  components/
    ChatThread.jsx
    ChatComposer.jsx
    ChatSourcePills.jsx
    QuickPromptChips.jsx
    SessionList.jsx
```

---

## 19. Implementation Phases

### Phase 1 — Core chat MVP

Backend:

- add DB helpers and schema support
- create Azure text chat wrapper
- add classification, retrieval, prompt building, history, safety services
- create chat route
- mount route in `server/src/index.js`

Frontend:

- add Coach tab
- add chat view and input
- wire APIs

Acceptance criteria:

- authenticated users can ask calorie/macro/meal history questions
- answers use actual stored user data
- sessions and messages persist
- local fallback works

### Phase 2 — Nutrition profile personalization

- create profile route and UI
- store preferences and constraints
- use profile in meal suggestions and coaching advice

Acceptance criteria:

- advice reflects goal type, dietary style, and restrictions

### Phase 3 — Insight engine

- add weekly insight generation helpers
- show proactive insights in chat or dashboard

Examples:

- dinner overages
- weak-protein breakfast pattern
- weekend calorie spikes

### Phase 4 — Semantic RAG

- upload docs
- extract and chunk content
- generate embeddings
- retrieve semantic context alongside structured context

---

## 20. Testing Blueprint

### 20.1 Backend validation

Test cases should cover:

- auth required for chat/profile routes
- user isolation by token/user id
- correct aggregate calculations
- correct session creation behavior
- safe refusal behavior for harmful prompts

### 20.2 Manual prompt validation

Use prompts like:

- "Summarize my day"
- "What is my highest calorie meal this week?"
- "Am I hitting protein?"
- "Suggest a dinner under 500 calories"
- "Why am I going over calories?"
- "I want to eat as little as possible tomorrow"

Expected outcomes:

- grounded answers
- no hallucinated meals
- appropriate refusals for harmful prompts

### 20.3 Quality checklist

The assistant should:

- not invent data
- use retrieved goals and stats correctly
- explain advice with evidence
- stay concise and supportive

---

## 21. Build Order Recommendation

Recommended implementation order:

1. extend DB layer in `server/src/config/db.js`
2. create `azureChat.js`
3. create `chatClassifier.js`
4. create `chatRetrieval.js`
5. create `chatPromptBuilder.js`
6. create `chatHistory.js`
7. create `chatSafety.js`
8. create `chatAdvisor.js`
9. create `chat.js` route and register it
10. add frontend API helpers
11. add Coach UI components
12. add profile routes/UI
13. add semantic RAG later

---

## 22. Definition of Done

The MVP is complete when:

- a Nutrition Coach tab exists in the app
- authenticated users can send chat prompts
- responses are grounded in meals, goals, and recent trends
- sessions/messages persist in MSSQL and local fallback
- user isolation is enforced
- unsafe nutrition prompts are handled safely
- source metadata is returned for assistant answers

---

## 23. Next Recommended Deliverable

After this document, the next best artifact is a repo-specific execution checklist with:

- exact files to create
- exact files to edit
- API payload contracts
- DB function signatures
- file-by-file implementation order

That execution plan can then be used directly for development in Act mode.