import { z } from 'zod';
// 基础实体类型
export const AssetSchema = z.object({
    id: z.string(),
    contentHash: z.string(),
    formats: z.array(z.enum(['png', 'webp', 'gif', 'jpg'])),
    meta: z.object({
        width: z.number(),
        height: z.number(),
        size: z.number(),
        sourceUrl: z.string().optional(),
    }),
    createdAt: z.number(),
    updatedAt: z.number(),
    tombstone: z.boolean().optional(),
});
export const TagSchema = z.object({
    id: z.string(),
    name: z.string(),
    aliases: z.array(z.string()),
});
export const KeywordSchema = z.object({
    id: z.string(),
    text: z.string(),
    lang: z.string().optional(),
    weight: z.number().default(1),
});
// 关系类型
export const AssetTagSchema = z.object({
    assetId: z.string(),
    tagId: z.string(),
});
export const AssetKeywordSchema = z.object({
    assetId: z.string(),
    keywordId: z.string(),
    weight: z.number().default(1),
});
