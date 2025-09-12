import { z } from 'zod';
export declare const AssetSchema: z.ZodObject<{
    id: z.ZodString;
    contentHash: z.ZodString;
    formats: z.ZodArray<z.ZodEnum<["png", "webp", "gif", "jpg"]>, "many">;
    meta: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
        size: z.ZodNumber;
        sourceUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        size: number;
        sourceUrl?: string | undefined;
    }, {
        width: number;
        height: number;
        size: number;
        sourceUrl?: string | undefined;
    }>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
    tombstone: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    contentHash: string;
    formats: ("png" | "webp" | "gif" | "jpg")[];
    meta: {
        width: number;
        height: number;
        size: number;
        sourceUrl?: string | undefined;
    };
    createdAt: number;
    updatedAt: number;
    tombstone?: boolean | undefined;
}, {
    id: string;
    contentHash: string;
    formats: ("png" | "webp" | "gif" | "jpg")[];
    meta: {
        width: number;
        height: number;
        size: number;
        sourceUrl?: string | undefined;
    };
    createdAt: number;
    updatedAt: number;
    tombstone?: boolean | undefined;
}>;
export declare const TagSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    aliases: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    aliases: string[];
}, {
    id: string;
    name: string;
    aliases: string[];
}>;
export declare const KeywordSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    lang: z.ZodOptional<z.ZodString>;
    weight: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    text: string;
    weight: number;
    lang?: string | undefined;
}, {
    id: string;
    text: string;
    lang?: string | undefined;
    weight?: number | undefined;
}>;
export declare const AssetTagSchema: z.ZodObject<{
    assetId: z.ZodString;
    tagId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    assetId: string;
    tagId: string;
}, {
    assetId: string;
    tagId: string;
}>;
export declare const AssetKeywordSchema: z.ZodObject<{
    assetId: z.ZodString;
    keywordId: z.ZodString;
    weight: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    weight: number;
    assetId: string;
    keywordId: string;
}, {
    assetId: string;
    keywordId: string;
    weight?: number | undefined;
}>;
export type Asset = z.infer<typeof AssetSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Keyword = z.infer<typeof KeywordSchema>;
export type AssetTag = z.infer<typeof AssetTagSchema>;
export type AssetKeyword = z.infer<typeof AssetKeywordSchema>;
