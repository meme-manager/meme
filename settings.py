from PyQt5.QtWidgets import QDialog, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, QLineEdit, QComboBox, QFileDialog
from PyQt5.QtCore import QSettings
import os

class Settings:
    def __init__(self):
        self.settings = QSettings('MemeManager', 'Settings')
        self.init_default_settings()
    
    def init_default_settings(self):
        if not self.settings.contains('storage_path'):
            default_path = os.path.join(os.path.expanduser('~'), 'Documents', 'MemeManager')
            self.settings.setValue('storage_path', default_path)
        
        if not self.settings.contains('theme'):
            self.settings.setValue('theme', 'light')
    
    def get_storage_path(self):
        return self.settings.value('storage_path')
    
    def set_storage_path(self, path):
        self.settings.setValue('storage_path', path)
    
    def get_theme(self):
        return self.settings.value('theme')
    
    def set_theme(self, theme):
        self.settings.setValue('theme', theme)

class SettingsDialog(QDialog):
    def __init__(self, settings):
        super().__init__()
        self.settings = settings
        self.init_ui()
    
    def init_ui(self):
        self.setWindowTitle('设置')
        self.setGeometry(300, 300, 400, 200)
        
        layout = QVBoxLayout()
        
        # 存储路径设置
        storage_layout = QHBoxLayout()
        storage_label = QLabel('存储路径：')
        self.storage_path = QLineEdit(self.settings.get_storage_path())
        self.storage_path.setReadOnly(True)
        browse_btn = QPushButton('浏览')
        browse_btn.clicked.connect(self.browse_storage_path)
        
        storage_layout.addWidget(storage_label)
        storage_layout.addWidget(self.storage_path)
        storage_layout.addWidget(browse_btn)
        
        # 主题设置
        theme_layout = QHBoxLayout()
        theme_label = QLabel('界面主题：')
        self.theme_combo = QComboBox()
        self.theme_combo.addItems(['light', 'dark'])
        self.theme_combo.setCurrentText(self.settings.get_theme())
        
        theme_layout.addWidget(theme_label)
        theme_layout.addWidget(self.theme_combo)
        
        # 按钮
        btn_layout = QHBoxLayout()
        save_btn = QPushButton('保存')
        cancel_btn = QPushButton('取消')
        
        save_btn.clicked.connect(self.save_settings)
        cancel_btn.clicked.connect(self.reject)
        
        btn_layout.addWidget(save_btn)
        btn_layout.addWidget(cancel_btn)
        
        layout.addLayout(storage_layout)
        layout.addLayout(theme_layout)
        layout.addLayout(btn_layout)
        
        self.setLayout(layout)
    
    def browse_storage_path(self):
        path = QFileDialog.getExistingDirectory(
            self,
            '选择存储路径',
            self.storage_path.text()
        )
        if path:
            self.storage_path.setText(path)
    
    def save_settings(self):
        self.settings.set_storage_path(self.storage_path.text())
        self.settings.set_theme(self.theme_combo.currentText())
        self.accept()