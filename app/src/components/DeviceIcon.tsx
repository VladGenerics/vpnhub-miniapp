import type { ReactNode } from 'react'
import type { Platform } from '../data/mock'

const COLORS: Record<Platform, string> = {
  macos: 'linear-gradient(160deg,#6c7a8c,#3d4756)',
  ios: 'linear-gradient(160deg,#4fb5ff,#1e7fe0)',
  android: 'linear-gradient(160deg,#4fd3a0,#1f9e6d)',
  windows: 'linear-gradient(160deg,#4f8dff,#2a5fd6)',
  linux: 'linear-gradient(160deg,#ffb547,#e07b16)',
}

const GLYPH: Record<Platform, ReactNode> = {
  macos: (
    <>
      <rect x="4" y="5" width="16" height="10.5" rx="1.6" fill="none" stroke="#fff" strokeWidth="1.8" />
      <path d="M2.5 18.5h19" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  ios: (
    <>
      <rect x="7" y="2.8" width="10" height="18.4" rx="2.4" fill="none" stroke="#fff" strokeWidth="1.8" />
      <path d="M10.6 5.6h2.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  android: (
    <>
      <path d="M6 11a6 6 0 0112 0v1H6z" fill="#fff" />
      <path d="M8 6.2L6.8 4.4M16 6.2l1.2-1.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="6" y="13" width="12" height="6.5" rx="1.6" fill="#fff" opacity=".85" />
    </>
  ),
  windows: (
    <path d="M4 5.6l7-1v6.9H4zM12.4 4.4L20 3.3v8.2h-7.6zM4 12.9h7v6.9l-7-1zM12.4 12.9H20v8.2l-7.6-1.1z" fill="#fff" />
  ),
  linux: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <path d="M7 9.5l2.6 2.3L7 14.2M11.5 14.5H16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
}

export function DeviceIcon({ platform, size = 40 }: { platform: Platform; size?: number }) {
  return (
    <span className="device-icon" style={{ background: COLORS[platform], width: size, height: size, borderRadius: size * 0.28 }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" aria-hidden>
        {GLYPH[platform]}
      </svg>
    </span>
  )
}
