import os
import shutil
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Meme, Keyword
from network_utils import NetworkUtils

class Storage:
    def __init__(self, db_path='memes.db', storage_dir='resources'):
        self.storage_dir = storage_dir
        if not os.path.exists(storage_dir):
            os.makedirs(storage_dir)
            
        self.engine = create_engine(f'sqlite:///{db_path}')
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
    
    def import_meme(self, source, source_type='file'):
        """导入表情包文件到存储目录并创建数据库记录
        
        Args:
            source: 文件路径或URL
            source_type: 'file'表示本地文件，'url'表示网络图片
        """
        # 获取文件扩展名
        if source_type == 'url':
            if not NetworkUtils.is_valid_image_url(source):
                return None
            file_path = NetworkUtils.download_image(source, self.storage_dir)
            if not file_path:
                return None
            file_ext = os.path.splitext(source)[1]
            if not file_ext:  # 如果URL中没有扩展名，尝试从下载的文件中获取
                file_ext = os.path.splitext(file_path)[1]
            new_path = file_path
        else:
            # 生成唯一文件名
            file_ext = os.path.splitext(source)[1]
            new_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}{file_ext}"
            new_path = os.path.join(self.storage_dir, new_filename)
            
            # 复制文件到存储目录
            shutil.copy2(source, new_path)
        
        # 创建数据库记录
        meme = Meme(
            path=new_path,
            source=source,
            type='static' if file_ext.lower() not in ['.gif'] else 'animated'
        )
        self.session.add(meme)
        self.session.commit()
        return meme
    
    def add_keyword(self, word):
        """添加关键词"""
        keyword = self.session.query(Keyword).filter_by(word=word).first()
        if not keyword:
            keyword = Keyword(word=word)
            self.session.add(keyword)
            self.session.commit()
        return keyword
    
    def link_meme_keyword(self, meme_id, keyword_id):
        """关联表情包和关键词"""
        meme = self.session.query(Meme).get(meme_id)
        keyword = self.session.query(Keyword).get(keyword_id)
        if meme and keyword:
            meme.keywords.append(keyword)
            self.session.commit()
    
    def search_by_keyword(self, word):
        """根据关键词搜索表情包，支持模糊匹配
        
        Args:
            word: 搜索关键词
        Returns:
            按相关度排序的表情包列表
        """
        if not word:
            return []
            
        # 模糊匹配关键词
        keywords = self.session.query(Keyword).filter(
            Keyword.word.like(f'%{word}%')
        ).all()
        
        # 收集所有匹配的表情包
        meme_scores = {}
        for keyword in keywords:
            for meme in keyword.memes:
                if meme.id not in meme_scores:
                    meme_scores[meme.id] = {
                        'meme': meme,
                        'score': 0,
                        'matched_keywords': []
                    }
                # 计算相关度分数
                similarity = len(word) / len(keyword.word) if len(keyword.word) >= len(word) else len(keyword.word) / len(word)
                meme_scores[meme.id]['score'] += similarity
                meme_scores[meme.id]['matched_keywords'].append(keyword.word)
        
        # 按相关度分数排序
        sorted_memes = sorted(
            meme_scores.values(),
            key=lambda x: x['score'],
            reverse=True
        )
        
        return [item['meme'] for item in sorted_memes]
    
    def get_all_memes(self):
        """获取所有表情包"""
        return self.session.query(Meme).all()
    
    def get_meme_keywords(self, meme_id):
        """获取表情包的所有关键词"""
        meme = self.session.query(Meme).get(meme_id)
        return meme.keywords if meme else []