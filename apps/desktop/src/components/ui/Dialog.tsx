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
  console.log('[Dialog] 渲染，open:', open, 'title:', title);
  
  useEffect(() => {
    if (open) {
      console.log('[Dialog] 打开对话框，禁用 body 滚动');
      document.body.style.overflow = 'hidden';
    } else {
      console.log('[Dialog] 关闭对话框，恢复 body 滚动');
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  
  if (!open) {
    console.log('[Dialog] open 为 false，不渲染');
    return null;
  }
  
  console.log('[Dialog] 渲染对话框内容');
  
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
