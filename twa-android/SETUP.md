# CalorieAI — TWA Android Project

This folder contains the **Trusted Web Activity (TWA)** Android shell that
wraps the CalorieAI PWA for Google Play distribution.

---

## Prerequisites (one-time install)

| Tool | Version | Download |
|---|---|---|
| Java JDK | 17+ | https://adoptium.net |
| Android Studio | Latest | https://developer.android.com/studio |
| Bubblewrap CLI | Latest | `npm install -g @bubblewrap/cli` |
| Node.js | 22+ | Already installed |

After installing Android Studio, open it and go to:
**SDK Manager → SDK Platforms → install Android 14 (API 34)**

---

## Step 1 — Generate the TWA project with Bubblewrap

> Run this from the `twa-android/` folder.

```bash
cd twa-android
bubblewrap init --manifest https://calarie-api.azurewebsites.net/manifest.webmanifest
```

Bubblewrap will ask you these questions — use these answers:

| Question | Answer |
|---|---|
| Application name | `CalorieAI` |
| Package ID | `com.calorieai.app` |
| Min Android version | `21` |
| Host | `calarie-api.azurewebsites.net` |
| Start URL | `/?source=pwa` |
| Theme colour | `#0b0f19` |
| Background colour | `#0b0f19` |
| Icon URL | *(auto-detected from manifest)* |
| Keystore path | `./android.keystore` |
| Key alias | `calorieai` |
| Key/store password | *(choose a strong password — save it safely)* |

> **Important:** Save the SHA-256 fingerprint that Bubblewrap prints at the end.

---

## Step 2 — Set the SHA-256 fingerprint on Azure

1. Go to **Azure Portal → App Service `calarie-api` → Configuration → Application Settings**
2. Add these two settings:

   | Name | Value |
   |---|---|
   | `TWA_PACKAGE_NAME` | `com.calorieai.app` |
   | `TWA_SHA256_FINGERPRINT` | *(the fingerprint from step 1)* |

3. Click **Save** — Azure restarts the server automatically.

4. Verify it works:
   ```
   https://calarie-api.azurewebsites.net/.well-known/assetlinks.json
   ```
   You should see JSON with your package name and fingerprint.

---

## Step 3 — Build the Android App Bundle

```bash
# From twa-android/ folder
bubblewrap build
```

This produces: `app-release-bundle.aab`

That file is what you upload to Google Play.

---

## Step 4 — Test in Android Studio Emulator

```bash
# Build debug APK for local testing
bubblewrap build --skipPwaValidation
```

Or open the `twa-android/` folder directly in Android Studio:
- File → Open → select `twa-android/`
- Run → Run 'app' → choose your emulator (Pixel 7, API 34)

---

## Step 5 — Upload to Google Play

1. Go to https://play.google.com/console
2. Create app → **Health & Fitness**
3. Production → Create release → Upload `app-release-bundle.aab`
4. Fill store listing (see `GOOGLE_PLAY_CHECKLIST.md`)
5. Submit for review

---

## Updating the app

- **Content/UI changes** → just push to `main` → Azure auto-deploys → **no Play Store update needed** (TWA loads the live URL)
- **Manifest/TWA shell changes** → run `bubblewrap build` again → upload new `.aab` with incremented `versionCode`

---

## Environment variables for CI builds

Set these as GitHub Actions secrets / Azure build env vars:

```
KEYSTORE_PATH     path to android.keystore
KEYSTORE_PASSWORD store password
KEY_ALIAS         calorieai
KEY_PASSWORD      key password
```
