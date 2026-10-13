import type { StatusChoice } from '../features/status'

export function StatusSymbol({ choice }: { choice: StatusChoice }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {choice === 'focus' && <><circle cx="16" cy="16" r="8" /><circle cx="16" cy="16" r="2.5" /><path d="M16 3v3m0 20v3M3 16h3m20 0h3" /></>}
    {choice === 'sleep' && <><path d="M19 5a11 11 0 1 0 8 17A12 12 0 0 1 19 5Z" /><path d="m25 5 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" /></>}
    {choice === 'dnd' && <><path d="M10 10a7 7 0 0 1 13 4v5l3 4H12M6 23h1M13 27h6M5 5l22 22M9 15v4l-3 4" /></>}
    {choice === 'calm' && <><path d="M4 11c4-5 8 5 12 0s8 5 12 0M4 17c4-5 8 5 12 0s8 5 12 0M7 23c3-3 6 3 9 0s6 3 9 0" /></>}
    {choice === 'happy' && <><circle cx="16" cy="16" r="8" /><path d="M12 17q4 5 8 0M16 2v3m0 22v3M2 16h3m22 0h3M6 6l2 2m16 16 2 2M6 26l2-2M24 8l2-2" /></>}
    {choice === 'anxious' && <><path d="M6 21c-5-6 2-12 7-8-4-9 10-12 11-4 8 1 7 12 0 13H6" /><path d="m17 15-4 6h5l-3 7" /></>}
    {choice === 'lonely' && <><circle cx="16" cy="10" r="3" /><path d="M11 24v-4a5 5 0 0 1 10 0v4M6 26h20" /><circle cx="26" cy="5" r="1" fill="currentColor" stroke="none" /></>}
  </svg>
}
