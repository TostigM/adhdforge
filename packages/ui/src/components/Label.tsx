/**
 * Label
 * ─────────────────────────────────────────────────────────────────────────────
 * Always pair with an input via htmlFor. Required by §12.2.
 *
 * @example
 *   <Label htmlFor="email">Your email</Label>
 *   <Input id="email" type="email" />
 */
import React, { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { required, children, className, ...props },
  ref,
) {
  return (
    <label
      ref={ref}
      className={cn('block text-sm font-medium text-text-primary', className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-soft-error" aria-label="required">
          *
        </span>
      )}
    </label>
  );
});

Label.displayName = 'Label';
