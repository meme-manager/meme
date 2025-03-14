import os
import sys
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLineEdit, QPushButton, QFileDialog, QInputDialog, QMessageBox, QShortcut
from meme_grid import MemeGrid
from settings import Settings, SettingsDialog
from PyQt5.QtCore import QTimer, Qt
from PyQt5.QtGui import QKeySequence
from network_utils import NetworkUtils

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.settings = Settings()
        self.search_timer = QTimer()
        self.search_timer.setSingleShot(True)
        self.search_timer.timeout.connect(self.perform_search)
        self.init_ui()
        
        # 添加剪贴板粘贴快捷键
        self.shortcut = QShortcut(QKeySequence("Ctrl+V"), self)
        self.shortcut.activated.connect(self.handle_clipboard_change)
        QApplication.instance().clipboard().dataChanged.connect(self.handle_clipboard_change)
        
    def init_ui(self):
        self.setWindowTitle('表情包管理工具')
        self.setGeometry(300, 300, 800, 600)
        
        # 主布局
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QVBoxLayout()
        
        # 顶部操作栏
        top_bar = QHBoxLayout()
        self.search_input = QLineEdit(placeholderText='输入关键词搜索')
        self.search_input.textChanged.connect(self.on_search)
        self.import_btn = QPushButton('导入表情包')
        self.import_btn.clicked.connect(self.import_memes)
        self.import_url_btn = QPushButton('导入链接')
        self.import_url_btn.clicked.connect(self.import_from_url)
        self.settings_btn = QPushButton('设置')
        self.settings_btn.clicked.connect(self.show_settings)
        top_bar.addWidget(self.search_input, stretch=4)
        top_bar.addWidget(self.import_btn, stretch=1)
        top_bar.addWidget(self.import_url_btn, stretch=1)
        top_bar.addWidget(self.settings_btn, stretch=1)
        
        # 表情包展示区
        self.meme_grid = MemeGrid()
        self.meme_area = self.meme_grid
        
        layout.addLayout(top_bar)
        layout.addWidget(self.meme_area, stretch=1)
        main_widget.setLayout(layout)
        
    def on_search(self, text):
        """处理搜索输入变化，使用定时器实现防抖"""
        self.search_timer.stop()
        self.search_timer.start(300)  # 300ms 防抖延迟
        
    def perform_search(self):
        """实际执行搜索操作"""
        self.meme_grid.update_search_results(self.search_input.text())
    
    def import_memes(self):
        """处理导入表情包按钮点击事件"""
        files, _ = QFileDialog.getOpenFileNames(
            self,
            "选择表情包文件",
            "",
            "图片文件 (*.jpg *.jpeg *.png *.gif *.bmp)"
        )
        if files:
            for file_path in files:
                self.meme_grid.storage.import_meme(file_path)
            self.meme_grid.load_memes()
    
    def show_settings(self):
        """显示设置对话框"""
        dialog = SettingsDialog(self.settings)
        if dialog.exec_():
            # 应用设置变更
            self.meme_grid.load_memes()
            
    def import_from_url(self):
        """从URL导入表情包"""
        url, ok = QInputDialog.getText(
            self,
            '导入链接',
            '请输入图片链接：',
            QLineEdit.Normal
        )
        if ok and url:
            if not NetworkUtils.is_valid_image_url(url):
                QMessageBox.warning(self, '错误', '无效的图片链接')
                return
            meme = self.meme_grid.storage.import_meme(url, source_type='url')
            if meme:
                self.meme_grid.load_memes()
            else:
                QMessageBox.warning(self, '错误', '导入失败，请检查链接是否有效')
                
    def handle_clipboard_change(self):
        """处理剪贴板内容变化"""
        clipboard = QApplication.instance().clipboard()
        mime_data = clipboard.mimeData()
        
        if mime_data.hasImage():
            image = mime_data.imageData()
            if image:
                # 保存临时文件并导入
                temp_path = os.path.join(self.meme_grid.storage.storage_dir, 'temp.png')
                image.save(temp_path, 'PNG')
                meme = self.meme_grid.storage.import_meme(temp_path)
                if meme:
                    self.meme_grid.load_memes()
                os.remove(temp_path)
                QMessageBox.information(self, '成功', '已成功从剪贴板导入图片')
            else:
                QMessageBox.warning(self, '错误', '剪贴板中的图片数据无效')


if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())