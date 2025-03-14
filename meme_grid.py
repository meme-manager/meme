from PyQt5.QtWidgets import QWidget, QGridLayout, QLabel, QScrollArea, QVBoxLayout, QHBoxLayout
from PyQt5.QtGui import QPixmap
from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import QSplitter, QTabWidget, QFormLayout, QLineEdit, QTextEdit
from keyword_editor import KeywordEditor

class MemeGrid(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()

    def init_ui(self):
        # 创建主分割器
        splitter = QSplitter(Qt.Horizontal)
        
        # 左侧滚动区域
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
        # 右侧详情面板
        detail_panel = QWidget()
        tab_widget = QTabWidget()
        
        # 基本信息标签页
        basic_info = QWidget()
        form_layout = QFormLayout()
        form_layout.addRow('文件名:', QLineEdit())
        form_layout.addRow('添加时间:', QLineEdit())
        basic_info.setLayout(form_layout)
        
        # 替换关键词标签页
        keyword_tab = KeywordEditor()
        keyword_tab.setLayout(QVBoxLayout())
        keyword_tab.layout().addWidget(QLabel('关键词编辑区域'))
        
        tab_widget.addTab(basic_info, '基本信息')
        tab_widget.addTab(keyword_tab, '关键词')
        
        detail_panel.setLayout(QVBoxLayout())
        detail_panel.layout().addWidget(tab_widget)
        
        # 将左右两部分加入分割器
        splitter.addWidget(scroll)
        splitter.addWidget(detail_panel)
        
        self.main_layout = QVBoxLayout()
        self.main_layout.addWidget(splitter)
        self.setLayout(self.main_layout)
        self.main_layout.addWidget(scroll)
        
        # 启用拖拽支持
        self.setAcceptDrops(True)
        
    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()

    def dropEvent(self, event):
        for url in event.mimeData().urls():
            file_path = url.toLocalFile()
            # 后续实现文件处理逻辑

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