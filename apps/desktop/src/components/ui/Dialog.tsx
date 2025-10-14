import { ReactNode, useEffect } from 'react';
import './Dialog.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  
  if (!open) return null;
  
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">{title}</h2>
          <button className="dialog-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="dialog-content">
          {children}
        </div>
        
        {footer && (
          <div className="dialog-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
