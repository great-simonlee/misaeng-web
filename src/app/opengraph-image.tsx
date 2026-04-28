import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Misaeng – Ellieo verified housing platform'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

export default async function OpenGraphImage() {
  const logoBuffer = await fetch(new URL('../../public/img/ms_logo.png', import.meta.url)).then(
    (response) => response.arrayBuffer()
  )
  const logoDataUri = `data:image/png;base64,${arrayBufferToBase64(logoBuffer)}`

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 12% 15%, rgba(246, 67, 16, 0.38) 0%, rgba(246, 67, 16, 0) 40%), radial-gradient(circle at 88% 85%, rgba(246, 67, 16, 0.22) 0%, rgba(246, 67, 16, 0) 38%), linear-gradient(135deg, #0b1020 0%, #10172a 60%, #141f36 100%)',
        color: '#ffffff',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '1080px',
          height: '420px',
          borderRadius: '24px',
          padding: '28px 34px',
          backgroundColor: '#ffffff',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 16px 40px rgba(2, 6, 23, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
          color: '#0f172a',
          alignItems: 'center',
          gap: '28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            height: '186px',
            width: '186px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '22px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            flexShrink: 0,
          }}
        >
          <img
            src={logoDataUri}
            alt='Misaeng logo'
            style={{
              height: '142px',
              width: '142px',
              objectFit: 'contain',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '810px',
            minWidth: 0,
            gap: '10px',
          }}
        >
          <div
            style={{
              fontSize: '46px',
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              color: '#0f172a',
              fontFamily:
                '"Arial Black", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                textShadow:
                  '0.35px 0 #0f172a, -0.35px 0 #0f172a, 0 0.35px #0f172a, 0 -0.35px #0f172a',
            }}
          >
            Misaeng
          </div>
          <p
            style={{
              margin: 0,
              width: '790px',
              fontSize: '26px',
              fontWeight: 500,
              color: '#475569',
              lineHeight: 1.25,
              letterSpacing: '-0.005em',
            }}
          >
            Verified housing platform for NYC students and professionals
          </p>
          <div
            style={{
              marginTop: '4px',
              fontSize: '28px',
              fontWeight: 700,
              color: '#f64310',
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}
          >
            misaeng.com
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  )
}
