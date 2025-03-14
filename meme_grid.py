from PyQt5.QtWidgets import QWidget, QGridLayout, QLabel, QScrollArea, QVBoxLayout, QHBoxLayout
from PyQt5.QtGui import QPixmap, QMovie
from PyQt5.QtCore import Qt, QUrl, QSize
from PyQt5.QtWidgets import QSplitter, QTabWidget, QFormLayout, QLineEdit, QTextEdit
from keyword_editor import KeywordEditor
from storage import Storage
from network_utils import NetworkUtils
import os

class MemeGrid(QWidget):
    def __init__(self):
        super().__init__()
        self.storage = Storage()
        self.current_meme = None
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
        
        # 加载已有表情包
        self.load_memes()
        
        scroll.setWidget(content_widget)
        # 右侧详情面板
        detail_panel = QWidget()
        tab_widget = QTabWidget()
        
        # 基本信息标签页
        basic_info = QWidget()
        form_layout = QFormLayout()
        self.file_name_input = QLineEdit()
        self.file_name_input.setReadOnly(True)
        self.create_time_input = QLineEdit()
        self.create_time_input.setReadOnly(True)
        form_layout.addRow('文件名:', self.file_name_input)
        form_layout.addRow('添加时间:', self.create_time_input)
        basic_info.setLayout(form_layout)
        
        # 关键词编辑标签页
        self.keyword_editor = KeywordEditor()
        self.keyword_editor.keywordsChanged.connect(self.update_meme_keywords)
        
        tab_widget.addTab(basic_info, '基本信息')
        tab_widget.addTab(self.keyword_editor, '关键词')
        
        detail_panel.setLayout(QVBoxLayout())
        detail_panel.layout().addWidget(tab_widget)
        
        # 将左右两部分加入分割器
        splitter.addWidget(scroll)
        splitter.addWidget(detail_panel)
        
        self.main_layout = QVBoxLayout()
        self.main_layout.addWidget(splitter)
        self.setLayout(self.main_layout)
        
        # 启用拖拽支持
        self.setAcceptDrops(True)
        
    def dragEnterEvent(self, event):
        mime_data = event.mimeData()
        if mime_data.hasUrls() or mime_data.hasText() or mime_data.hasImage():
            event.acceptProposedAction()

    def dropEvent(self, event):
        mime_data = event.mimeData()
        
        # 处理URL列表
        if mime_data.hasUrls():
            for url in mime_data.urls():
                if url.isLocalFile():
                    file_path = url.toLocalFile()
                    if self.is_valid_image(file_path):
                        meme = self.storage.import_meme(file_path)
                        if meme:
                            self.add_meme_to_grid(meme)
                else:
                    url_str = url.toString()
                    if NetworkUtils.is_valid_image_url(url_str):
                        meme = self.storage.import_meme(url_str, source_type='url')
                        if meme:
                            self.add_meme_to_grid(meme)
        
        # 处理文本中的URL
        elif mime_data.hasText():
            text = mime_data.text()
            if NetworkUtils.is_valid_image_url(text):
                meme = self.storage.import_meme(text, source_type='url')
                if meme:
                    self.add_meme_to_grid(meme)
        
        # 处理剪贴板图片
        elif mime_data.hasImage():
            image = mime_data.imageData()
            if image:
                # 保存临时文件
                temp_path = os.path.join(self.storage.storage_dir, 'temp.png')
                image.save(temp_path, 'PNG')
                meme = self.storage.import_meme(temp_path)
                if meme:
                    self.add_meme_to_grid(meme)
                os.remove(temp_path)
    
    def is_valid_image(self, file_path):
        valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
        return any(file_path.lower().endswith(ext) for ext in valid_extensions)
    
    def add_meme_to_grid(self, meme):
        # 计算新项目的位置
        total_items = self.grid.count()
        max_columns = 4
        row = total_items // max_columns
        col = total_items % max_columns
        
        # 创建缩略图
        thumbnail = QLabel()
        thumbnail.setFixedSize(150, 150)
        
        # 根据图片类型选择不同的显示方式
        if meme.type == 'animated':
            movie = QMovie(meme.path)
            movie.setScaledSize(QSize(150, 150))
            thumbnail.setMovie(movie)
            movie.start()
            # 保存movie引用防止被垃圾回收
            thumbnail.movie = movie
        else:
            pixmap = QPixmap(meme.path)
            scaled_pixmap = pixmap.scaled(150, 150, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            thumbnail.setPixmap(scaled_pixmap)
            
        thumbnail.setAlignment(Qt.AlignCenter)
        thumbnail.mousePressEvent = lambda e: self.show_preview(meme)
        
        # 添加到网格
        self.grid.addWidget(thumbnail, row, col)
        
    def update_meme_keywords(self, keywords):
        if self.current_meme:
            # 清除原有关键词
            self.current_meme.keywords.clear()
            
            # 添加新关键词
            for word in keywords:
                keyword = self.storage.add_keyword(word)
                self.storage.link_meme_keyword(self.current_meme.id, keyword.id)
    
    def show_preview(self, meme):
        self.current_meme = meme
        
        # 更新基本信息
        self.file_name_input.setText(os.path.basename(meme.path))
        self.create_time_input.setText(meme.create_time.strftime('%Y-%m-%d %H:%M:%S'))
        
        # 更新关键词
        keywords = self.storage.get_meme_keywords(meme.id)
        self.keyword_editor.set_keywords([k.word for k in keywords])
        
        # 显示预览窗口
        preview_window = QWidget()
        preview_window.setWindowTitle('预览')
        preview_window.setGeometry(100, 100, 800, 600)
        
        layout = QVBoxLayout()
        preview_label = QLabel()
        
        # 根据图片类型选择不同的预览方式
        if meme.type == 'animated':
            movie = QMovie(meme.path)
            movie.setScaledSize(QPixmap(meme.path).scaled(780, 580, Qt.KeepAspectRatio, Qt.SmoothTransformation).size())
            preview_label.setMovie(movie)
            movie.start()
            # 保存movie引用防止被垃圾回收
            preview_label.movie = movie
        else:
            pixmap = QPixmap(meme.path)
            preview_label.setPixmap(pixmap.scaled(780, 580, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        
        preview_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(preview_label)
        preview_window.setLayout(layout)
        preview_window.show()

    def load_memes(self):
        """加载所有表情包"""
        self.clear_grid()
        memes = self.storage.get_all_memes()
        for meme in memes:
            self.add_meme_to_grid(meme)
            
    def clear_grid(self):
        """清空网格布局"""
        while self.grid.count():
            item = self.grid.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
                
    def update_search_results(self, keyword):
        """更新搜索结果"""
        self.clear_grid()
        if not keyword:
            self.load_memes()
            return
            
        # 搜索表情包
        memes = self.storage.search_by_keyword(keyword)
        for meme in memes:
            self.add_meme_to_grid(meme)