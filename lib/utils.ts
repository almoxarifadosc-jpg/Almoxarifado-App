import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseAnyDate(date: string | Date | unknown): Date {
  if (!date) return new Date(NaN);
  if (date instanceof Date) return date;
  if (typeof date === 'string') {
    const d = new Date(date);
    if (!isNaN(d.getTime())) return d;
    
    // Tenta formato DD/MM/YYYY
    const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    }
  }
  return new Date(NaN);
}

export function parseISODate(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}
