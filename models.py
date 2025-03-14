from sqlalchemy import create_engine, Column, String, DateTime, Table, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

# 表情包和关键词的多对多映射表
meme_keyword_map = Table(
    'meme_keyword_map',
    Base.metadata,
    Column('meme_id', String, ForeignKey('memes.id')),
    Column('keyword_id', String, ForeignKey('keywords.id'))
)

class Meme(Base):
    __tablename__ = 'memes'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    path = Column(String, nullable=False)  # 本地存储路径
    source = Column(String)  # 来源链接
    type = Column(String)  # 图片类型（静态/动图）
    create_time = Column(DateTime, default=datetime.now)
    update_time = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联关键词
    keywords = relationship('Keyword', secondary=meme_keyword_map, back_populates='memes')

class Keyword(Base):
    __tablename__ = 'keywords'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    word = Column(String, nullable=False, unique=True)
    create_time = Column(DateTime, default=datetime.now)
    
    # 关联表情包
    memes = relationship('Meme', secondary=meme_keyword_map, back_populates='keywords')

def init_db():
    """初始化数据库，创建所有表"""
    engine = create_engine('sqlite:///memes.db')
    Base.metadata.create_all(engine)