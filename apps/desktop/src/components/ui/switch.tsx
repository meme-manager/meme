/**
 * Switch 开关组件
 */

import { forwardRef } from 'react';
import './switch.css';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled = false, className = '' }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`switch ${checked ? 'switch-checked' : ''} ${disabled ? 'switch-disabled' : ''} ${className}`}
        onClick={() => !disabled && onCheckedChange(!checked)}
      >
        <span className="switch-thumb" />
      </button>
    );
  }
);

Switch.displayName = 'Switch';
