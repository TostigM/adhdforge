/**
 * cn — className utility
 * Combines clsx (conditional joining) with tailwind-merge (deduplication).
 * Use for all component className props.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
