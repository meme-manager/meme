import { app } from 'electron';
import { join } from 'path';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';
import { Meme } from '../../models/database.js';

export class MemeService {
    private storageDir: string;

    constructor() {
        this.storageDir = join(app.getPath('userData'), 'memes');
        this.initStorage();
    }

    private async initStorage() {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
        } catch (error) {
            console.error('初始化存储目录失败:', error);
        }
    }

    // 生成文件哈希名
    private async generateFileName(buffer: Buffer): Promise<string> {
        const hash = createHash('md5');
        hash.update(buffer);
        return hash.digest('hex');
    }

    // 从本地文件导入
    async importFromLocal(filePath: string) {
        try {
            const buffer = await fs.readFile(filePath);
            const fileName = await this.generateFileName(buffer);
            const fileExt = filePath.split('.').pop() || 'png';
            const savedPath = join(this.storageDir, `${fileName}.${fileExt}`);

            // 检查文件是否已存在
            const existingMeme = await Meme.findOne({
                where: { path: savedPath }
            });

            if (existingMeme) {
                return existingMeme;
            }

            // 保存文件
            await fs.writeFile(savedPath, buffer);

            // 创建数据库记录
            return await Meme.create({
                path: savedPath,
                source: filePath,
                type: fileExt,
                createTime: new Date(),
                updateTime: new Date()
            });
        } catch (error) {
            console.error('导入本地文件失败:', error);
            throw error;
        }
    }

    // 从URL导入
    async importFromUrl(url: string) {
        try {
            const response = await fetch(url);
            const buffer = await response.buffer();
            const fileName = await this.generateFileName(buffer);
            const fileExt = url.split('.').pop()?.split(/[?#]/)[0] || 'png';
            const savedPath = join(this.storageDir, `${fileName}.${fileExt}`);

            // 检查文件是否已存在
            const existingMeme = await Meme.findOne({
                where: { path: savedPath }
            });

            if (existingMeme) {
                return existingMeme;
            }

            // 保存文件
            await fs.writeFile(savedPath, buffer);

            // 创建数据库记录
            return await Meme.create({
                path: savedPath,
                source: url,
                type: fileExt,
                createTime: new Date(),
                updateTime: new Date()
            });
        } catch (error) {
            console.error('导入URL文件失败:', error);
            throw error;
        }
    }

    // 获取所有表情包
    async getAllMemes() {
        return await Meme.findAll({
            order: [['createTime', 'DESC']]
        });
    }

    // 删除表情包
    async deleteMeme(id: string) {
        const meme = await Meme.findByPk(id);
        if (meme) {
            try {
                await fs.unlink(meme.path);
                await meme.destroy();
                return true;
            } catch (error) {
                console.error('删除表情包失败:', error);
                throw error;
            }
        }
        return false;
    }
} 