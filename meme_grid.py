from PyQt5.QtWidgets import QWidget, QGridLayout, QLabel, QScrollArea, QVBoxLayout, QHBoxLayout
from PyQt5.QtGui import QPixmap
from PyQt5.QtCore import Qt

class MemeGrid(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()

    def init_ui(self):
        # 创建滚动区域
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        content_widget = QWidget()
        
        # 网格布局
        self.grid = QGridLayout(content_widget)
        self.grid.setSpacing(10)
        
        # 示例数据（后续替换为真实数据）
        self.demo_data = [
            {'path': 'demo1.jpg', 'keywords': ['开心', '庆祝']},
            {'path': 'demo2.png', 'keywords': ['无奈', '吐槽']}
        ]
        
        # 添加示例表情包
        self.load_demo_items()
        
        scroll.setWidget(content_widget)
        self.main_layout = QVBoxLayout()
        self.main_layout.addWidget(scroll)
        self.setLayout(self.main_layout)
        self.main_layout.addWidget(scroll)

    def load_demo_items(self):
        row, col = 0, 0
        max_columns = 4
        
        for item in self.demo_data:
            thumbnail = QLabel()
            thumbnail.setPixmap(QPixmap(item['path']).scaled(150, 150, Qt.KeepAspectRatio))
            thumbnail.setAlignment(Qt.AlignCenter)
            
            self.grid.addWidget(thumbnail, row, col)
            col += 1
            if col >= max_columns:
                col = 0
                row += 1