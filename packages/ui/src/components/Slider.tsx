/**
 * Slider — for timer duration, visible_slots, etc.
 * ─────────────────────────────────────────────────────────────────────────────
 * @example
 *   <Slider label="Timer duration" min={5} max={60} step={5} defaultValue={25} />
 */
import React, { forwardRef } from 'react';
import { cn } from '../lib/cn';
import { Label } from './Label';

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  /** Shows current value next to the label */
  showValue?: boolean;
  /** Formats the displayed value (e.g., v => `${v} min`) */
  formatValue?: (value: number) => string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    label,
    hint,
    showValue = false,
    formatValue = (v) => String(v),
    id,
    className,
    value,
    defaultValue,
    ...props
  },
  ref,
) {
  const displayValue = value ?? defaultValue;

  return (
    <div className="space-y-2">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <Label htmlFor={id}>{label}</Label>}
          {showValue && displayValue !== undefined && (
            <span className="text-sm text-text-secondary font-mono">
              {formatValue(Number(displayValue))}
            </span>
          )}
        </div>
      )}

      <input
        ref={ref}
        id={id}
        type="range"
        value={value}
        defaultValue={defaultValue}
        className={cn(
          'w-full h-2 rounded-full appearance-none cursor-pointer',
          'bg-bg-elevated',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent',
          '[&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:duration-fast',
          '[&::-webkit-slider-thumb]:hover:bg-accent-soft',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />

      {hint && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  );
});

Slider.displayName = 'Slider';
