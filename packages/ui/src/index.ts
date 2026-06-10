/**
 * Focus Forge UI — Design System
 * ─────────────────────────────────────────────────────────────────────────────
 * All components from 02-design-system.md §9.
 * Import the tailwind preset separately: @focus-forge/ui/tailwind.preset
 * Import CSS variables separately: @focus-forge/ui/styles
 */

// ── Utilities ────────────────────────────────────────────────────────────────
export { cn } from './lib/cn';

// ── Theme ────────────────────────────────────────────────────────────────────
export { ThemeProvider, useTheme } from './theme/ThemeProvider';

// ── Primitives ───────────────────────────────────────────────────────────────
export { Button }      from './components/Button';
export { IconButton }  from './components/IconButton';
export { Input }       from './components/Input';
export { Textarea }    from './components/Textarea';
export { Select }      from './components/Select';
export { Checkbox }    from './components/Checkbox';
export { Radio }       from './components/Radio';
export { Toggle }      from './components/Toggle';
export { Slider }      from './components/Slider';
export { Label }       from './components/Label';

// ── Containers ───────────────────────────────────────────────────────────────
export { Card }        from './components/Card';
export { Modal }       from './components/Modal';
export { Drawer }      from './components/Drawer';
export { ToastProvider, useToast } from './components/Toast';

// ── Domain-specific ──────────────────────────────────────────────────────────
export { TaskCard }       from './components/TaskCard';
export { AnalogTimer }    from './components/AnalogTimer';
export { VoiceDumpButton } from './components/VoiceDumpButton';

// ── Feedback ─────────────────────────────────────────────────────────────────
export { EmptyState }     from './components/EmptyState';
export { LoadingSpinner } from './components/LoadingSpinner';
export { SkeletonLoader } from './components/SkeletonLoader';
export { ErrorBoundary }  from './components/ErrorBoundary';

// ── Types ────────────────────────────────────────────────────────────────────
export type { ButtonProps }        from './components/Button';
export type { IconButtonProps }    from './components/IconButton';
export type { InputProps }         from './components/Input';
export type { TextareaProps }      from './components/Textarea';
export type { SelectProps }        from './components/Select';
export type { CheckboxProps }      from './components/Checkbox';
export type { RadioProps }         from './components/Radio';
export type { ToggleProps }        from './components/Toggle';
export type { SliderProps }        from './components/Slider';
export type { LabelProps }         from './components/Label';
export type { CardProps }          from './components/Card';
export type { ModalProps }         from './components/Modal';
export type { DrawerProps }        from './components/Drawer';
export type { ToastData, ToastType } from './components/Toast';
export type { EmptyStateProps }    from './components/EmptyState';
export type { LoadingSpinnerProps } from './components/LoadingSpinner';
export type { SkeletonLoaderProps } from './components/SkeletonLoader';
export type { TaskCardProps, TaskCardTask } from './components/TaskCard';
export type { AnalogTimerProps, AnalogTimerZone } from './components/AnalogTimer';
export type { VoiceDumpButtonProps } from './components/VoiceDumpButton';
