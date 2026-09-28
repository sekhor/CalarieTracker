# Google Play Store — Publishing Checklist for CalorieAI

## PHASE 1 — PWA is Live on Azure ✅ (already done)
- [x] Backend deployed: `calarie-api.azurewebsites.net`
- [x] HTTPS enforced (Azure provides this automatically)
- [x] `manifest.webmanifest` — all required fields present
- [x] Service worker registered
- [x] 192×192 icon (`pwa-192.png`)
- [x] 512×512 icon (`pwa-512.png`)
- [x] `display: standalone`
- [x] `assetlinks.json` route on server
- [x] Privacy Policy page at `/?tab=privacy` (in-app) and footer link

## PHASE 2 — Digital Asset Links
- [ ] Run `bubblewrap init` → copy SHA-256 fingerprint
- [ ] Set `TWA_PACKAGE_NAME=com.calorieai.app` in Azure App Service → Config
- [ ] Set `TWA_SHA256_FINGERPRINT=<your fingerprint>` in Azure App Service → Config
- [ ] Verify: `https://calarie-api.azurewebsites.net/.well-known/assetlinks.json` returns correct JSON

## PHASE 3 — Lighthouse Audit
- [ ] Open https://calarie-api.azurewebsites.net in Chrome
- [ ] F12 → Lighthouse → Mobile → Generate report
- [ ] PWA score: **100** ✅
- [ ] Performance score: **≥ 70** (aim for 90+)
- [ ] Accessibility score: **≥ 90**

## PHASE 4 — Screenshots (3 required, phone size 390×844)
Place PNG files in `client/public/screenshots/`:
- [ ] `screenshot-dashboard.png` — Dashboard view
- [ ] `screenshot-scanner.png`   — AI Scanner view
- [ ] `screenshot-log.png`       — Meal Log view

How to take screenshots:
1. Open app in Chrome, F12, set device to iPhone 14 (390×844)
2. Three-dot menu → "Capture screenshot"
3. Save as the filenames above

## PHASE 5 — Build the AAB
- [ ] Install Java JDK 17+: https://adoptium.net
- [ ] Install Android Studio: https://developer.android.com/studio
- [ ] `npm install -g @bubblewrap/cli`
- [ ] `cd twa-android && bubblewrap init --manifest https://calarie-api.azurewebsites.net/manifest.webmanifest`
- [ ] `bubblewrap build`
- [ ] Confirm `app-release-bundle.aab` exists in `twa-android/`

## PHASE 6 — Google Play Console Setup
- [ ] Register developer account: https://play.google.com/console ($25 one-time)
- [ ] Create app:
  - App name: `CalorieAI`
  - Default language: English (United States)
  - App or game: App
  - Free or paid: Free
- [ ] Fill **App Access**: All functionality is available without special access

## PHASE 7 — Store Listing Assets
- [ ] App icon: 512×512 PNG — use `client/public/pwa-512.png`
- [ ] Feature graphic: 1024×500 PNG — create in Canva/Figma
  - Suggested: Dark background (#0b0f19) + CalorieAI logo + tagline "AI-powered calorie tracking"
- [ ] Phone screenshots: at least 2 (use the 3 from Phase 4)
- [ ] Short description (max 80 chars):
  > "AI-powered calorie tracker with meal logging, nutrition analytics & coaching"
- [ ] Full description (max 4000 chars) — see template below

## PHASE 8 — Store Listing Text

### Short description (80 chars max)
```
AI calorie tracker: log meals, scan food photos, get nutrition coaching
```

### Full description
```
CalorieAI is your intelligent nutrition companion powered by Azure AI.

🍎 SMART MEAL LOGGING
Quickly log meals manually or let AI identify food from a photo.
Track calories, protein, carbs, and fat for every meal.

📸 AI FOOD SCANNER
Take a photo of any food and CalorieAI identifies it, estimates
portion size, and logs the full nutritional breakdown automatically.

📊 NUTRITION DASHBOARD
See your daily calorie budget, macro breakdown, and weekly trends
at a glance with beautiful charts.

🤖 AI NUTRITION COACH
Chat with your personal AI coach for meal suggestions, nutrition
advice, and answers to health questions — all personalised to your goals.

📅 MEAL PLANNER
Generate weekly meal plans tailored to your calorie goals and
dietary preferences in seconds.

💡 INSIGHTS & ANALYTICS
Discover patterns in your eating habits with detailed analytics,
streaks, and personalised insights.

📚 NUTRITION KNOWLEDGE BASE
Save notes, upload documents, and build your personal nutrition
knowledge library.

CalorieAI works as a full-screen app on Android — no browser bar,
no distractions. Install it once and it feels like a native app.

Privacy: your data is stored securely. We never sell your data.
```

## PHASE 9 — Play Console Configuration
- [ ] Content rating questionnaire:
  - Violence: None
  - Sexual content: None
  - Language: None
  - Ads: No ads
  - **Expected rating: Everyone**
- [ ] Target audience: 18+ (health app)
- [ ] Privacy policy URL: `https://calarie-api.azurewebsites.net/?tab=privacy`
  > Note: Google requires a URL. Since the privacy policy is in-app, use the above.
  > Alternatively host a standalone page on GitHub Pages.
- [ ] Data safety form:
  - Data collected: Email address, food/meal data, photos (optional)
  - Data shared with third parties: Azure OpenAI (food photo analysis only)
  - Data encrypted in transit: Yes
  - Users can request data deletion: Yes

## PHASE 10 — Submit
- [ ] Production → Create new release
- [ ] Upload `app-release-bundle.aab`
- [ ] Release name: `1.0.0`
- [ ] Release notes: "Initial release of CalorieAI on Google Play."
- [ ] Review release → Start rollout to Production
- [ ] **Wait 3–7 business days for Google review**

## POST-LAUNCH
- [ ] Monitor Play Console → Android vitals (crashes, ANRs)
- [ ] Monitor Play Console → Ratings & Reviews
- [ ] Add Play Store URL to `manifest.webmanifest` → `related_applications` after publishing:
  ```json
  "related_applications": [{
    "platform": "play",
    "url": "https://play.google.com/store/apps/details?id=com.calorieai.app",
    "id": "com.calorieai.app"
  }]
  ```
