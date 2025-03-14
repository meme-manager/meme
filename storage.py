import os
import shutil
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Meme, Keyword

class Storage:
    def __init__(self, db_path='memes.db', storage_dir='resources'):
        self.storage_dir = storage_dir
        if not os.path.exists(storage_dir):
            os.makedirs(storage_dir)
            
        self.engine = create_engine(f'sqlite:///{db_path}')
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
    
    def import_meme(self, file_path, source=None):
        """导入表情包文件到存储目录并创建数据库记录"""
        # 生成唯一文件名
        file_ext = os.path.splitext(file_path)[1]
        new_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}{file_ext}"
        new_path = os.path.join(self.storage_dir, new_filename)
        
        # 复制文件到存储目录
        shutil.copy2(file_path, new_path)
        
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
        """根据关键词搜索表情包"""
        keyword = self.session.query(Keyword).filter_by(word=word).first()
        return keyword.memes if keyword else []
    
    def get_all_memes(self):
        """获取所有表情包"""
        return self.session.query(Meme).all()
    
    def get_meme_keywords(self, meme_id):
        """获取表情包的所有关键词"""
        meme = self.session.query(Meme).get(meme_id)
        return meme.keywords if meme else []