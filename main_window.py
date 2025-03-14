import sys
from PyQt5.QtWidgets import QMainWindow, QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLineEdit, QPushButton
from meme_grid import MemeGrid

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
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
        self.import_btn = QPushButton('导入表情包')
        top_bar.addWidget(self.search_input, stretch=4)
        top_bar.addWidget(self.import_btn, stretch=1)
        
        # 表情包展示区
        self.meme_grid = MemeGrid()
        self.meme_area = self.meme_grid
        
        layout.addLayout(top_bar)
        layout.addWidget(self.meme_area, stretch=1)
        main_widget.setLayout(layout)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())