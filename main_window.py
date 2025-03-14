import sys
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLineEdit, QPushButton
from meme_grid import MemeGrid
from settings import Settings, SettingsDialog

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.settings = Settings()
        self.init_ui()
        
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
        self.settings_btn = QPushButton('设置')
        self.settings_btn.clicked.connect(self.show_settings)
        top_bar.addWidget(self.search_input, stretch=4)
        top_bar.addWidget(self.import_btn, stretch=1)
        top_bar.addWidget(self.settings_btn, stretch=1)
        
        # 表情包展示区
        self.meme_grid = MemeGrid()
        self.meme_area = self.meme_grid
        
        layout.addLayout(top_bar)
        layout.addWidget(self.meme_area, stretch=1)
        main_widget.setLayout(layout)
        
    def on_search(self, text):
        """处理搜索输入变化"""
        # 更新表情包网格显示
        self.meme_grid.update_search_results(text)
    
    def show_settings(self):
        """显示设置对话框"""
        dialog = SettingsDialog(self.settings)
        if dialog.exec_():
            # 如果用户点击了保存，可以在这里处理设置变更
            pass

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())