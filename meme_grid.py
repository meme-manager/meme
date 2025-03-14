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
            # 验证文件类型
            if not self.is_valid_image(file_path):
                continue
                
            # 生成缩略图并添加到网格
            self.add_meme_to_grid(file_path)
    
    def is_valid_image(self, file_path):
        valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
        return any(file_path.lower().endswith(ext) for ext in valid_extensions)
    
    def add_meme_to_grid(self, file_path):
        # 计算新项目的位置
        total_items = self.grid.count()
        max_columns = 4
        row = total_items // max_columns
        col = total_items % max_columns
        
        # 创建缩略图
        thumbnail = QLabel()
        thumbnail.setFixedSize(150, 150)
        pixmap = QPixmap(file_path)
        scaled_pixmap = pixmap.scaled(150, 150, Qt.KeepAspectRatio, Qt.SmoothTransformation)
        thumbnail.setPixmap(scaled_pixmap)
        thumbnail.setAlignment(Qt.AlignCenter)
        thumbnail.mousePressEvent = lambda e: self.show_preview(file_path)
        
        # 添加到网格
        self.grid.addWidget(thumbnail, row, col)
    
    def show_preview(self, file_path):
        preview_window = QWidget()
        preview_window.setWindowTitle('预览')
        preview_window.setGeometry(100, 100, 800, 600)
        
        layout = QVBoxLayout()
        preview_label = QLabel()
        pixmap = QPixmap(file_path)
        preview_label.setPixmap(pixmap.scaled(780, 580, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        preview_label.setAlignment(Qt.AlignCenter)
        
        layout.addWidget(preview_label)
        preview_window.setLayout(layout)
        preview_window.show()

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