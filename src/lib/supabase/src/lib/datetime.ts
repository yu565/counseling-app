// src/lib/datetime.ts
export const fmtUTC = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'UTC',
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' UTC';
