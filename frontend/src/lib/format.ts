import type { DataQuality } from './types';

export function formatKg(val: number | null | undefined, precision = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  return Number(val).toFixed(precision);
}

export function formatWatts(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.0';
  return Number(val).toFixed(1);
}

export function formatKwh(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.000';
  return Number(val).toFixed(3);
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return `${Number(val).toFixed(1)}%`;
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

export function getQualityBadge(quality: DataQuality): { label: string; bg: string; text: string; border: string } {
  switch (quality) {
    case 'measured':
      return {
        label: 'MEASURED',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-300'
      };
    case 'estimated':
      return {
        label: 'ESTIMATED',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300'
      };
    case 'manual':
      return {
        label: 'MANUAL ENTRY',
        bg: 'bg-sky-50',
        text: 'text-sky-800',
        border: 'border-sky-300'
      };
    case 'assumed':
    default:
      return {
        label: 'ASSUMED',
        bg: 'bg-stone-100',
        text: 'text-stone-700',
        border: 'border-stone-300'
      };
  }
}
