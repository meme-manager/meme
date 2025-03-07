import { Sequelize, Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { join } from 'path';
import { app } from 'electron';

// 确保数据库目录存在
const dbPath = join(app.getPath('userData'), 'database.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
});

// 表情包模型
export class Meme extends Model<InferAttributes<Meme>, InferCreationAttributes<Meme>> {
    declare id: CreationOptional<string>;
    declare path: string;
    declare source: string;
    declare type: string;
    declare createTime: Date;
    declare updateTime: Date;

    static associate(models: any) {
        Meme.belongsToMany(models.Keyword, { through: 'MemeKeywordMap' });
    }
}

// 关键词模型
export class Keyword extends Model<InferAttributes<Keyword>, InferCreationAttributes<Keyword>> {
    declare id: CreationOptional<string>;
    declare word: string;
    declare createTime: Date;
}

// 关键词映射模型
export class MemeKeywordMap extends Model<InferAttributes<MemeKeywordMap>, InferCreationAttributes<MemeKeywordMap>> {
    declare memeId: string;
    declare keywordId: string;
}

// 初始化模型
Meme.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    path: {
        type: DataTypes.STRING,
        allowNull: false
    },
    source: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    createTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    updateTime: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'Meme',
    timestamps: false
});

Keyword.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    word: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    createTime: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'Keyword',
    timestamps: false
});

MemeKeywordMap.init({
    memeId: {
        type: DataTypes.UUID,
        references: {
            model: Meme,
            key: 'id'
        }
    },
    keywordId: {
        type: DataTypes.UUID,
        references: {
            model: Keyword,
            key: 'id'
        }
    }
}, { sequelize });

// 同步数据库
sequelize.sync(); 