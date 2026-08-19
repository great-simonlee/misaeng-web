# AppConnect

Generic CRUD explorer for the Ellieo mobile-app API. Managers and administrators browse any resource path, load records, and create / update / delete JSON through a Next.js proxy. Tokens never live in the browser; they are httpOnly cookies.

ERP widget id: `app-connect`  
Nav: **AppConnect** (cloud icon)  
Header subtitle: *Browse, create, update, and delete records through your external API.*  
Header gradient: `from-violet-600 via-indigo-600 to-blue-700`

---

## Who can use it

Same gate as Team Directory tooling: `canAccessAgents(user, userAgent)`.

| Allowed | Rule |
| --- | --- |
| Super Admin | Hardcoded email `simon@misaeng.com` |
| Manager | Email in `NEXT_PUBLIC_MANAGER_EMAILS` (comma-separated) |
| Leader role | Team Directory `userAgent.role` is `Manager`, `Administrator`, or `Super Admin` |

Everyone else sees a white card: **Manager & Admin access only**.

The user must also be signed into the ERP with Google before **Connect with Google** can exchange a Firebase ID token for an Ellieo agent session.

---

## What the page looks like (top → bottom)

1. **Hero card** (dark slate gradient)
   - Violet/indigo cloud icon
   - Title **AppConnect**
   - Subtitle: *Generic CRUD explorer for the Ellieo API (test/prod via env)*
   - Status pills:
     - Green **Ellieo connected · {erpEmail}** when API base URL is set **and** a session (or env token) exists
     - Amber **Sign in with Google to connect** when configured but not connected
     - Amber **Set APP_CONNECT_API_BASE_URL** when env is missing
     - Origin + auth mode: `Google session` | `Env token` | `Not authenticated`

2. **Config warning** (if not configured)  
   Set `APP_CONNECT_API_BASE_URL` (example `https://test.ellieo.com/v1/api`) and redeploy.

3. **Connect card** (configured, not connected)
   - Explains: ERP Google sign-in → `POST auth/login/google` → access token in a secure cookie
   - Button **Connect with Google**

4. **Disconnect** (when connected) — top-right text button **Disconnect Ellieo**

5. **Error / success banners**

6. **Resource path card**
   - Text input (persisted in `localStorage` key `app-connect-resource-path`)
   - Enter key loads records
   - **Load** → `GET /api/app-connect/{path}`
   - **Create** → JSON editor modal, `POST` to the path
   - Quick chips:
     - My rents → `rent/user/lists`
     - Rent form schema → `rent/form-data`
     - Lifestyles → `auth/lifestyles`
     - Verification status → `auth/verification/status`
   - Hint: Create = POST, update = PUT `/{path}/{id}`, delete = DELETE

7. **API reference** (collapsible catalog from Notion)
   - Search name / path / method
   - Categories start collapsed
   - Click a row → fills resource path
   - Method badges: GET sky, POST emerald, PUT amber, DELETE red
   - Multipart endpoints tagged; file upload is meant for **App Listings**, not this JSON explorer
   - Full URL column (lg+): `{origin}/v1/api/{path}`

8. **Records table**
   - Columns: **ID**, **Summary**, **Actions**
   - Actions: **View** (read-only JSON), **Edit** (PUT), **Delete** (confirm then DELETE)
   - Empty states: loading / connect first / enter a path / no records

9. **View modal** — pretty-printed JSON, Edit / Close

10. **Create / Edit modal** — JSON textarea, Cancel / Create|Save

---

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `APP_CONNECT_API_BASE_URL` | Server | Ellieo API root, no trailing slash. Example: `https://test.ellieo.com/v1/api` |
| `APP_CONNECT_API_KEY` | Server | Optional fallback Bearer token if no Google session cookie |
| `APP_CONNECT_DEVICE_ID` | Server | Optional default `x-device-id`; otherwise cookie `erp-{uuid}` |
| `NEXT_PUBLIC_MANAGER_EMAILS` | Public | Extra manager emails for page access |

---

## Architecture

```
Browser (AppConnect widget)
  ├─ GET  /api/app-connect/config
  ├─ GET  /api/app-connect/auth/session
  ├─ POST /api/app-connect/auth/google     { idToken }  ← Firebase Google ID token
  ├─ POST /api/app-connect/auth/refresh
  ├─ DELETE /api/app-connect/auth/session
  └─ GET|POST|PUT|PATCH|DELETE /api/app-connect/{...path}
        └─ Next.js proxy ──Bearer + x-device-id──► APP_CONNECT_API_BASE_URL/{path}
```

### Session cookies (httpOnly, SameSite=lax, Secure in production)

| Cookie | Max age | Contents |
| --- | --- | --- |
| `ellieo_app_access` | 25 minutes | Access JWT |
| `ellieo_app_refresh` | 30 days | Refresh token |
| `ellieo_app_device` | 30 days | Device id for `x-device-id` |

Access token lookup order: cookie, then `APP_CONNECT_API_KEY`.

### Google connect

1. ERP user must already be signed in (`firebase/auth` `currentUser`).
2. Client calls `getIdToken(true)` and POSTs `{ idToken }` to `/api/app-connect/auth/google`.
3. Server tries `POST {base}/auth/login/google` with several body shapes until an access token appears:
   - `{ idToken, platform: 'web' }`
   - `{ idToken }`
   - `{ googleIdToken, platform: 'web' }`
   - `{ googleIdToken }`
   - `{ token: idToken }`
4. Tokens are parsed from `data.accessToken` / `access_token` / `token` / `tokens.*` (same for refresh).
5. Cookies are set. Client reloads config and can Load records.

### Proxy behavior

- 503 if `APP_CONNECT_API_BASE_URL` missing
- 401 `{ code: 'ELLIEO_AUTH_REQUIRED' }` if no access token
- Forwards query string and JSON or multipart body
- Headers: `Accept: application/json`, `Authorization: Bearer …`, `x-device-id`
- On upstream 401: `POST auth/refresh` with `{ refreshToken }` (fallback `{ token }`), then retry once
- Client `appConnectFetch` also retries once after `POST /api/app-connect/auth/refresh`
- `maxDuration = 60` on the catch-all route

---

## Client fetch helpers (`appConnectApi.js`)

`appConnectFetch(path, options)`  
Calls `/api/app-connect/{encoded segments}` with `credentials: 'include'`.

`extractAppConnectRecords(payload)`  
Looks for arrays on: the payload itself, or keys `rents | items | results | records | list | conversations | messages`, including nested under `data`.

`getAppConnectRecordId(record)`  
First non-empty of: `id`, `_id`, `uuid`, `key`, `rentIdx`, `rentId`, `userIdx`, `idx`.

`summarizeAppConnectRecord(record)`  
Up to 3 scalar fields (skips id/uuid/timestamps), joined with ` · `.

CRUD mapping on the page:

| UI | HTTP | Path |
| --- | --- | --- |
| Load | GET | `{resourcePath}` |
| Create | POST | `{resourcePath}` |
| Save edit | PUT | `{resourcePath}/{id}` |
| Delete | DELETE | `{resourcePath}/{id}` |

If GET returns a single object with an id (not a list), the table shows one row.

---

## File map (copy these)

```
src/app/widget/app-connect.js              # page UI
src/app/widget/AppConnectApiReference.js   # catalog UI
src/app/util/appConnectApi.js              # browser → proxy
src/app/util/ellieoAppAuth.js              # session login/logout/refresh
src/app/util/ellieoApiCatalog.js           # endpoint catalog + search
src/app/util/extractApiErrorMessage.js     # error normalization
src/app/util/roles.js                      # canAccessAgents (or equivalent)
src/app/api/app-connect/config/route.js
src/app/api/app-connect/[[...path]]/route.js
src/app/api/app-connect/auth/google/route.js
src/app/api/app-connect/auth/session/route.js
src/app/api/app-connect/auth/refresh/route.js
src/app/api/app-connect/lib/ellieoServer.js
src/app/components/GlassRingSpinner.js     # loading spinner (or substitute)
```

Wire the widget like ERP `page.js`:

- Import `AppConnect` from `./widget/app-connect`
- `selectedWidget === 'app-connect'` → render `<AppConnect />`
- Sidebar item `{ id: 'app-connect', label: 'AppConnect' }` (manager/admin only)

Depends on: Firebase Auth (`useAuth` / `auth.currentUser`), `react-icons/io5`, Tailwind.

Related pages that share the same proxy (not this page): **App Listings** (`app-listings.js`, `ellieoRentApi.js`), **App Messages** (`app-messages.js`, `ellieoChatApi.js`).

---

## API catalog

AppConnect path = resource path **without** `/v1/api`.  
Full test URL = `{origin}/v1/api/{path}`.

Replace `:rentIdx`, `:userIdx`, `:buildingIdx`, `:conversationIdx` before Load.

### Auth (`auth`)

| Method | Path | Name |
| --- | --- | --- |
| POST | `auth/register/agent` | Agent registration |
| POST | `auth/register/google` | Google registration |
| POST | `auth/register/google/agent` | Agent Google registration |
| POST | `auth/register/apple` | Apple registration |
| POST | `auth/register/apple/agent` | Agent Apple registration |
| POST | `auth/login` | Email login |
| POST | `auth/login/google` | Google login |
| POST | `auth/login/apple` | Apple login |
| POST | `auth/logout` | Logout |
| POST | `auth/refresh` | Refresh token |
| POST | `auth/verification/email` | Email duplicate check |
| POST | `auth/verification/code` | Send email code |
| POST | `auth/verification/verify/code` | Verify email code |
| POST | `auth/verification/school` | Send school email code |
| POST | `auth/verification/school/verify/code` | Verify school email code |
| POST | `auth/verification/password` | Send password reset code |
| POST | `auth/verification/password/verify/code` | Verify password reset code |
| PUT | `auth/password/reset` | Reset password |
| PUT | `auth/password` | Change password |
| GET | `auth/lifestyles` | Lifestyle list |
| POST | `auth/agent/license` | Agent license verify (multipart) |
| PUT | `auth/agent/license` | Agent license update (multipart) |
| GET | `auth/verification/status` | Verification status |

### Verification (`verification`)

| Method | Path | Name |
| --- | --- | --- |
| POST | `verification/email` | Email duplicate check |
| POST | `verification/code` | Send email code |
| POST | `verification/verify/code` | Verify email code |
| POST | `verification/school` | Send school email code |
| POST | `verification/school/verify/code` | Verify school email code |
| POST | `verification/password` | Send password reset code |
| POST | `verification/password/verify/code` | Verify password reset code |

### User (`user`)

| Method | Path | Name |
| --- | --- | --- |
| GET | `user/profile` | View profile |
| PUT | `user/profile` | Edit profile |
| PUT | `user/profile/agent` | Edit agent profile |
| PUT | `user/profile/images` | Edit profile images (multipart) |
| PUT | `user/profile/bio` | Edit bio |
| GET | `user/lifestyles` | View lifestyles |
| PUT | `user/lifestyles` | Edit lifestyles |
| GET | `user/settings/privacy` | View privacy settings |
| PUT | `user/settings/privacy` | Edit privacy settings |
| GET | `user/settings/notification` | View notification settings |
| PUT | `user/settings/notification` | Edit notification settings |
| POST | `user/deletion` | Delete account |
| POST | `user/block` | Block user |
| POST | `user/report` | Report user |

### Rent (`rent`)

| Method | Path | Name |
| --- | --- | --- |
| GET | `rent/:rentIdx` | Rent detail |
| GET | `rent/form-data` | Create form schema |
| GET | `rent/form-data/:rentIdx` | Edit form schema |
| GET | `rent/user/lists` | My rent list |
| POST | `rent` | Create rent (multipart) |
| PUT | `rent` | Update rent (multipart) |
| DELETE | `rent/:rentIdx` | Delete rent |
| GET | `rent/user/saved` | Saved rents |
| PUT | `rent/:rentIdx/saved` | Toggle saved rent |
| GET | `rent/map` | Rent map |
| GET | `rent/building/:buildingIdx` | Rents by building |
| GET | `rent/map/list` | Map rent list |
| PUT | `rent/user/boost` | Boost rent |
| PUT | `rent/user/renew` | Renew rent |

### Roommate (`roommate`)

| Method | Path | Name |
| --- | --- | --- |
| GET | `rent/roommate/search` | Roommate search |
| GET | `rent/roommate/list/:rentIdx` | Roommate list |
| GET | `rent/roommate/:rentIdx/:userIdx` | Roommate detail |
| POST | `rent/roommate` | Add roommate |
| DELETE | `rent/roommate` | Delete roommate |

### Payment (`payment`)

| Method | Path | Name |
| --- | --- | --- |
| GET | `payment/subscription` | My subscription |
| GET | `payment/subscription/plans` | Subscription plans |
| GET | `payment/subscription/plans/upgrade` | Upgradeable plans |
| GET | `payment/credits` | Credit balance |
| GET | `payment/history` | Payment history |
| GET | `payment/credits/usage` | Credit usage |
| POST | `payment/subscribe/stripe` | Subscribe (Stripe) |
| POST | `payment/subscribe/in-app` | Subscribe (in-app) |
| POST | `payment/upgrade` | Upgrade subscription |
| POST | `payment/cancel` | Cancel subscription |

### Match (`match`)

| Method | Path | Name |
| --- | --- | --- |
| GET | `match/status` | Match status |
| GET | `match/list` | Match list |
| GET | `match/:userIdx` | Match detail |
| POST | `match/info` | Create match info |
| PUT | `match/info` | Update match info |
| PUT | `match/toggle` | Toggle match |

### Chat (`chat`)

| Method | Path | Name |
| --- | --- | --- |
| POST | `chat/device-token` | Save FCM token |
| GET | `chat/conversations/user` | User conversations |
| GET | `chat/conversations/agent` | Agent conversations |
| GET | `chat/messages/:conversationIdx` | Chat messages |
| GET | `chat/user/:userIdx` | Chat partner profile |
| POST | `chat/message` | Send message |
| POST | `chat/conversations` | Create conversation |
| POST | `chat/message/rent` | Share rent message |
| POST | `chat/message/image` | Send image message (multipart) |
| DELETE | `chat/conversations/:conversationIdx` | Leave conversation |

Catalog helpers:

- `filterApiCatalog(catalog, query)` — case-insensitive match on name, nameEn, method, path, category labels
- `buildEllieoFullUrl(origin, path)` — `{origin}/v1/api/{path}`
- `ELLIEO_API_BASE_PATH = '/v1/api'`

---

## Config JSON (`GET /api/app-connect/config`)

```json
{
  "configured": true,
  "origin": "https://test.ellieo.com",
  "connected": true,
  "hasRefresh": true,
  "hasDeviceId": false,
  "usesEnvFallback": false,
  "authMode": "google-session"
}
```

`authMode`: `google-session` | `env-token` | `none`

---

## Porting checklist

1. Copy the files listed under **File map**.
2. Set `APP_CONNECT_API_BASE_URL` (and optionally API key / device id).
3. Provide Firebase Auth so Connect with Google can send an ID token.
4. Recreate `canAccessAgents` (or drop the gate).
5. Register the widget in your shell/nav.
6. Tailwind + `react-icons/io5` (or restyle).
7. Do not send Ellieo tokens to the client; keep the cookie proxy.

---

Full implementation is in **Full source** below. Split the code fences into the listed paths in the destination project.

---

## Full source

Copy each block into the matching path. Imports assume Next.js App Router under `src/app/`.

### `src/app/widget/app-connect.js`

```javascript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IoAddOutline,
  IoCheckmarkCircle,
  IoCloudOutline,
  IoCreateOutline,
  IoDocumentTextOutline,
  IoLogoGoogle,
  IoLogOutOutline,
  IoRefreshOutline,
  IoShieldCheckmarkOutline,
  IoTrashOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import GlassRingSpinner from '../components/GlassRingSpinner';
import { useAuth } from '../context/AuthContext';
import { canAccessAgents } from '../util/roles';
import {
  appConnectFetch,
  extractAppConnectRecords,
  getAppConnectRecordId,
  summarizeAppConnectRecord,
} from '../util/appConnectApi';
import {
  fetchEllieoSession,
  loginEllieoWithGoogle,
  logoutEllieoSession,
} from '../util/ellieoAppAuth';
import AppConnectApiReference from './AppConnectApiReference';

const RESOURCE_PATH_KEY = 'app-connect-resource-path';

const QUICK_PATHS = [
  { label: 'My rents', path: 'rent/user/lists' },
  { label: 'Rent form schema', path: 'rent/form-data' },
  { label: 'Lifestyles', path: 'auth/lifestyles' },
  { label: 'Verification status', path: 'auth/verification/status' },
];

function encodeResourcePath(path) {
  return String(path || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function authModeLabel(mode) {
  if (mode === 'google-session') return 'Google session';
  if (mode === 'env-token') return 'Env token';
  return 'Not authenticated';
}

export default function AppConnect() {
  const { user, userAgent } = useAuth();
  const canUse = canAccessAgents(user, userAgent);

  const [mounted, setMounted] = useState(false);
  const [apiConfig, setApiConfig] = useState(null);
  const [ellieoSession, setEllieoSession] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [resourcePath, setResourcePath] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editorId, setEditorId] = useState('');
  const [editorBody, setEditorBody] = useState('{\n  \n}');
  const [editorError, setEditorError] = useState('');

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerRecord, setViewerRecord] = useState(null);

  const autoLoadedRef = useRef(false);
  const successTimerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(RESOURCE_PATH_KEY);
      if (stored) setResourcePath(stored);
    } catch (_) {}
  }, []);

  const showSuccess = useCallback((message) => {
    setSuccess(message);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccess(''), 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const [configRes, session] = await Promise.all([
        fetch('/api/app-connect/config', { credentials: 'include' }),
        fetchEllieoSession(),
      ]);
      setApiConfig(await configRes.json());
      setEllieoSession(session);
    } catch {
      setApiConfig({ configured: false, origin: null, connected: false });
      setEllieoSession({ connected: false });
    }
  }, []);

  useEffect(() => {
    if (mounted && canUse) loadConfig();
  }, [mounted, canUse, loadConfig]);

  const configOk = apiConfig?.configured;
  const ellieoConnected = Boolean(ellieoSession?.connected || apiConfig?.connected);

  const persistResourcePath = (path) => {
    setResourcePath(path);
    try {
      localStorage.setItem(RESOURCE_PATH_KEY, path);
    } catch (_) {}
  };

  const loadRecords = useCallback(async () => {
    const path = encodeResourcePath(resourcePath);
    if (!path) {
      setError('Enter a resource path (e.g. rent/user/lists).');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await appConnectFetch(path, { method: 'GET' });
      const list = extractAppConnectRecords(data);
      if (list.length === 0 && data && typeof data === 'object' && getAppConnectRecordId(data)) {
        setRecords([data]);
      } else {
        setRecords(list);
      }
      const count = list.length || (getAppConnectRecordId(data) ? 1 : 0);
      showSuccess(`Loaded ${count} record(s) from ${path}.`);
    } catch (e) {
      setRecords([]);
      setError(e.message || 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  }, [resourcePath, showSuccess]);

  useEffect(() => {
    if (
      mounted &&
      canUse &&
      configOk &&
      ellieoConnected &&
      encodeResourcePath(resourcePath) &&
      !autoLoadedRef.current
    ) {
      autoLoadedRef.current = true;
      loadRecords();
    }
  }, [mounted, canUse, configOk, ellieoConnected, resourcePath, loadRecords]);

  const handleConnectGoogle = async () => {
    if (!user) {
      setError('Sign in to the ERP with Google first.');
      return;
    }
    setConnecting(true);
    setError('');
    setSuccess('');
    try {
      await loginEllieoWithGoogle();
      await loadConfig();
      showSuccess(`Connected to Ellieo app as ${user.email}.`);
      autoLoadedRef.current = false;
    } catch (e) {
      setError(e.message || 'Failed to connect Ellieo app account.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await logoutEllieoSession();
    setRecords([]);
    autoLoadedRef.current = false;
    await loadConfig();
    showSuccess('Disconnected from Ellieo app.');
  };

  const selectQuickPath = (path) => {
    persistResourcePath(path);
    setError('');
  };

  const openCreateEditor = () => {
    setEditorMode('create');
    setEditorId('');
    setEditorBody('{\n  \n}');
    setEditorError('');
    setEditorOpen(true);
  };

  const openEditEditor = (record) => {
    const id = getAppConnectRecordId(record);
    setEditorMode('edit');
    setEditorId(id || '');
    setEditorBody(JSON.stringify(record, null, 2));
    setEditorError('');
    setEditorOpen(true);
  };

  const openViewer = (record) => {
    setViewerRecord(record);
    setViewerOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditorError('');
  };

  const saveEditor = async () => {
    const path = encodeResourcePath(resourcePath);
    if (!path) {
      setEditorError('Resource path is required.');
      return;
    }
    let body;
    try {
      body = JSON.parse(editorBody);
    } catch {
      setEditorError('Body must be valid JSON.');
      return;
    }

    setSaving(true);
    setEditorError('');
    setError('');
    setSuccess('');
    try {
      if (editorMode === 'create') {
        await appConnectFetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        showSuccess('Record created.');
      } else {
        const id = editorId || getAppConnectRecordId(body);
        if (!id) {
          setEditorError('Record id is required for update.');
          setSaving(false);
          return;
        }
        const updatePath = `${path}/${encodeURIComponent(id)}`;
        await appConnectFetch(updatePath, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        showSuccess(`Record ${id} updated.`);
      }
      closeEditor();
      await loadRecords();
    } catch (e) {
      setEditorError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (record) => {
    const path = encodeResourcePath(resourcePath);
    const id = getAppConnectRecordId(record);
    if (!path || !id) return;
    if (!window.confirm(`Delete record ${id}? This cannot be undone.`)) return;

    setError('');
    setSuccess('');
    try {
      await appConnectFetch(`${path}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      showSuccess(`Deleted ${id}.`);
      await loadRecords();
    } catch (e) {
      setError(e.message || 'Delete failed.');
    }
  };

  const encodedPath = encodeResourcePath(resourcePath);

  if (!mounted) {
    return (
      <div className='flex items-center justify-center p-12'>
        <GlassRingSpinner size={72} label='Loading AppConnect...' />
      </div>
    );
  }

  if (!canUse) {
    return (
      <div className='relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-6 py-14 text-center shadow-lg shadow-slate-200/40'>
        <IoShieldCheckmarkOutline className='mx-auto h-10 w-10 text-slate-400' />
        <p className='mt-4 text-base font-semibold text-slate-800'>
          Manager & Admin access only
        </p>
        <p className='relative mt-1 text-sm text-slate-500'>
          AppConnect is restricted to manager and administrator accounts.
        </p>
      </div>
    );
  }

  return (
    <div className='relative space-y-4 pb-8'>
      <div className='overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl shadow-slate-900/25'>
        <div className='flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md'>
              <IoCloudOutline className='h-5 w-5' />
            </div>
            <div>
              <h2 className='text-base font-bold tracking-tight'>AppConnect</h2>
              <p className='text-[11px] text-slate-400'>
                Generic CRUD explorer for the Ellieo API (test/prod via env)
              </p>
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-2 text-[11px]'>
            {configOk && ellieoConnected ? (
              <span className='inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-200'>
                <IoCheckmarkCircle className='h-3.5 w-3.5' />
                Ellieo connected
                {user?.email ? ` · ${user.email}` : ''}
              </span>
            ) : configOk ? (
              <span className='inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 font-semibold text-amber-100'>
                <IoWarningOutline className='h-3.5 w-3.5' />
                Sign in with Google to connect
              </span>
            ) : (
              <span className='inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 font-semibold text-amber-100'>
                <IoWarningOutline className='h-3.5 w-3.5' />
                Set APP_CONNECT_API_BASE_URL
              </span>
            )}
            {configOk && apiConfig?.origin ? (
              <span className='inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium text-slate-300'>
                {apiConfig.origin}
                {apiConfig.authMode ? ` · ${authModeLabel(apiConfig.authMode)}` : ''}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {!configOk ? (
        <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
          Set server env var{' '}
          <code className='rounded bg-white/80 px-1'>APP_CONNECT_API_BASE_URL</code>{' '}
          (e.g. https://test.ellieo.com/v1/api), then redeploy.
        </div>
      ) : null}

      {configOk && !ellieoConnected ? (
        <div className='rounded-2xl border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-200/30'>
          <h3 className='text-sm font-bold text-slate-900'>Connect Ellieo app account</h3>
          <p className='mt-1 text-xs text-slate-600'>
            Uses your ERP Google sign-in ({user?.email || 'not signed in'}) to get an
            agent access token via{' '}
            <code className='rounded bg-slate-100 px-1'>POST auth/login/google</code>.
            The token is stored in a secure session cookie (not in the browser).
          </p>
          <div className='mt-4 flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={handleConnectGoogle}
              disabled={connecting || !user}
              className='inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50'
            >
              <IoLogoGoogle className='h-4 w-4 text-red-500' />
              {connecting ? 'Connecting…' : 'Connect with Google'}
            </button>
          </div>
        </div>
      ) : null}

      {configOk && ellieoConnected ? (
        <div className='flex justify-end'>
          <button
            type='button'
            onClick={handleDisconnect}
            className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50'
          >
            <IoLogOutOutline className='h-3.5 w-3.5' />
            Disconnect Ellieo
          </button>
        </div>
      ) : null}

      {error ? (
        <div className='flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'>
          <IoWarningOutline className='mt-0.5 h-5 w-5 shrink-0' />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className='flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'>
          <IoCheckmarkCircle className='mt-0.5 h-5 w-5 shrink-0 text-emerald-600' />
          <span>{success}</span>
        </div>
      ) : null}

      <div className='rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-200/30 sm:p-5'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-end'>
          <label className='min-w-0 flex-1'>
            <span className='mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500'>
              Resource path
            </span>
            <input
              type='text'
              value={resourcePath}
              onChange={(e) => persistResourcePath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && ellieoConnected && !loading) loadRecords();
              }}
              placeholder='e.g. rent/user/lists'
              className='w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10'
            />
          </label>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={loadRecords}
              disabled={loading || !ellieoConnected || !encodedPath}
              className='inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45'
            >
              <IoRefreshOutline className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Load'}
            </button>
            <button
              type='button'
              onClick={openCreateEditor}
              disabled={!ellieoConnected || !encodedPath}
              className='inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-45'
            >
              <IoAddOutline className='h-4 w-4' />
              Create
            </button>
          </div>
        </div>

        <div className='mt-3 flex flex-wrap gap-1.5'>
          {QUICK_PATHS.map(({ label, path }) => (
            <button
              key={path}
              type='button'
              onClick={() => selectQuickPath(path)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                encodedPath === path
                  ? 'bg-violet-100 text-violet-800 ring-1 ring-violet-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className='mt-2 text-xs text-slate-500'>
          <code className='rounded bg-slate-100 px-1 py-0.5'>
            GET /api/app-connect/{encodedPath || '<path>'}
          </code>
          {' · '}
          Create = POST, update = PUT{' '}
          <code className='rounded bg-slate-100 px-1 py-0.5'>
            /{encodedPath || '<path>'}/{'<id>'}
          </code>
          , delete = DELETE.
        </p>
      </div>

      <AppConnectApiReference
        apiOrigin={apiConfig?.origin}
        selectedPath={encodedPath}
        onSelectPath={(path) => {
          persistResourcePath(path);
          setError('');
        }}
      />

      <div className='overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/30'>
        <div className='flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5'>
          <p className='text-xs font-semibold text-slate-600'>
            {records.length > 0
              ? `${records.length} record${records.length === 1 ? '' : 's'}`
              : encodedPath
                ? `GET ${encodedPath}`
                : 'Records'}
          </p>
        </div>
        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead>
              <tr className='border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'>
                <th className='px-4 py-3'>ID</th>
                <th className='px-4 py-3'>Summary</th>
                <th className='px-4 py-3 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={3} className='px-4 py-10 text-center text-slate-400'>
                    {loading
                      ? 'Loading records…'
                      : !ellieoConnected
                        ? 'Connect with Google to load API records.'
                        : !encodedPath
                          ? 'Enter a resource path or pick a quick path above.'
                          : 'No records returned. Try a different path or create one.'}
                  </td>
                </tr>
              ) : (
                records.map((record, index) => {
                  const id = getAppConnectRecordId(record) || `#${index + 1}`;
                  return (
                    <tr
                      key={`${id}-${index}`}
                      className='border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70'
                    >
                      <td className='px-4 py-3 font-mono text-xs text-slate-800'>{id}</td>
                      <td className='max-w-md truncate px-4 py-3 text-slate-600'>
                        {summarizeAppConnectRecord(record)}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex justify-end gap-2'>
                          <button
                            type='button'
                            onClick={() => openViewer(record)}
                            className='inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100'
                          >
                            <IoDocumentTextOutline className='h-3.5 w-3.5' />
                            View
                          </button>
                          <button
                            type='button'
                            onClick={() => openEditEditor(record)}
                            className='inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100'
                          >
                            <IoCreateOutline className='h-3.5 w-3.5' />
                            Edit
                          </button>
                          <button
                            type='button'
                            onClick={() => deleteRecord(record)}
                            className='inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100'
                          >
                            <IoTrashOutline className='h-3.5 w-3.5' />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewerOpen && viewerRecord ? (
        <div className='fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-4 sm:items-center'>
          <div className='flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl'>
            <div className='border-b border-slate-100 px-4 py-3 sm:px-5'>
              <h3 className='text-base font-bold text-slate-900'>
                Record {getAppConnectRecordId(viewerRecord) || 'detail'}
              </h3>
              <p className='mt-0.5 text-xs text-slate-500'>Read-only JSON response</p>
            </div>
            <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-5'>
              <pre className='whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800'>
                {JSON.stringify(viewerRecord, null, 2)}
              </pre>
            </div>
            <div className='flex justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-5'>
              <button
                type='button'
                onClick={() => {
                  openEditEditor(viewerRecord);
                  setViewerOpen(false);
                }}
                className='rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
              >
                Edit
              </button>
              <button
                type='button'
                onClick={() => setViewerOpen(false)}
                className='rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editorOpen ? (
        <div className='fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-4 sm:items-center'>
          <div className='flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl'>
            <div className='border-b border-slate-100 px-4 py-3 sm:px-5'>
              <h3 className='text-base font-bold text-slate-900'>
                {editorMode === 'create' ? 'Create record' : `Edit ${editorId || 'record'}`}
              </h3>
              <p className='mt-0.5 text-xs text-slate-500'>
                {editorMode === 'create'
                  ? `POST ${encodedPath || '<path>'} — JSON body`
                  : `PUT ${encodedPath || '<path>'}/${editorId || '<id>'} — JSON body`}
              </p>
            </div>
            <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-5'>
              <textarea
                value={editorBody}
                onChange={(e) => setEditorBody(e.target.value)}
                spellCheck={false}
                className='h-[min(420px,50vh)] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10'
              />
              {editorError ? (
                <p className='mt-2 text-xs text-red-600'>{editorError}</p>
              ) : null}
            </div>
            <div className='flex justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-5'>
              <button
                type='button'
                onClick={closeEditor}
                className='rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={saveEditor}
                disabled={saving}
                className='rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50'
              >
                {saving ? 'Saving…' : editorMode === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

### `src/app/widget/AppConnectApiReference.js`

```javascript
'use client';

import { useMemo, useState } from 'react';
import { IoChevronDownOutline, IoChevronForwardOutline, IoSearchOutline } from 'react-icons/io5';
import {
  ELLIEO_API_CATALOG,
  METHOD_STYLES,
  buildEllieoFullUrl,
  filterApiCatalog,
} from '../util/ellieoApiCatalog';

export default function AppConnectApiReference({ apiOrigin, selectedPath, onSelectPath }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(ELLIEO_API_CATALOG.map((c) => [c.id, false])),
  );

  const filtered = useMemo(() => filterApiCatalog(ELLIEO_API_CATALOG, search), [search]);

  const totalCount = filtered.reduce((n, c) => n + c.endpoints.length, 0);

  const toggleCategory = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className='overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/30'>
      <div className='border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h3 className='text-sm font-bold text-slate-900'>API reference</h3>
            <p className='mt-0.5 text-xs text-slate-500'>
              From Notion API Documents · {totalCount} endpoint{totalCount === 1 ? '' : 's'}
              {apiOrigin ? ` · ${apiOrigin}` : ''}
            </p>
          </div>
          <div className='relative min-w-[200px] flex-1 sm:max-w-xs'>
            <IoSearchOutline className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <input
              type='search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search name, path, method…'
              className='w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10'
            />
          </div>
        </div>
        <p className='mt-2 text-[11px] text-slate-500'>
          Click a row to fill the resource path. Replace{' '}
          <code className='rounded bg-slate-100 px-1'>:rentIdx</code>,{' '}
          <code className='rounded bg-slate-100 px-1'>:userIdx</code>, etc. with real values before
          Load. Multipart endpoints need file upload (use App Listings for rents).
        </p>
      </div>

      <div className='max-h-[min(520px,60vh)] overflow-y-auto'>
        {filtered.length === 0 ? (
          <p className='px-4 py-10 text-center text-sm text-slate-400'>No endpoints match your search.</p>
        ) : (
          filtered.map((category) => {
            const isOpen = expanded[category.id] ?? false;
            return (
              <div key={category.id} className='border-b border-slate-100 last:border-b-0'>
                <button
                  type='button'
                  onClick={() => toggleCategory(category.id)}
                  className='flex w-full items-center gap-2 bg-white px-4 py-2.5 text-left hover:bg-slate-50/80 sm:px-5'
                >
                  {isOpen ? (
                    <IoChevronDownOutline className='h-4 w-4 shrink-0 text-slate-400' />
                  ) : (
                    <IoChevronForwardOutline className='h-4 w-4 shrink-0 text-slate-400' />
                  )}
                  <span className='text-sm font-semibold text-slate-800'>
                    {category.labelKo}{' '}
                    <span className='font-normal text-slate-500'>({category.label})</span>
                  </span>
                  <span className='ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600'>
                    {category.endpoints.length}
                  </span>
                </button>

                {isOpen ? (
                  <div className='overflow-x-auto'>
                    <table className='min-w-full text-sm'>
                      <thead>
                        <tr className='border-y border-slate-100 bg-slate-50/50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500'>
                          <th className='w-16 px-3 py-2 sm:px-4'>Method</th>
                          <th className='px-3 py-2 sm:px-4'>Name</th>
                          <th className='px-3 py-2 sm:px-4'>AppConnect path</th>
                          <th className='hidden px-3 py-2 lg:table-cell lg:px-4'>Full URL (test)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.endpoints.map((ep) => {
                          const isSelected = selectedPath === ep.path;
                          const methodClass = METHOD_STYLES[ep.method] || 'bg-slate-100 text-slate-700';
                          return (
                            <tr
                              key={`${ep.method}-${ep.path}-${ep.name}`}
                              className={`cursor-pointer border-b border-slate-50 last:border-b-0 ${
                                isSelected ? 'bg-violet-50/80' : 'hover:bg-slate-50/70'
                              }`}
                              onClick={() => onSelectPath(ep.path)}
                            >
                              <td className='px-3 py-2.5 sm:px-4'>
                                <span
                                  className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${methodClass}`}
                                >
                                  {ep.method}
                                </span>
                              </td>
                              <td className='px-3 py-2.5 sm:px-4'>
                                <p className='font-medium text-slate-800'>{ep.name}</p>
                                {ep.nameEn ? (
                                  <p className='text-[11px] text-slate-500'>{ep.nameEn}</p>
                                ) : null}
                                {ep.media === 'multipart' ? (
                                  <span className='mt-0.5 inline-block rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 ring-1 ring-orange-200'>
                                    multipart
                                  </span>
                                ) : null}
                              </td>
                              <td className='px-3 py-2.5 font-mono text-xs text-violet-700 sm:px-4'>
                                {ep.path}
                              </td>
                              <td className='hidden px-3 py-2.5 font-mono text-[10px] text-slate-500 lg:table-cell lg:px-4'>
                                {buildEllieoFullUrl(apiOrigin || 'https://test.ellieo.com', ep.path)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

### `src/app/util/appConnectApi.js`

```javascript
import { refreshEllieoSession } from './ellieoAppAuth';
import { formatEllieoApiError } from './extractApiErrorMessage';

const NESTED_LIST_KEYS = ['rents', 'items', 'results', 'records', 'list', 'conversations', 'messages'];

function pickListArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return null;
  for (const key of NESTED_LIST_KEYS) {
    if (Array.isArray(value[key])) return value[key];
  }
  return null;
}

/** Extract list rows from common API list response shapes. */
export function extractAppConnectRecords(payload) {
  const direct = pickListArray(payload);
  if (direct) return direct;
  if (!payload || typeof payload !== 'object') return [];

  const fromData = pickListArray(payload.data);
  if (fromData) return fromData;

  return [];
}

export function getAppConnectRecordId(record) {
  if (!record || typeof record !== 'object') return null;
  const id =
    record.id ??
    record._id ??
    record.uuid ??
    record.key ??
    record.rentIdx ??
    record.rentId ??
    record.userIdx ??
    record.idx;
  if (id == null || id === '') return null;
  return String(id);
}

export function summarizeAppConnectRecord(record) {
  if (!record || typeof record !== 'object') return '—';
  const skip = new Set(['id', '_id', 'uuid', 'key', 'createdAt', 'updatedAt']);
  const parts = [];
  for (const [k, v] of Object.entries(record)) {
    if (skip.has(k)) continue;
    if (v == null || typeof v === 'object') continue;
    parts.push(`${k}: ${String(v).slice(0, 40)}`);
    if (parts.length >= 3) break;
  }
  return parts.join(' · ') || JSON.stringify(record).slice(0, 80);
}

export async function appConnectFetch(path, options = {}) {
  const cleanPath = String(path || '')
    .replace(/^\/+/, '')
    .trim();
  const url = cleanPath
    ? `/api/app-connect/${cleanPath
        .split('/')
        .map((s) => encodeURIComponent(s))
        .join('/')}`
    : '/api/app-connect';

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { raw: await res.text() };
  }

  if (res.status === 401 && data?.code === 'ELLIEO_AUTH_REQUIRED') {
    const err = new Error(data.error || 'Ellieo app sign-in required');
    err.code = 'ELLIEO_AUTH_REQUIRED';
    throw err;
  }

  if (res.status === 401 && !options._ellieoRetried) {
    const refreshed = await refreshEllieoSession();
    if (refreshed) {
      return appConnectFetch(path, { ...options, _ellieoRetried: true });
    }
  }

  if (!res.ok) {
    const message = formatEllieoApiError(data, { status: res.status }) ||
      (data && typeof data === 'object' && (data.error || data.message)) ||
      `Request failed (${res.status})`;
    throw new Error(String(message));
  }

  return data;
}
```

### `src/app/util/ellieoAppAuth.js`

```javascript
import { auth } from './firebase';

export async function fetchEllieoSession() {
  const res = await fetch('/api/app-connect/auth/session', {
    credentials: 'include',
  });
  if (!res.ok) return { connected: false };
  return res.json();
}

export async function loginEllieoWithGoogle() {
  if (!auth?.currentUser) {
    throw new Error('Sign in to the ERP with Google first.');
  }

  const idToken = await auth.currentUser.getIdToken(true);

  const res = await fetch('/api/app-connect/auth/google', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Ellieo Google login failed');
  }
  return data;
}

export async function logoutEllieoSession() {
  await fetch('/api/app-connect/auth/session', {
    method: 'DELETE',
    credentials: 'include',
  });
}

export async function refreshEllieoSession() {
  const res = await fetch('/api/app-connect/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) return false;
  return true;
}
```

### `src/app/util/ellieoApiCatalog.js`

```javascript
/**
 * Ellieo API endpoint catalog (from Notion API Documents).
 * AppConnect path = resource path input (no /v1/api prefix).
 */

/** @typedef {'GET'|'POST'|'PUT'|'DELETE'} HttpMethod */
/** @typedef {'json'|'multipart'} MediaKind */

/**
 * @typedef {Object} EllieoApiEndpoint
 * @property {string} name
 * @property {string} [nameEn]
 * @property {HttpMethod} method
 * @property {string} path
 * @property {MediaKind} [media]
 */

/**
 * @typedef {Object} EllieoApiCategory
 * @property {string} id
 * @property {string} label
 * @property {string} labelKo
 * @property {EllieoApiEndpoint[]} endpoints
 */

/** @type {EllieoApiCategory[]} */
export const ELLIEO_API_CATALOG = [
  {
    id: 'auth',
    label: 'Auth',
    labelKo: '인증',
    endpoints: [
      { name: '에이전트 자체 회원가입', nameEn: 'Agent registration', method: 'POST', path: 'auth/register/agent' },
      { name: '구글 연동 회원가입', nameEn: 'Google registration', method: 'POST', path: 'auth/register/google' },
      { name: '에이전트 구글 연동 회원가입', nameEn: 'Agent Google registration', method: 'POST', path: 'auth/register/google/agent' },
      { name: '애플 연동 회원가입', nameEn: 'Apple registration', method: 'POST', path: 'auth/register/apple' },
      { name: '에이전트 애플 연동 회원가입', nameEn: 'Agent Apple registration', method: 'POST', path: 'auth/register/apple/agent' },
      { name: '자체 로그인', nameEn: 'Email login', method: 'POST', path: 'auth/login' },
      { name: '구글 연동 로그인', nameEn: 'Google login', method: 'POST', path: 'auth/login/google' },
      { name: '애플 연동 로그인', nameEn: 'Apple login', method: 'POST', path: 'auth/login/apple' },
      { name: '로그아웃', nameEn: 'Logout', method: 'POST', path: 'auth/logout' },
      { name: 'Access Token 재발급', nameEn: 'Refresh token', method: 'POST', path: 'auth/refresh' },
      { name: '이메일 중복 체크', nameEn: 'Email duplicate check', method: 'POST', path: 'auth/verification/email' },
      { name: '이메일 인증 코드 발송', nameEn: 'Send email code', method: 'POST', path: 'auth/verification/code' },
      { name: '이메일 인증 코드 검증', nameEn: 'Verify email code', method: 'POST', path: 'auth/verification/verify/code' },
      { name: '학교 이메일 인증 코드 발송', nameEn: 'Send school email code', method: 'POST', path: 'auth/verification/school' },
      { name: '학교 이메일 인증 코드 검증', nameEn: 'Verify school email code', method: 'POST', path: 'auth/verification/school/verify/code' },
      { name: '비번 찾기 인증 코드 발송', nameEn: 'Send password reset code', method: 'POST', path: 'auth/verification/password' },
      { name: '비번 찾기 인증 코드 검증', nameEn: 'Verify password reset code', method: 'POST', path: 'auth/verification/password/verify/code' },
      { name: '비밀번호 재설정', nameEn: 'Reset password', method: 'PUT', path: 'auth/password/reset' },
      { name: '비밀번호 변경', nameEn: 'Change password', method: 'PUT', path: 'auth/password' },
      { name: '성향 리스트', nameEn: 'Lifestyle list', method: 'GET', path: 'auth/lifestyles' },
      { name: '에이전트 라이센스 인증', nameEn: 'Agent license verify', method: 'POST', path: 'auth/agent/license', media: 'multipart' },
      { name: '에이전트 라이센스 수정', nameEn: 'Agent license update', method: 'PUT', path: 'auth/agent/license', media: 'multipart' },
      { name: '인증 상태 조회', nameEn: 'Verification status', method: 'GET', path: 'auth/verification/status' },
    ],
  },
  {
    id: 'verification',
    label: 'Verification',
    labelKo: '인증 (별도)',
    endpoints: [
      { name: '이메일 중복 체크', nameEn: 'Email duplicate check', method: 'POST', path: 'verification/email' },
      { name: '이메일 인증 코드 발송', nameEn: 'Send email code', method: 'POST', path: 'verification/code' },
      { name: '이메일 인증 코드 검증', nameEn: 'Verify email code', method: 'POST', path: 'verification/verify/code' },
      { name: '학교 이메일 인증 코드 발송', nameEn: 'Send school email code', method: 'POST', path: 'verification/school' },
      { name: '학교 이메일 인증 코드 검증', nameEn: 'Verify school email code', method: 'POST', path: 'verification/school/verify/code' },
      { name: '비번 찾기 인증 코드 발송', nameEn: 'Send password reset code', method: 'POST', path: 'verification/password' },
      { name: '비번 찾기 인증 코드 검증', nameEn: 'Verify password reset code', method: 'POST', path: 'verification/password/verify/code' },
    ],
  },
  {
    id: 'user',
    label: 'User',
    labelKo: '회원',
    endpoints: [
      { name: '프로필 조회', nameEn: 'View profile', method: 'GET', path: 'user/profile' },
      { name: '프로필 수정', nameEn: 'Edit profile', method: 'PUT', path: 'user/profile' },
      { name: '에이전트 프로필 수정', nameEn: 'Edit agent profile', method: 'PUT', path: 'user/profile/agent' },
      { name: '프로필 사진 수정', nameEn: 'Edit profile images', method: 'PUT', path: 'user/profile/images', media: 'multipart' },
      { name: '자기소개 수정', nameEn: 'Edit bio', method: 'PUT', path: 'user/profile/bio' },
      { name: '내 성향 조회', nameEn: 'View lifestyles', method: 'GET', path: 'user/lifestyles' },
      { name: '내 성향 수정', nameEn: 'Edit lifestyles', method: 'PUT', path: 'user/lifestyles' },
      { name: '내 공개 설정 조회', nameEn: 'View privacy settings', method: 'GET', path: 'user/settings/privacy' },
      { name: '내 공개 설정 수정', nameEn: 'Edit privacy settings', method: 'PUT', path: 'user/settings/privacy' },
      { name: '내 알림 설정 조회', nameEn: 'View notification settings', method: 'GET', path: 'user/settings/notification' },
      { name: '내 알림 설정 수정', nameEn: 'Edit notification settings', method: 'PUT', path: 'user/settings/notification' },
      { name: '회원 탈퇴', nameEn: 'Delete account', method: 'POST', path: 'user/deletion' },
      { name: '회원 차단', nameEn: 'Block user', method: 'POST', path: 'user/block' },
      { name: '회원 신고', nameEn: 'Report user', method: 'POST', path: 'user/report' },
    ],
  },
  {
    id: 'rent',
    label: 'Rent',
    labelKo: '렌트',
    endpoints: [
      { name: '렌트 정보 조회', nameEn: 'Rent detail', method: 'GET', path: 'rent/:rentIdx' },
      { name: '렌트 등록 폼 데이터 조회', nameEn: 'Create form schema', method: 'GET', path: 'rent/form-data' },
      { name: '렌트 수정 폼 데이터 조회', nameEn: 'Edit form schema', method: 'GET', path: 'rent/form-data/:rentIdx' },
      { name: '내 렌트 목록 조회', nameEn: 'My rent list', method: 'GET', path: 'rent/user/lists' },
      { name: '렌트 등록', nameEn: 'Create rent', method: 'POST', path: 'rent', media: 'multipart' },
      { name: '렌트 수정', nameEn: 'Update rent', method: 'PUT', path: 'rent', media: 'multipart' },
      { name: '렌트 삭제', nameEn: 'Delete rent', method: 'DELETE', path: 'rent/:rentIdx' },
      { name: '저장한 렌트 리스트 조회', nameEn: 'Saved rents', method: 'GET', path: 'rent/user/saved' },
      { name: '렌트 저장/저장 취소 토글', nameEn: 'Toggle saved rent', method: 'PUT', path: 'rent/:rentIdx/saved' },
      { name: '렌트 지도', nameEn: 'Rent map', method: 'GET', path: 'rent/map' },
      { name: '건물별 렌트 목록 조회', nameEn: 'Rents by building', method: 'GET', path: 'rent/building/:buildingIdx' },
      { name: '지도 렌트 리스트 (무한스크롤)', nameEn: 'Map rent list', method: 'GET', path: 'rent/map/list' },
      { name: '렌트 부스팅', nameEn: 'Boost rent', method: 'PUT', path: 'rent/user/boost' },
      { name: '렌트 유효기간 연장', nameEn: 'Renew rent', method: 'PUT', path: 'rent/user/renew' },
    ],
  },
  {
    id: 'roommate',
    label: 'Roommate',
    labelKo: '룸메이트',
    endpoints: [
      { name: '렌트 룸메이트 검색', nameEn: 'Roommate search', method: 'GET', path: 'rent/roommate/search' },
      { name: '렌트 룸메이트 목록 조회', nameEn: 'Roommate list', method: 'GET', path: 'rent/roommate/list/:rentIdx' },
      { name: '렌트 룸메이트 상세 조회', nameEn: 'Roommate detail', method: 'GET', path: 'rent/roommate/:rentIdx/:userIdx' },
      { name: '렌트 룸메이트 추가', nameEn: 'Add roommate', method: 'POST', path: 'rent/roommate' },
      { name: '렌트 룸메이트 삭제', nameEn: 'Delete roommate', method: 'DELETE', path: 'rent/roommate' },
    ],
  },
  {
    id: 'payment',
    label: 'Payment',
    labelKo: '결제',
    endpoints: [
      { name: '내 구독 정보 조회', nameEn: 'My subscription', method: 'GET', path: 'payment/subscription' },
      { name: '구독 플랜 리스트', nameEn: 'Subscription plans', method: 'GET', path: 'payment/subscription/plans' },
      { name: '구독 업그레이드 가능 목록', nameEn: 'Upgradeable plans', method: 'GET', path: 'payment/subscription/plans/upgrade' },
      { name: '크레딧 잔액 조회', nameEn: 'Credit balance', method: 'GET', path: 'payment/credits' },
      { name: '결제 내역 조회', nameEn: 'Payment history', method: 'GET', path: 'payment/history' },
      { name: '크레딧 사용내역', nameEn: 'Credit usage', method: 'GET', path: 'payment/credits/usage' },
      { name: 'Stripe 구독 시작', nameEn: 'Subscribe (Stripe)', method: 'POST', path: 'payment/subscribe/stripe' },
      { name: '인앱 구독 시작', nameEn: 'Subscribe (in-app)', method: 'POST', path: 'payment/subscribe/in-app' },
      { name: '구독 업그레이드', nameEn: 'Upgrade subscription', method: 'POST', path: 'payment/upgrade' },
      { name: '구독 취소', nameEn: 'Cancel subscription', method: 'POST', path: 'payment/cancel' },
    ],
  },
  {
    id: 'match',
    label: 'Match',
    labelKo: '매칭',
    endpoints: [
      { name: '매칭 상태 조회', nameEn: 'Match status', method: 'GET', path: 'match/status' },
      { name: '매칭 리스트', nameEn: 'Match list', method: 'GET', path: 'match/list' },
      { name: '매칭 상세 페이지', nameEn: 'Match detail', method: 'GET', path: 'match/:userIdx' },
      { name: '매칭 정보 생성', nameEn: 'Create match info', method: 'POST', path: 'match/info' },
      { name: '매칭 정보 수정', nameEn: 'Update match info', method: 'PUT', path: 'match/info' },
      { name: '매칭 상태 토글', nameEn: 'Toggle match', method: 'PUT', path: 'match/toggle' },
    ],
  },
  {
    id: 'chat',
    label: 'Chat',
    labelKo: '채팅',
    endpoints: [
      { name: 'FCM 토큰 저장', nameEn: 'Save FCM token', method: 'POST', path: 'chat/device-token' },
      { name: '일반 유저 채팅 목록', nameEn: 'User conversations', method: 'GET', path: 'chat/conversations/user' },
      { name: '에이전트 유저 채팅 목록', nameEn: 'Agent conversations', method: 'GET', path: 'chat/conversations/agent' },
      { name: '채팅방 메시지 조회', nameEn: 'Chat messages', method: 'GET', path: 'chat/messages/:conversationIdx' },
      { name: '채팅 상대방 프로필 상세 조회', nameEn: 'Chat partner profile', method: 'GET', path: 'chat/user/:userIdx' },
      { name: '메시지 전송', nameEn: 'Send message', method: 'POST', path: 'chat/message' },
      { name: '채팅방 생성', nameEn: 'Create conversation', method: 'POST', path: 'chat/conversations' },
      { name: '렌트 정보 공유 메시지 전송', nameEn: 'Share rent message', method: 'POST', path: 'chat/message/rent' },
      { name: '이미지 메시지 전송', nameEn: 'Send image message', method: 'POST', path: 'chat/message/image', media: 'multipart' },
      { name: '채팅방 나가기', nameEn: 'Leave conversation', method: 'DELETE', path: 'chat/conversations/:conversationIdx' },
    ],
  },
];

export const ELLIEO_API_BASE_PATH = '/v1/api';

export function buildEllieoFullUrl(origin, path) {
  const base = String(origin || 'https://test.ellieo.com').replace(/\/$/, '');
  const clean = String(path || '').replace(/^\/+/, '');
  return `${base}${ELLIEO_API_BASE_PATH}/${clean}`;
}

export function filterApiCatalog(catalog, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return catalog;

  return catalog
    .map((category) => ({
      ...category,
      endpoints: category.endpoints.filter((ep) => {
        const haystack = [ep.name, ep.nameEn, ep.method, ep.path, category.label, category.labelKo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      }),
    }))
    .filter((category) => category.endpoints.length > 0);
}

export const METHOD_STYLES = {
  GET: 'bg-sky-100 text-sky-800 ring-sky-200',
  POST: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  PUT: 'bg-amber-100 text-amber-800 ring-amber-200',
  DELETE: 'bg-red-100 text-red-800 ring-red-200',
};
```

### `src/app/util/extractApiErrorMessage.js`

```javascript
/** Turn JSON or HTML upstream error bodies into a readable string. */
export function extractApiErrorMessage(text) {
  if (!text) return '';

  const trimmed = String(text).trim();
  if (!trimmed) return '';

  if (/FUNCTION_PAYLOAD_TOO_LARGE|Request Entity Too Large|\b413\b/i.test(trimmed)) {
    return 'Upload is too large for the server (about 4 MB max). Photos are compressed automatically — try removing a few images or using smaller originals.';
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed);
      if (Array.isArray(json?.message)) return json.message.join(', ');
      if (typeof json?.message === 'string') return json.message;
      if (typeof json?.error === 'string') return json.error;
    } catch {
      // fall through
    }
  }

  if (trimmed.startsWith('<')) {
    const pre = trimmed.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (pre?.[1]) {
      return pre[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }
    return trimmed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return trimmed.slice(0, 500);
}

/** Known Ellieo API business error codes (when `message` is empty). */
const ELLIEO_ERROR_MESSAGES = {
  1: 'This unit already exists in this building.',
  2: 'Agent not approved or insufficient credits.',
  10000: 'The server could not save this listing (database error). Verify amenity/feature IDs and try again.',
};

function describeEllieoErrorCode(errorCode) {
  if (errorCode == null || errorCode === '') return '';
  const n = Number(errorCode);
  if (Number.isFinite(n) && ELLIEO_ERROR_MESSAGES[n]) return ELLIEO_ERROR_MESSAGES[n];
  return `Ellieo error ${errorCode}. Try again or contact support if this continues.`;
}

/** Normalize Ellieo / AppConnect JSON error bodies into one readable string. */
export function formatEllieoApiError(data, { status, text } = {}) {
  const parts = [];

  if (data && typeof data === 'object') {
    if (Array.isArray(data.message) && data.message.length) {
      parts.push(data.message.map((item) => String(item)).filter(Boolean).join(', '));
    } else if (typeof data.message === 'string' && data.message.trim()) {
      parts.push(data.message.trim());
    } else if (typeof data.error === 'string' && data.error.trim()) {
      parts.push(data.error.trim());
    }

    if (!parts.length && data.data && typeof data.data === 'object') {
      const nested = formatEllieoApiError(data.data, { status, text: '' });
      if (nested && !/^Request failed \(\d+\)$/.test(nested)) parts.push(nested);
    }

    if (!parts.length && data.errorCode != null && data.errorCode !== '') {
      parts.push(describeEllieoErrorCode(data.errorCode));
    } else if (data.errorCode != null && data.errorCode !== '' && parts.length) {
      // Append code when a message exists for support/debugging.
      const mapped = describeEllieoErrorCode(data.errorCode);
      if (mapped && !parts[0].includes(String(data.errorCode))) {
        parts[0] = `${parts[0]} (code ${data.errorCode})`;
      }
    }
  }

  if (!parts.length) {
    const fromText = extractApiErrorMessage(text || data?.raw);
    if (fromText) parts.push(fromText);
  }

  if (!parts.length) {
    const code = status || data?.statusCode;
    return code ? `Request failed (${code})` : 'Request failed';
  }

  return parts.join(' ');
}

const DEV_RECOMPILE_RE = /missing required error components/i;

/** Next.js dev server HTML shown while routes recompile after a save. */
export function isDevServerRecompileError(text) {
  return DEV_RECOMPILE_RE.test(String(text || ''));
}

export function formatDevServerRecompileError() {
  return 'The dev server is recompiling after a code change. Wait a few seconds and try again. If it keeps happening, stop all `npm run dev` processes, delete the `.next` folder, and restart.';
}

export async function readJsonResponse(res) {
  const text = await res.text();
  if (!text) return { ok: res.ok, data: null, text: '' };

  try {
    return { ok: res.ok, data: JSON.parse(text), text };
  } catch {
    const message = extractApiErrorMessage(text);
    return {
      ok: res.ok,
      data: message ? { error: message, raw: text.slice(0, 500) } : null,
      text,
      parseError: isDevServerRecompileError(text)
        ? formatDevServerRecompileError()
        : message || 'Invalid JSON response from server',
      devRecompile: isDevServerRecompileError(text),
    };
  }
}
```

### `src/app/api/app-connect/lib/ellieoServer.js`

```javascript
import { cookies } from 'next/headers';

export const ELLIEO_ACCESS_COOKIE = 'ellieo_app_access';
export const ELLIEO_REFRESH_COOKIE = 'ellieo_app_refresh';
export const ELLIEO_DEVICE_COOKIE = 'ellieo_app_device';

const ACCESS_MAX_AGE = 60 * 25; // 25 min (refresh before typical 30m JWT expiry)
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function getEllieoBaseUrl() {
  return (process.env.APP_CONNECT_API_BASE_URL || '').trim().replace(/\/$/, '');
}

export function getDefaultDeviceId() {
  return (process.env.APP_CONNECT_DEVICE_ID || '').trim();
}

export function extractEllieoTokens(payload) {
  const data =
    payload && typeof payload === 'object' && payload.data != null
      ? payload.data
      : payload;
  if (!data || typeof data !== 'object') return { accessToken: null, refreshToken: null };

  const accessToken =
    data.accessToken ??
    data.access_token ??
    data.token ??
    (data.tokens && (data.tokens.accessToken ?? data.tokens.access)) ??
    null;
  const refreshToken =
    data.refreshToken ??
    data.refresh_token ??
    (data.tokens && (data.tokens.refreshToken ?? data.tokens.refresh)) ??
    null;

  return {
    accessToken: accessToken ? String(accessToken) : null,
    refreshToken: refreshToken ? String(refreshToken) : null,
  };
}

export async function getOrCreateDeviceId() {
  const jar = await cookies();
  let deviceId = jar.get(ELLIEO_DEVICE_COOKIE)?.value?.trim();
  if (!deviceId) {
    deviceId =
      getDefaultDeviceId() ||
      `erp-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
  }
  return deviceId;
}

export async function setEllieoSession({ accessToken, refreshToken, deviceId }) {
  const jar = await cookies();
  const secure = process.env.NODE_ENV === 'production';

  if (deviceId) {
    jar.set(ELLIEO_DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_MAX_AGE,
    });
  }

  if (accessToken) {
    jar.set(ELLIEO_ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_MAX_AGE,
    });
  }

  if (refreshToken) {
    jar.set(ELLIEO_REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_MAX_AGE,
    });
  }
}

export async function clearEllieoSession() {
  const jar = await cookies();
  const opts = { path: '/', maxAge: 0 };
  jar.set(ELLIEO_ACCESS_COOKIE, '', opts);
  jar.set(ELLIEO_REFRESH_COOKIE, '', opts);
}

export async function getEllieoAccessToken() {
  const jar = await cookies();
  const fromCookie = jar.get(ELLIEO_ACCESS_COOKIE)?.value?.trim();
  if (fromCookie) return fromCookie;
  return (process.env.APP_CONNECT_API_KEY || '').trim() || null;
}

export async function getEllieoRefreshToken() {
  const jar = await cookies();
  return jar.get(ELLIEO_REFRESH_COOKIE)?.value?.trim() || null;
}

export async function buildEllieoHeaders({ accessToken, deviceId, includeJsonBody }) {
  const headers = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const id = deviceId || (await getOrCreateDeviceId());
  if (id) headers['x-device-id'] = id;
  if (includeJsonBody) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

export async function ellieoUpstreamFetch(path, { method = 'GET', body, accessToken, deviceId } = {}) {
  const baseUrl = getEllieoBaseUrl();
  if (!baseUrl) {
    throw new Error('APP_CONNECT_API_BASE_URL is not configured');
  }

  const cleanPath = String(path || '').replace(/^\/+/, '');
  const url = cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
  const hasBody = body != null && method !== 'GET' && method !== 'HEAD';

  const token = accessToken || (await getEllieoAccessToken());
  const devId = deviceId || (await getOrCreateDeviceId());

  const res = await fetch(url, {
    method,
    headers: await buildEllieoHeaders({
      accessToken: token,
      deviceId: devId,
      includeJsonBody: hasBody,
    }),
    body: hasBody ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { res, data };
}

export async function refreshEllieoAccessToken() {
  const refreshToken = await getEllieoRefreshToken();
  if (!refreshToken) return null;

  const { res, data } = await ellieoUpstreamFetch('auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    accessToken: null,
  });

  if (!res.ok) {
    const alt = await ellieoUpstreamFetch('auth/refresh', {
      method: 'POST',
      body: { token: refreshToken },
      accessToken: null,
    });
    if (!alt.res.ok) return null;
    const tokens = extractEllieoTokens(alt.data);
    if (!tokens.accessToken) return null;
    const deviceId = await getOrCreateDeviceId();
    await setEllieoSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || refreshToken,
      deviceId,
    });
    return tokens.accessToken;
  }

  const tokens = extractEllieoTokens(data);
  if (!tokens.accessToken) return null;

  const deviceId = await getOrCreateDeviceId();
  await setEllieoSession({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken || refreshToken,
    deviceId,
  });

  return tokens.accessToken;
}
```

### `src/app/api/app-connect/[[...path]]/route.js`

```javascript
import { NextResponse } from 'next/server';
import { extractApiErrorMessage } from '../../../util/extractApiErrorMessage';
import {
  buildEllieoHeaders,
  getEllieoAccessToken,
  getEllieoBaseUrl,
  getOrCreateDeviceId,
  refreshEllieoAccessToken,
} from '../lib/ellieoServer';

async function proxyRequest(request, context, retried = false, cachedBody = null) {
  const baseUrl = getEllieoBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        error:
          'AppConnect API is not configured. Set APP_CONNECT_API_BASE_URL in the server environment.',
      },
      { status: 503 },
    );
  }

  const accessToken = await getEllieoAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      {
        error: 'Not connected to Ellieo app. Sign in with Google on App Listings.',
        code: 'ELLIEO_AUTH_REQUIRED',
      },
      { status: 401 },
    );
  }

  const params = await context.params;
  const segments = Array.isArray(params?.path) ? params.path : [];
  const path = segments.map((s) => decodeURIComponent(String(s))).join('/');

  let upstreamUrl;
  try {
    upstreamUrl = new URL(path ? `${baseUrl}/${path}` : baseUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid resource path' }, { status: 400 });
  }

  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const method = request.method.toUpperCase();
  const hasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const deviceId = await getOrCreateDeviceId();
  const incomingContentType = request.headers.get('content-type') || '';
  const isMultipart = incomingContentType.includes('multipart/form-data');

  const headers = await buildEllieoHeaders({
    accessToken,
    deviceId,
    includeJsonBody: hasBody && !isMultipart && method !== 'DELETE',
  });

  if (isMultipart) {
    headers['Content-Type'] = incomingContentType;
  }

  const init = {
    method,
    headers,
  };

  if (hasBody && method !== 'GET' && method !== 'HEAD') {
    const body =
      cachedBody ??
      (isMultipart ? await request.arrayBuffer() : await request.text());
    init.body = body;
    cachedBody = body;
  }

  try {
    const upstream = await fetch(upstreamUrl.toString(), init);
    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || '';

    if (upstream.status === 401 && !retried) {
      const refreshed = await refreshEllieoAccessToken();
      if (refreshed) {
        return proxyRequest(request, context, true, cachedBody);
      }
    }

    if (contentType.includes('application/json')) {
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        const message = extractApiErrorMessage(text);
        return NextResponse.json(
          {
            error: message || 'Upstream returned invalid JSON',
            message,
            raw: text.slice(0, 500),
          },
          { status: upstream.status || 502 },
        );
      }
      return NextResponse.json(data ?? {}, { status: upstream.status });
    }

    const message = extractApiErrorMessage(text);
    return NextResponse.json(
      {
        error: message || `Upstream error (${upstream.status})`,
        message,
        raw: text.slice(0, 500),
      },
      { status: upstream.status },
    );
  } catch (err) {
    console.error('AppConnect proxy error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to reach upstream API' },
      { status: 502 },
    );
  }
}

export async function GET(request, context) {
  return proxyRequest(request, context);
}

export async function POST(request, context) {
  return proxyRequest(request, context);
}

export async function PUT(request, context) {
  return proxyRequest(request, context);
}

export async function PATCH(request, context) {
  return proxyRequest(request, context);
}

export async function DELETE(request, context) {
  return proxyRequest(request, context);
}

export const maxDuration = 60;
```

### `src/app/api/app-connect/config/route.js`

```javascript
import { NextResponse } from 'next/server';
import { getEllieoAccessToken, getEllieoBaseUrl, getEllieoRefreshToken } from '../lib/ellieoServer';

/**
 * GET /api/app-connect/config
 * Returns whether the external AppConnect API is configured (no secrets).
 */
export async function GET() {
  const baseUrl = getEllieoBaseUrl();
  let origin = null;
  if (baseUrl) {
    try {
      origin = new URL(baseUrl).origin;
    } catch {
      origin = baseUrl.replace(/\/$/, '');
    }
  }
  const accessToken = await getEllieoAccessToken();
  const refreshToken = await getEllieoRefreshToken();
  const hasEnvKey = Boolean((process.env.APP_CONNECT_API_KEY || '').trim());

  return NextResponse.json({
    configured: Boolean(baseUrl),
    origin,
    connected: Boolean(accessToken),
    hasRefresh: Boolean(refreshToken),
    hasDeviceId: Boolean((process.env.APP_CONNECT_DEVICE_ID || '').trim()),
    usesEnvFallback: hasEnvKey && !refreshToken,
    authMode: refreshToken || accessToken ? 'google-session' : hasEnvKey ? 'env-token' : 'none',
  });
}
```

### `src/app/api/app-connect/auth/google/route.js`

```javascript
import { NextResponse } from 'next/server';
import {
  ellieoUpstreamFetch,
  extractEllieoTokens,
  getOrCreateDeviceId,
  setEllieoSession,
} from '../../lib/ellieoServer';

/**
 * POST /api/app-connect/auth/google
 * Exchange Google idToken for Ellieo agent access (auth/login/google).
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const idToken =
      body?.idToken ?? body?.googleIdToken ?? body?.token ?? body?.credential;
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: 'Google idToken is required' },
        { status: 400 },
      );
    }

    const deviceId = await getOrCreateDeviceId();

    const loginBodies = [
      { idToken, platform: 'web' },
      { idToken },
      { googleIdToken: idToken, platform: 'web' },
      { googleIdToken: idToken },
      { token: idToken },
    ];

    let lastError = null;
    let tokens = null;
    let loginData = null;

    for (const loginBody of loginBodies) {
      const { res, data } = await ellieoUpstreamFetch('auth/login/google', {
        method: 'POST',
        body: loginBody,
        accessToken: null,
        deviceId,
      });

      if (res.ok) {
        tokens = extractEllieoTokens(data);
        loginData = data;
        if (tokens.accessToken) break;
      } else {
        lastError =
          (data && (data.message || data.error)) ||
          `Ellieo login failed (${res.status})`;
      }
    }

    if (!tokens?.accessToken) {
      return NextResponse.json(
        {
          error: lastError || 'Ellieo did not return an access token',
          hint: 'Use a Google account registered as an Ellieo agent.',
        },
        { status: 401 },
      );
    }

    await setEllieoSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      deviceId,
    });

    return NextResponse.json({
      connected: true,
      hasRefresh: Boolean(tokens.refreshToken),
      data: loginData?.data ?? loginData,
    });
  } catch (err) {
    console.error('Ellieo Google login error:', err);
    return NextResponse.json(
      { error: err.message || 'Google login failed' },
      { status: 500 },
    );
  }
}
```

### `src/app/api/app-connect/auth/session/route.js`

```javascript
import { NextResponse } from 'next/server';
import {
  clearEllieoSession,
  getEllieoAccessToken,
  getEllieoRefreshToken,
  getEllieoBaseUrl,
} from '../../lib/ellieoServer';

/**
 * GET /api/app-connect/auth/session — Ellieo app connection status
 * DELETE — disconnect (clear tokens)
 */
export async function GET() {
  const baseUrl = getEllieoBaseUrl();
  const accessToken = await getEllieoAccessToken();
  const refreshToken = await getEllieoRefreshToken();
  const fromEnv = Boolean((process.env.APP_CONNECT_API_KEY || '').trim());

  return NextResponse.json({
    configured: Boolean(baseUrl),
    connected: Boolean(accessToken),
    hasRefresh: Boolean(refreshToken),
    usesEnvFallback: fromEnv && !refreshToken,
  });
}

export async function DELETE() {
  await clearEllieoSession();
  return NextResponse.json({ connected: false });
}
```

### `src/app/api/app-connect/auth/refresh/route.js`

```javascript
import { NextResponse } from 'next/server';
import { refreshEllieoAccessToken } from '../../lib/ellieoServer';

/** POST /api/app-connect/auth/refresh */
export async function POST() {
  const accessToken = await refreshEllieoAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Session expired. Sign in with Google again.' },
      { status: 401 },
    );
  }
  return NextResponse.json({ connected: true });
}
```

### `src/app/components/GlassRingSpinner.js`

```javascript
'use client';

/** Branded loading indicator — ripple pulse rings + centered logo (Option C). */
export default function GlassRingSpinner({
  size = 192,
  label = 'Loading...',
  className = '',
  textClassName = 'text-slate-500',
}) {
  const spinnerSize = Math.max(48, size);
  const ping1 = Math.round(spinnerSize * (64 / 192));
  const ping2 = Math.round(spinnerSize * (96 / 192));
  const ping3 = Math.round(spinnerSize * (128 / 192));
  const coreSize = Math.round(spinnerSize * (80 / 192));
  const logoSize = Math.round(spinnerSize * (48 / 192));
  const coreRadius = Math.round(coreSize * 0.22);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className='relative flex items-center justify-center'
        style={{ width: spinnerSize, height: spinnerSize }}
        aria-hidden='true'
      >
        <span
          className='absolute animate-ping rounded-full bg-violet-500/30 [animation-duration:1.4s]'
          style={{ width: ping1, height: ping1 }}
        />
        <span
          className='absolute animate-ping rounded-full bg-indigo-500/20 [animation-delay:240ms] [animation-duration:1.9s]'
          style={{ width: ping2, height: ping2 }}
        />
        <span
          className='absolute animate-ping rounded-full bg-fuchsia-500/10 [animation-delay:380ms] [animation-duration:2.2s]'
          style={{ width: ping3, height: ping3 }}
        />
        <div
          className='relative flex items-center justify-center border border-white/20 bg-slate-900/90 shadow-[0_0_30px_rgba(139,92,246,0.35)]'
          style={{
            width: coreSize,
            height: coreSize,
            borderRadius: coreRadius,
          }}
        >
          <img
            src='/img/ellieo_logo.png'
            alt='Ellieo logo'
            className='object-contain'
            style={{ width: logoSize, height: logoSize }}
          />
        </div>
      </div>
      {label ? (
        <p className={`mt-4 text-sm font-medium tracking-wide ${textClassName}`}>
          {label}
        </p>
      ) : null}
    </div>
  );
}
```

### `src/app/util/roles.js` (AppConnect access helpers only)

```javascript
export function getManagerEmails() {
  if (typeof process === 'undefined' || !process.env.NEXT_PUBLIC_MANAGER_EMAILS) {
    return [];
  }
  return process.env.NEXT_PUBLIC_MANAGER_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isManager(user) {
  if (!user?.email) return false;
  return getManagerEmails().includes(user.email.toLowerCase());
}

/** Admin (Super Admin) is the single hardcoded email. */
export function isAdmin(user) {
  return user?.email === 'simon@misaeng.com';
}

export function isTeamLeaderRole(role) {
  const r = String(role || '').trim();
  return r === 'Manager' || r === 'Administrator' || r === 'Super Admin';
}

/** Can access AppConnect: Admin (hardcoded), Manager (env list), or agent record has role Manager/Admin. */
export function canAccessAgents(user, userAgent = null) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (isManager(user)) return true;
  return isTeamLeaderRole(userAgent?.role);
}
```

### Shell wiring (from `src/app/page.js`)

```javascript
import AppConnect from './widget/app-connect';
import { IoCloudOutline } from 'react-icons/io5';

// widget render map
'app-connect': () => <AppConnect />,

// sidebar item (restrict to managers/admins the same way as other Super Admin tools)
{
  id: 'app-connect',
  icon: IoCloudOutline,
  label: 'AppConnect',
  isSuperAdminOnly: true,
}

// header title / subtitle / gradient
'app-connect': 'AppConnect'
// subtitle: 'Browse, create, update, and delete records through your external API.'
'app-connect': 'from-violet-600 via-indigo-600 to-blue-700'
```

### Auth dependency

`ellieoAppAuth.js` imports Firebase Auth from `./firebase` and calls `auth.currentUser.getIdToken(true)`. Provide an equivalent Google ID token for `POST /api/app-connect/auth/google`.

`app-connect.js` uses `useAuth()` from `../context/AuthContext` and expects `{ user, userAgent }` where `user.email` is the signed-in ERP account.

`GlassRingSpinner` can be replaced with any loading spinner; keep the same default export name or update the import in `app-connect.js`.
