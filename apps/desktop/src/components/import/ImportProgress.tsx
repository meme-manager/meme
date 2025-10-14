import { create } from 'zustand';
import './ImportProgress.css';

interface ImportTask {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface ImportProgressState {
  tasks: ImportTask[];
  visible: boolean;
  addTask: (fileName: string) => string;
  updateTask: (id: string, updates: Partial<ImportTask>) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
  show: () => void;
  hide: () => void;
}

export const useImportProgress = create<ImportProgressState>((set) => ({
  tasks: [],
  visible: false,
  
  addTask: (fileName) => {
    const id = `task-${Date.now()}-${Math.random()}`;
    set((state) => ({
      tasks: [...state.tasks, { id, fileName, status: 'pending', progress: 0 }],
      visible: true,
    }));
    return id;
  },
  
  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    }));
  },
  
  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));
  },
  
  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status === 'processing' || task.status === 'pending'),
    }));
  },
  
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
}));

export function ImportProgress() {
  const { tasks, visible, clearCompleted, hide } = useImportProgress();
  
  if (!visible || tasks.length === 0) return null;
  
  const completedCount = tasks.filter((t) => t.status === 'success').length;
  const errorCount = tasks.filter((t) => t.status === 'error').length;
  const processingCount = tasks.filter((t) => t.status === 'processing' || t.status === 'pending').length;
  
  return (
    <div className="import-progress">
      <div className="import-progress-header">
        <h3>导入进度</h3>
        <div className="import-progress-actions">
          {processingCount === 0 && (
            <button className="clear-btn" onClick={clearCompleted}>
              清除
            </button>
          )}
          <button className="close-btn" onClick={hide}>
            ✕
          </button>
        </div>
      </div>
      
      <div className="import-progress-summary">
        <span className="summary-item">
          总计: {tasks.length}
        </span>
        {completedCount > 0 && (
          <span className="summary-item success">
            成功: {completedCount}
          </span>
        )}
        {errorCount > 0 && (
          <span className="summary-item error">
            失败: {errorCount}
          </span>
        )}
        {processingCount > 0 && (
          <span className="summary-item processing">
            进行中: {processingCount}
          </span>
        )}
      </div>
      
      <div className="import-progress-list">
        {tasks.map((task) => (
          <div key={task.id} className={`import-task import-task-${task.status}`}>
            <div className="task-icon">
              {task.status === 'success' && '✓'}
              {task.status === 'error' && '✕'}
              {(task.status === 'processing' || task.status === 'pending') && '⋯'}
            </div>
            <div className="task-info">
              <div className="task-name">{task.fileName}</div>
              {task.error && <div className="task-error">{task.error}</div>}
              {task.status === 'processing' && (
                <div className="task-progress">
                  <div className="task-progress-bar" style={{ width: `${task.progress}%` }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
