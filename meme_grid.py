from PyQt5.QtWidgets import QWidget, QGridLayout, QLabel, QScrollArea, QVBoxLayout, QHBoxLayout, QSizePolicy, QPushButton
from PyQt5.QtGui import QPixmap, QMovie, QPainter, QDrag, QCursor
from PyQt5.QtCore import Qt, QUrl, QSize, QTimer, QMimeData, QPoint, pyqtSignal
from PyQt5.QtWidgets import QSplitter, QTabWidget, QFormLayout, QLineEdit, QTextEdit, QApplication
from keyword_editor import KeywordEditor
from storage import Storage
from network_utils import NetworkUtils
import os

class MemeLabel(QLabel):
    """自定义表情包标签，支持拖拽和点击事件"""
    clicked = pyqtSignal(object)  # 点击信号，传递表情包对象
    
    def __init__(self, meme, parent=None):
        super().__init__(parent)
        self.meme = meme
        self.setAlignment(Qt.AlignCenter)
        self.setMinimumSize(80, 80)
        self.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        self.setMouseTracking(True)  # 启用鼠标跟踪
        self.setCursor(Qt.PointingHandCursor)
        self.setAcceptDrops(True)  # 启用拖放
        
        # 加载表情包
        self.load_meme()
        
        # 悬浮预览
        self.preview_label = None
        
        # 选中状态
        self.is_selected = False
        self.setStyleSheet("")
        
    def set_selected(self, selected):
        """设置选中状态"""
        self.is_selected = selected
        current_style = self.styleSheet()
        print(f"[DEBUG] 当前样式表: {current_style}")
        print(f"[DEBUG] 设置选中状态: {selected}")
        
        if selected:
            # 保留现有样式，添加边框样式
            border_style = "border: 2px solid #1e90ff; border-radius: 5px;"
            if current_style:
                new_style = current_style + border_style
                print(f"[DEBUG] 合并后的样式: {new_style}")
                self.setStyleSheet(new_style)
            else:
                print(f"[DEBUG] 使用默认边框样式: {border_style}")
                self.setStyleSheet(border_style)
            self.update()
        else:
            # 移除边框样式，保留其他样式
            new_style = current_style.replace("border: 2px solid #1e90ff; border-radius: 5px;", "").strip()
            print(f"[DEBUG] 移除边框后的样式: {new_style}")
            self.setStyleSheet(new_style)
            self.update()
        
    def load_meme(self):
        """加载表情包图像"""
        if self.meme.type == 'animated':
            self.movie = QMovie(self.meme.path)
            self.movie.setCacheMode(QMovie.CacheAll)
            self.movie.setScaledSize(self.size())
            self.setMovie(self.movie)
            self.movie.start()
        else:
            self.pixmap = QPixmap(self.meme.path)
            self.setPixmap(self.pixmap.scaled(
                self.size(),
                Qt.KeepAspectRatio,
                Qt.SmoothTransformation
            ))
    
    def resizeEvent(self, event):
        """处理大小变化事件"""
        size = min(event.size().width(), event.size().height())
        self.setFixedSize(size, size)  # 保持正方形
        
        # 更新图像大小
        if hasattr(self, 'movie') and self.movie and not callable(self.movie):
            self.movie.setScaledSize(QSize(size, size))
        elif hasattr(self, 'pixmap') and not self.pixmap.isNull():
            self.setPixmap(self.pixmap.scaled(
                size, size,
                Qt.KeepAspectRatio,
                Qt.SmoothTransformation
            ))
        
        super().resizeEvent(event)
    
    def mousePressEvent(self, event):
        """处理鼠标按下事件"""
        if event.button() == Qt.LeftButton:
            print(f"[DEBUG] 鼠标左键按下事件触发")
            print(f"[DEBUG] 当前选中状态: {self.is_selected}")
            self.drag_start_position = event.pos()
            # 先设置选中状态
            self.set_selected(True)
            # 发送点击信号
            self.clicked.emit(self.meme)
    
    def mouseMoveEvent(self, event):
        """处理鼠标移动事件"""
        # 创建悬浮预览
        if not self.preview_label and not hasattr(self, 'dragging'):
            self.create_preview()
        
        # 处理拖拽
        if hasattr(self, 'drag_start_position') and (event.buttons() & Qt.LeftButton) and \
           (event.pos() - self.drag_start_position).manhattanLength() > QApplication.startDragDistance():
            self.start_drag()
    
    def create_preview(self):
        """创建悬浮预览"""
        self.preview_label = QLabel(self.parent())
        self.preview_label.setWindowFlags(Qt.ToolTip)
        self.preview_label.setAlignment(Qt.AlignCenter)
        self.preview_label.setFixedSize(200, 200)
        
        # 加载预览图像
        if self.meme.type == 'animated':
            movie = QMovie(self.meme.path)
            movie.setCacheMode(QMovie.CacheAll)
            movie.setScaledSize(QSize(200, 200))
            self.preview_label.setMovie(movie)
            movie.start()
        else:
            pixmap = QPixmap(self.meme.path)
            self.preview_label.setPixmap(pixmap.scaled(
                200, 200,
                Qt.KeepAspectRatio,
                Qt.SmoothTransformation
            ))
        
        # 显示预览
        global_pos = self.mapToGlobal(QPoint(0, -210))  # 在表情包上方显示
        self.preview_label.move(global_pos)
        self.preview_label.show()
    
    def update_keywords(self, keywords):
        """更新表情包关键词"""
        # 这个方法应该由MemeGrid类调用，MemeLabel不应该直接更新数据库
        # 发送信号通知MemeGrid更新关键词
        self.clicked.emit(self.meme)
    
    def copy_to_clipboard(self):
        """复制表情包到剪贴板"""
        clipboard = QApplication.instance().clipboard()
        
        # 创建MIME数据
        mime_data = QMimeData()
        
        # 设置图像数据
        if self.meme.type == 'animated' and hasattr(self, 'movie') and self.movie:
            # 对于GIF，使用当前帧
            pixmap = self.movie.currentPixmap()
        elif hasattr(self, 'pixmap') and not self.pixmap.isNull():
            pixmap = self.pixmap
        else:
            # 如果没有加载的图像，重新从文件加载
            pixmap = QPixmap(self.meme.path)
        
        # 设置MIME数据
        mime_data.setImageData(pixmap)
        mime_data.setUrls([QUrl.fromLocalFile(self.meme.path)])
        
        # 设置到剪贴板
        clipboard.setMimeData(mime_data)
    
    def leaveEvent(self, event):
        """处理鼠标离开事件"""
        # 关闭预览
        if self.preview_label:
            self.preview_label.close()
            self.preview_label = None
    
    def start_drag(self):
        """开始拖拽操作"""
        self.dragging = True
        
        # 关闭预览
        if self.preview_label:
            self.preview_label.close()
            self.preview_label = None
        
        # 创建拖拽对象
        drag = QDrag(self)
        mime_data = QMimeData()
        
        # 设置图像数据
        if self.meme.type == 'animated' and hasattr(self, 'movie') and self.movie:
            # 对于GIF，使用当前帧
            current_pixmap = self.movie.currentPixmap()
        else:
            current_pixmap = self.pixmap
        
        # 设置拖拽图像
        drag.setPixmap(current_pixmap.scaled(
            64, 64,
            Qt.KeepAspectRatio,
            Qt.SmoothTransformation
        ))
        drag.setHotSpot(QPoint(32, 32))  # 设置热点为图像中心
        
        # 设置MIME数据
        mime_data.setUrls([QUrl.fromLocalFile(self.meme.path)])
        mime_data.setImageData(current_pixmap)
        drag.setMimeData(mime_data)
        
        # 执行拖拽
        drag.exec_(Qt.CopyAction)
        self.dragging = False

class MemeGrid(QWidget):
    """表情包网格视图"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.storage = Storage()
        self.init_ui()
    
    def showEvent(self, event):
        super().showEvent(event)
        self.load_memes()
    
    def init_ui(self):
        """初始化UI"""
        # 主布局
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(10, 10, 10, 10)
        
        # 创建滚动区域
        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        
        # 创建网格容器
        self.grid_container = QWidget()
        # 设置浅灰色背景
        self.grid_container.setStyleSheet("background-color: #f0f0f0; border-radius: 8px;")
        # 设置网格容器的大小策略
        self.grid_container.setSizePolicy(QSizePolicy.MinimumExpanding, QSizePolicy.MinimumExpanding)
        self.grid_layout = QGridLayout(self.grid_container)
        self.grid_layout.setSpacing(30)  # 设置表情之间的间距为30px
        self.grid_layout.setAlignment(Qt.AlignTop | Qt.AlignHCenter)  # 设置网格顶部对齐和水平居中
        self.grid_layout.setContentsMargins(15, 15, 15, 15)  # 设置网格边距
        
        # 设置滚动区域内容
        self.scroll_area.setWidget(self.grid_container)
        
        # 添加到主布局
        main_layout.addWidget(self.scroll_area)
        
        # 创建悬浮详情弹窗
        self.detail_dialog = None
        
        # 监听窗口大小变化
        self.timer = QTimer()
        self.timer.setSingleShot(True)
        self.timer.timeout.connect(self.adjust_grid)
        
    def resizeEvent(self, event):
        """处理窗口大小变化事件"""
        # 使用定时器延迟调整，避免频繁调整
        self.timer.start(100)
        super().resizeEvent(event)
    
    def calculate_grid_layout(self):
        """计算网格布局参数"""
        grid_width = self.grid_container.width()
        min_spacing = 30  # 最小间距为30px
        min_item_size = 80  # 最小表情包尺寸
        max_item_size = 150  # 最大表情包尺寸
        
        # 动态计算每行可以显示的表情包数量，确保间距至少为30px
        # 公式: cols = (grid_width + min_spacing) / (min_item_size + min_spacing)
        cols = max(1, int((grid_width + min_spacing) / (min_item_size + min_spacing)))
        
        # 根据列数计算表情包大小，确保间距为30px
        available_width = grid_width - (cols-1) * min_spacing
        # 确保表情包大小不超过可用宽度的1/cols，同时不小于最小尺寸，不大于最大尺寸
        item_width = min(max_item_size, max(min_item_size, min(available_width // cols, grid_width // cols)))
        
        return cols, item_width, min_spacing
    
    def adjust_grid(self):
        """调整网格布局，确保表情包之间始终保持30px的间距"""
        _, item_width, _ = self.calculate_grid_layout()
        
        # 更新所有表情包标签的大小
        for i in range(self.grid_layout.count()):
            item = self.grid_layout.itemAt(i)
            if item and item.widget():
                item.widget().setFixedSize(item_width, item_width)
    
    def load_memes(self):
        """加载所有表情包"""
        # 清空网格
        self.clear_grid()
        
        # 获取所有表情包
        from models import Meme
        memes = self.storage.session.query(Meme).all()
        self.display_memes(memes)

    
    def update_search_results(self, keyword):
        """更新搜索结果"""
        # 清空网格
        self.clear_grid()
        
        # 搜索表情包
        if keyword.strip():
            memes = self.storage.search_by_keyword(keyword)
        else:
            from models import Meme
            memes = self.storage.session.query(Meme).all()
        
        # 显示结果
        self.display_memes(memes)
    
    def display_memes(self, memes):
        """在网格中显示表情包"""
        # 计算布局参数
        cols, item_width, min_spacing = self.calculate_grid_layout()
        
        # 清除现有的表情包
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        # 添加表情包到网格
        for i, meme in enumerate(memes):
            row = i // cols
            col = i % cols
            
            # 创建表情包标签
            meme_label = MemeLabel(meme)
            meme_label.setFixedSize(item_width, item_width)
            meme_label.clicked.connect(self.show_meme_detail)
            
            # 添加到网格
            self.grid_layout.addWidget(meme_label, row, col, Qt.AlignCenter)
        
        # 更新网格容器的最小大小
        total_rows = (len(memes) + cols - 1) // cols
        min_height = total_rows * (item_width + min_spacing) + min_spacing
        self.grid_container.setMinimumHeight(min_height)
    
    def clear_grid(self):
        """清空网格"""
        # 移除所有表情包标签
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
    
    def show_meme_detail(self, meme):
        """显示表情包详情"""
        # 清除其他表情包的选中状态
        for i in range(self.grid_layout.count()):
            item = self.grid_layout.itemAt(i)
            if item and item.widget():
                # 跳过当前被点击的表情包
                if item.widget().meme != meme and item.widget().is_selected:
                    item.widget().set_selected(False)
                
        if not hasattr(self, 'detail_dialog') or not self.detail_dialog:
            # 创建详情面板
            self._create_detail_dialog()
        
        # 更新预览
        if meme.type == 'animated':
            movie = QMovie(meme.path)
            movie.setCacheMode(QMovie.CacheAll)
            self.preview_label.setMovie(movie)
            movie.start()
        else:
            pixmap = QPixmap(meme.path)
            self.preview_label.setPixmap(pixmap.scaled(
                self.preview_label.size(),
                Qt.KeepAspectRatio,
                Qt.SmoothTransformation
            ))
        
        # 更新信息
        self.path_label.setText(meme.path)
        self.type_label.setText(meme.type)
        
        # 更新关键词
        self.keyword_editor.set_keywords(meme.keywords)
        
        # 更新复制按钮的回调函数
        self.copy_button.clicked.disconnect()
        self.copy_button.clicked.connect(lambda: self.copy_to_clipboard(meme))
        
        # 显示弹窗
        self.detail_dialog.show()
    
    def _create_detail_dialog(self):
        self.detail_dialog = QWidget()
        self.detail_dialog.setWindowFlags(Qt.Tool | Qt.FramelessWindowHint)
        self.detail_dialog.setAttribute(Qt.WA_TranslucentBackground)
        self.detail_dialog.setStyleSheet("""
            QWidget {
                background-color: white;
            }
            QDialog, QWidget#content_widget {
                background-color: white;
                border: 1px solid #ccc;
                border-radius: 5px;
            }
            QPushButton#closeButton {
                background-color: transparent;
                border: none;
                color: #666;
                font-size: 16px;
                padding: 5px;
            }
            QPushButton#closeButton:hover {
                color: #f00;
            }
            QWidget#content_widget {
                background-color: white;
            }
        """)
        
        # 创建标题栏
        title_bar = QWidget()
        title_bar.setObjectName("titleBar")
        title_bar.setStyleSheet("QWidget#titleBar { background-color: #f5f5f5; border-radius: 5px 5px 0 0; }")
        title_bar.setCursor(Qt.SizeAllCursor)
        title_layout = QHBoxLayout(title_bar)
        title_layout.setContentsMargins(10, 5, 10, 5)
        title_label = QLabel("表情包详情")
        title_layout.addWidget(title_label)
        title_layout.addStretch()
        close_button = QPushButton("×", self.detail_dialog)
        close_button.setObjectName("closeButton")
        close_button.clicked.connect(self.detail_dialog.close)
        title_layout.addWidget(close_button)
        
        # 添加拖拽功能
        def mousePressEvent(event):
            if event.button() == Qt.LeftButton:
                self.detail_dialog.drag_position = event.globalPos() - self.detail_dialog.frameGeometry().topLeft()
                event.accept()
        
        def mouseMoveEvent(event):
            if event.buttons() & Qt.LeftButton:
                self.detail_dialog.move(event.globalPos() - self.detail_dialog.drag_position)
                event.accept()
        
        title_bar.mousePressEvent = mousePressEvent
        title_bar.mouseMoveEvent = mouseMoveEvent
        
        # 主布局
        main_layout = QVBoxLayout(self.detail_dialog)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        main_layout.addWidget(title_bar)
        
        # 内容布局
        content_widget = QWidget()
        content_widget.setObjectName("content_widget")
        content_layout = QHBoxLayout(content_widget)  # 改为水平布局
        content_layout.setContentsMargins(20, 20, 20, 20)
        content_layout.setSpacing(20)
        main_layout.addWidget(content_widget)
        
        # 获取主窗口位置和大小
        main_window = self.window()
        main_geo = main_window.geometry()
        # 将弹窗固定在主窗口右侧
        dialog_x = main_geo.x() + main_geo.width()
        dialog_y = main_geo.y()
        self.detail_dialog.move(dialog_x, dialog_y)
        # 设置弹窗大小
        self.detail_dialog.setFixedWidth(700)  # 增加宽度以适应左右布局
        self.detail_dialog.setFixedHeight(main_geo.height())
        
        # 创建主内容布局
        main_content = QWidget()
        main_content_layout = QVBoxLayout(main_content)
        main_content_layout.setSpacing(20)
        
        # 上部：预览图和信息区域
        top_container = QWidget()
        top_layout = QHBoxLayout(top_container)
        top_layout.setSpacing(20)
        
        # 预览图
        preview_label = QLabel()
        preview_label.setAlignment(Qt.AlignCenter)
        preview_label.setFixedSize(100, 100)  # 调整预览尺寸
        preview_label.setStyleSheet("background-color: #f8f8f8; border: 1px solid #ddd; border-radius: 4px;")
        top_layout.addWidget(preview_label)
        
        # 信息区域
        info_container = QWidget()
        info_layout = QFormLayout(info_container)
        info_layout.setSpacing(10)
        info_layout.setContentsMargins(0, 0, 0, 0)
        
        path_label = QLineEdit()
        path_label.setReadOnly(True)
        path_label.setStyleSheet("background-color: #f8f8f8; border-radius: 4px; padding: 5px;")
        type_label = QLineEdit()
        type_label.setReadOnly(True)
        type_label.setStyleSheet("background-color: #f8f8f8; border-radius: 4px; padding: 5px;")
        
        info_layout.addRow("路径:", path_label)
        info_layout.addRow("类型:", type_label)
        top_layout.addWidget(info_container, 1)
        
        # 关键词编辑器
        keyword_editor = KeywordEditor()
        keyword_editor.setMinimumHeight(150)
        keyword_editor.setStyleSheet("border: 1px solid #ddd; border-radius: 4px;")
        keyword_editor.keywordsChanged.connect(self.update_keywords)
        
        # 按钮区域
        button_container = QWidget()
        button_layout = QHBoxLayout(button_container)
        button_layout.setSpacing(10)
        
        copy_button = QPushButton("复制到剪贴板")
        copy_button.setMinimumWidth(120)
        copy_button.setMinimumHeight(32)
        copy_button.setStyleSheet("""
            QPushButton {
                background-color: #007AFF;
                color: white;
                border-radius: 4px;
                padding: 5px 15px;
            }
            QPushButton:hover {
                background-color: #0056b3;
            }
        """)
        copy_button.clicked.connect(lambda: self.copy_to_clipboard(meme))
        
        close_button = QPushButton("关闭")
        close_button.setMinimumWidth(120)
        close_button.setMinimumHeight(32)
        close_button.setStyleSheet("""
            QPushButton {
                background-color: #FF3B30;
                color: white;
                border-radius: 4px;
                padding: 5px 15px;
            }
            QPushButton:hover {
                background-color: #d63028;
            }
        """)
        close_button.clicked.connect(self.detail_dialog.close)
        
        button_layout.addWidget(copy_button)
        button_layout.addWidget(close_button)
        button_layout.addStretch()
        
        # 组装主布局
        main_content_layout.addWidget(top_container)
        main_content_layout.addWidget(keyword_editor)
        main_content_layout.addWidget(button_container)
        main_content_layout.addStretch()
        
        # 添加到内容布局
        content_layout.addWidget(main_content)
        
        # 保存引用以便后续使用
        self.preview_label = preview_label
        self.path_label = path_label
        self.type_label = type_label
        self.keyword_editor = keyword_editor
        self.copy_button = copy_button
    
    def update_keywords(self, keywords):
        """更新表情包关键词"""
        if hasattr(self, 'current_meme'):
            # 更新数据库中的关键词
            self.storage.update_keywords(self.current_meme.id, keywords)
            # 更新当前表情包对象的关键词
            self.current_meme.keywords = keywords
    
    def copy_to_clipboard(self, meme):
        """复制表情包到剪贴板"""
        clipboard = QApplication.instance().clipboard()
        
        # 创建MIME数据
        mime_data = QMimeData()
        
        # 设置图像数据
        if meme.type == 'animated':
            # 对于GIF，使用当前帧
            if hasattr(self, 'preview_label') and self.preview_label.movie():
                pixmap = self.preview_label.movie().currentPixmap()
            else:
                # 如果没有加载的动画，创建一个临时的
                movie = QMovie(meme.path)
                movie.start()
                pixmap = movie.currentPixmap()
        else:
            # 静态图像直接加载
            pixmap = QPixmap(meme.path)
        
        # 设置MIME数据
        mime_data.setImageData(pixmap)
        mime_data.setUrls([QUrl.fromLocalFile(meme.path)])
        
        # 设置到剪贴板
        clipboard.setMimeData(mime_data)
   