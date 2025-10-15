/**
 * Progress 进度条组件
 */

import { HTMLAttributes, forwardRef } from 'react';
import './progress.css';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number; // 0-100
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, className = '', ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value));
    
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clampedValue}
        className={`progress ${className}`}
        {...props}
      >
        <div
          className="progress-indicator"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';
