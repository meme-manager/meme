from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QListWidget, QLineEdit, QPushButton
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QIcon

class KeywordEditor(QWidget):
    keywordsChanged = pyqtSignal(list)
    
    def __init__(self):
        super().__init__()
        self.keywords = []
        self.init_ui()
        
    def init_ui(self):
        # 主布局
        layout = QVBoxLayout()
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(10)
        
        # 关键词列表
        self.keyword_list = QListWidget()
        self.keyword_list.setStyleSheet("""
            QListWidget {
                padding: 5px;
                border: 1px solid palette(Dark);
                border-radius: 6px;
                background-color: palette(Base);
            }
            QListWidget::item {
                padding: 8px;
                margin: 2px 0;
                border-radius: 4px;
            }
            QListWidget::item:hover {
                background-color: palette(AlternateBase);
            }
            QListWidget::item:selected {
                background-color: palette(Highlight);
                color: palette(HighlightedText);
            }
        """)
        
        # 操作区
        action_layout = QHBoxLayout()
        action_layout.setSpacing(8)
        
        self.keyword_input = QLineEdit(placeholderText='输入新关键词')
        self.keyword_input.setMinimumHeight(32)
        
        self.add_btn = QPushButton('添加')
        self.add_btn.setMinimumHeight(32)
        self.add_btn.setIcon(QIcon.fromTheme('list-add'))
        
        self.del_btn = QPushButton('删除')
        self.del_btn.setMinimumHeight(32)
        self.del_btn.setIcon(QIcon.fromTheme('list-remove'))
        
        action_layout.addWidget(self.keyword_input, stretch=3)
        action_layout.addWidget(self.add_btn, stretch=1)
        action_layout.addWidget(self.del_btn, stretch=1)
        
        # 信号连接
        self.add_btn.clicked.connect(self.add_keyword)
        self.del_btn.clicked.connect(self.delete_keyword)
        
        layout.addWidget(self.keyword_list)
        layout.addLayout(action_layout)
        self.setLayout(layout)
    
    def add_keyword(self):
        keyword = self.keyword_input.text().strip()
        if keyword and not self.keyword_list.findItems(keyword, Qt.MatchExactly):
            self.keyword_list.addItem(keyword)
            self.keywords.append(keyword)
            self.keyword_input.clear()
            self.keywordsChanged.emit(self.keywords)
    
    def delete_keyword(self):
        for item in self.keyword_list.selectedItems():
            keyword = item.text()
            self.keyword_list.takeItem(self.keyword_list.row(item))
            if keyword in self.keywords:
                self.keywords.remove(keyword)
        self.keywordsChanged.emit(self.keywords)
    
    def set_keywords(self, keywords):
        self.keywords = [keyword.word if hasattr(keyword, 'word') else keyword for keyword in keywords]
        self.keyword_list.clear()
        for keyword in self.keywords:
            self.keyword_list.addItem(keyword)