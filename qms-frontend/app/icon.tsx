import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '32px',
          height: '32px',
          background: '#56425b',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Q
      </div>
    ),
    {
      width: 32,
      height: 32,
    }
  )
}
