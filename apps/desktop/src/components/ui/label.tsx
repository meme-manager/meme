/**
 * Label 标签组件
 */

import { LabelHTMLAttributes, forwardRef } from 'react';
import './label.css';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <label ref={ref} className={`label ${className}`} {...props}>
        {children}
      </label>
    );
  }
);

Label.displayName = 'Label';
