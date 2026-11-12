/**
 * Android App Links: misaeng.com links shared from the app open the Misaeng Android app (com.misaeng.nyc) when it is
 * installed, and the web page otherwise (iOS: ../apple-app-site-association). Which paths open the app is decided by
 * the app's AndroidManifest intent filters; this file only proves the site trusts the app's signing certificates.
 */
const PACKAGE_NAME = 'com.misaeng.nyc'

/** Upload key (~/Simon/misaeng-android-keys/upload.jks, alias "upload"): local and CI release builds, sideloaded APKs. */
const UPLOAD_KEY_SHA256 = '35:D1:36:DF:B8:8E:A5:E9:AE:8C:87:51:C6:5F:70:4A:44:6F:6E:9F:C2:71:15:21:33:3E:35:A5:E1:29:49:7D'

/**
 * Google Play app signing key: Play re-signs every install from the store with a Google-held key, so store installs
 * only verify against this one. Copy it from Play Console → Misaeng → Test and release → App integrity →
 * App signing → "App signing key certificate" SHA-256. Empty until then (store installs open the browser).
 */
const PLAY_APP_SIGNING_KEY_SHA256 = ''

const body = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: PACKAGE_NAME,
      sha256_cert_fingerprints: [PLAY_APP_SIGNING_KEY_SHA256, UPLOAD_KEY_SHA256].filter(Boolean),
    },
  },
]

export const dynamic = 'force-static'

export function GET() {
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } })
}
