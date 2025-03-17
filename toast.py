from PyQt5.QtWidgets import QWidget, QLabel
from PyQt5.QtCore import Qt, QTimer, QPoint
from PyQt5.QtGui import QPainter, QColor

class Toast(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setAttribute(Qt.WA_ShowWithoutActivating)
        
        # 创建标签
        self.label = QLabel(self)
        self.label.setStyleSheet("""
            QLabel {
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                background-color: rgba(0, 0, 0, 180);
            }
        """)
        self.label.setAlignment(Qt.AlignCenter)
        
        # 设置定时器
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.hide)
    
    def showMessage(self, message, duration=2000):
        # 设置消息文本
        self.label.setText(message)
        self.label.adjustSize()
        
        # 调整窗口大小
        self.resize(self.label.size())
        
        # 计算位置（在父窗口底部居中）
        if self.parent():
            parent_rect = self.parent().rect()
            x = (parent_rect.width() - self.width()) // 2
            y = parent_rect.height() - self.height() - 20
            self.move(self.parent().mapToGlobal(QPoint(x, y)))
        
        # 显示并启动定时器
        self.show()
        self.timer.start(duration)