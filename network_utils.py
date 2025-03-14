import os
import requests
from urllib.parse import urlparse
from typing import Optional, Tuple

class NetworkUtils:
    @staticmethod
    def download_image(url: str, save_dir: str) -> Optional[str]:
        """从网络下载图片并保存到指定目录
        
        Args:
            url: 图片URL
            save_dir: 保存目录
            
        Returns:
            str: 保存的文件路径，如果下载失败则返回None
        """
        try:
            # 解析URL获取文件名
            parsed_url = urlparse(url)
            file_name = os.path.basename(parsed_url.path)
            
            # 如果URL中没有文件名，使用时间戳作为文件名
            if not file_name or '.' not in file_name:
                from datetime import datetime
                file_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}.jpg"
            
            # 下载图片
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            # 验证内容类型
            content_type = response.headers.get('content-type', '')
            if not content_type.startswith('image/'):
                return None
                
            # 保存图片
            save_path = os.path.join(save_dir, file_name)
            with open(save_path, 'wb') as f:
                f.write(response.content)
                
            return save_path
        except Exception as e:
            print(f"下载图片失败: {str(e)}")
            return None
    
    @staticmethod
    def is_valid_image_url(url: str) -> bool:
        """验证URL是否为有效的图片链接
        
        Args:
            url: 要验证的URL
            
        Returns:
            bool: URL是否有效
        """
        try:
            parsed = urlparse(url)
            if not all([parsed.scheme, parsed.netloc]):
                return False
                
            # 检查文件扩展名
            file_name = os.path.basename(parsed.path)
            if file_name:
                ext = os.path.splitext(file_name)[1].lower()
                valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
                if ext in valid_extensions:
                    return True
                    
            # 如果没有文件扩展名，尝试请求头部信息
            response = requests.head(url, timeout=5)
            content_type = response.headers.get('content-type', '')
            return content_type.startswith('image/')
        except:
            return False