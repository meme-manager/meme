/**
 * Alert 警告提示组件
 */

import { HTMLAttributes, forwardRef } from 'react';
import './alert.css';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={`alert alert-${variant} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

interface AlertDescriptionProps extends HTMLAttributes<HTMLDivElement> {}

export const AlertDescription = forwardRef<HTMLDivElement, AlertDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`alert-description ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

AlertDescription.displayName = 'AlertDescription';
