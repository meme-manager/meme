/**
 * Textarea 多行文本输入组件
 */

import { TextareaHTMLAttributes, forwardRef } from 'react';
import './textarea.css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <div className="textarea-wrapper">
        <textarea
          ref={ref}
          className={`textarea ${error ? 'textarea-error' : ''} ${className}`}
          {...props}
        />
        {error && <span className="textarea-error-text">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
