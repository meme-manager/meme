from PyQt5.QtGui import QPalette, QColor
from PyQt5.QtCore import Qt

class Style:
    @staticmethod
    def get_dark_palette():
        palette = QPalette()
        palette.setColor(QPalette.Window, QColor(53, 53, 53))
        palette.setColor(QPalette.WindowText, Qt.white)
        palette.setColor(QPalette.Base, QColor(25, 25, 25))
        palette.setColor(QPalette.AlternateBase, QColor(53, 53, 53))
        palette.setColor(QPalette.ToolTipBase, Qt.white)
        palette.setColor(QPalette.ToolTipText, Qt.white)
        palette.setColor(QPalette.Text, Qt.white)
        palette.setColor(QPalette.Button, QColor(53, 53, 53))
        palette.setColor(QPalette.ButtonText, Qt.white)
        palette.setColor(QPalette.BrightText, Qt.red)
        palette.setColor(QPalette.Link, QColor(42, 130, 218))
        palette.setColor(QPalette.Highlight, QColor(42, 130, 218))
        palette.setColor(QPalette.HighlightedText, Qt.black)
        return palette

    @staticmethod
    def get_light_palette():
        palette = QPalette()
        palette.setColor(QPalette.Window, QColor(240, 240, 240))
        palette.setColor(QPalette.WindowText, Qt.black)
        palette.setColor(QPalette.Base, QColor(255, 255, 255))
        palette.setColor(QPalette.AlternateBase, QColor(245, 245, 245))
        palette.setColor(QPalette.ToolTipBase, Qt.white)
        palette.setColor(QPalette.ToolTipText, Qt.black)
        palette.setColor(QPalette.Text, Qt.black)
        palette.setColor(QPalette.Button, QColor(240, 240, 240))
        palette.setColor(QPalette.ButtonText, Qt.black)
        palette.setColor(QPalette.BrightText, Qt.red)
        palette.setColor(QPalette.Link, QColor(0, 122, 204))
        palette.setColor(QPalette.Highlight, QColor(0, 122, 204))
        palette.setColor(QPalette.HighlightedText, Qt.white)
        return palette

    @staticmethod
    def get_style_sheet(theme='light'):
        # 定义主题色变量
        primary_gradient_start = '#7AD7F0'  # 粉蓝色
        primary_gradient_end = '#C780FF'    # 紫色
        
        base_style = '''
            QWidget {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                font-size: 14px;
                min-width: 36px;
                min-height: 24px;
            }
            
            QSplitter::handle {
                background-color: #ddd;
                width: 1px;
            }
            
            QSplitter {
                margin: 0;
                padding: 0;
            }
            
            QLabel.meme-image {
                min-width: 80px;
                min-height: 80px;
                max-width: 80px;
                max-height: 80px;
                margin: 5px;
                border-radius: 4px;
                background-color: #f5f5f5;
            }
            
            QTabWidget {
                display: none;
            }
            
            QTabWidget[visible="true"] {
                display: block;
            }
            
            QTabWidget::pane {
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-top: -1px;
            }
            
            QTabBar::tab {
                padding: 8px 16px;
                margin-right: 4px;
                border: 1px solid #ddd;
                border-bottom: none;
                border-top-left-radius: 4px;
                border-top-right-radius: 4px;
                background-color: #f5f5f5;
            }
            
            QTabBar::tab:selected {
                background-color: white;
                margin-bottom: -1px;
                border-bottom: 1px solid white;
            }
            
            QPushButton {
                padding: 4px 8px;
                border-radius: 4px;
                border: none;
                background: white;
                color: #333;
                font-weight: 500;
                border: 1px solid #ddd;
                margin-right: 8px;
            }

            QPushButton#importMemeButton {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #7AD7F0, stop:1 #C780FF);
                color: white;
                border: none;
            }

            QPushButton#importLinkButton {
                background: #f0f0f0;
                color: #333;
                border: 1px solid #ddd;
            }

            QPushButton#settingsButton {
                background: white;
                color: #666;
                border: 1px solid #ddd;
                padding: 6px;
                min-width: 36px;
            }
            
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #8CDEF3, stop:1 #D196FF);
            }
            
            QPushButton:pressed {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #6AC7E3, stop:1 #B670EF);
            }
            
            QPushButton QIcon {
                width: 18px;
                height: 18px;
                margin-right: 6px;
            }

            QPushButton#importMemeButton QIcon {
                stroke: white;
                stroke-width: 2;
                fill: none;
            }

            QPushButton#importLinkButton QIcon,
            QPushButton#settingsButton QIcon {
                stroke: #666;
                stroke-width: 2;
                fill: none;
            }

            QPushButton#settingsButton QIcon {
                margin-right: 0;
            }
            
            QLineEdit {
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                background-color: white;
                color: #333;
            }
            
            QLineEdit:focus {
                border: 2px solid #7AD7F0;
                background-color: rgba(122, 215, 240, 0.05);
            }
            
            @keyframes cursor-blink {
                0%, 100% { color: #333; }
                50% { color: transparent; }
            }
            
            QLineEdit:focus {
                border: 2px solid #7AD7F0;
                background-color: rgba(122, 215, 240, 0.05);
            }
            
            QListWidget {
                border: 2px solid rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                background-color: white;
                padding: 4px;
            }
            
            QListWidget::item {
                padding: 12px;
                border-radius: 6px;
                margin: 2px 0;
                transition: all 0.2s ease-in-out;
            }
            
            QListWidget::item:hover {
                background-color: rgba(122, 215, 240, 0.1);
                transform: translateX(4px);
            }
            
            QListWidget::item:selected {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #7AD7F0, stop:1 #C780FF);
                color: white;
            }
            
            QComboBox {
                padding: 12px;
                border-radius: 6px;
                border: 2px solid rgba(0, 0, 0, 0.1);
                background-color: white;
                color: #333;
                min-width: 120px;
            }
            
            QComboBox:hover {
                border-color: #7AD7F0;
                background-color: rgba(122, 215, 240, 0.05);
            }
            
            QComboBox::drop-down {
                border: none;
                width: 30px;
            }
            
            QComboBox::down-arrow {
                width: 14px;
                height: 14px;
                image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>");
            }
            
            /* 添加涟漪动画效果 */
            QPushButton::after {
                content: '';
                position: absolute;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%);
                opacity: 0;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
            }
            
            @keyframes ripple {
                to {
                    transform: scale(2);
                    opacity: 0;
                }
            }
            
            /* Z型布局优化 */
            QMainWindow > QWidget {
                margin: 16px;
            }
            
            /* 一级功能区放大 */
            .primary-control {
                transform: scale(1.15);
            }
            
            /* 次级功能渐进展开 */
            .secondary-control {
                opacity: 0;
                transform: translateY(10px);
                animation: slideIn 0.3s ease-out forwards;
            }
            
            @keyframes slideIn {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        '''
        return base_style