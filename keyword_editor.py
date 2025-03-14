from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QListWidget, QLineEdit, QPushButton
from PyQt5.QtCore import Qt, pyqtSignal

class KeywordEditor(QWidget):
    keywordsChanged = pyqtSignal(list)
    
    def __init__(self):
        super().__init__()
        self.keywords = []
        self.init_ui()
        
    def init_ui(self):
        # 主布局
        layout = QVBoxLayout()
        
        # 关键词列表
        self.keyword_list = QListWidget()
        
        # 操作区
        action_layout = QHBoxLayout()
        self.keyword_input = QLineEdit(placeholderText='输入新关键词')
        self.add_btn = QPushButton('添加')
        self.del_btn = QPushButton('删除')
        
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
        self.keywords = keywords.copy()
        self.keyword_list.clear()
        for keyword in self.keywords:
            self.keyword_list.addItem(keyword)