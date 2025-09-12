import { z } from 'zod';
// 操作事件类型枚举
export const EventTypeSchema = z.enum([
    'asset.create',
    'asset.update.meta',
    'asset.delete',
    'tag.add',
    'tag.remove',
    'keyword.add',
    'keyword.remove',
    'relation.upsert',
    'relation.delete',
    'format.merge',
]);
// 操作事件结构
export const OperationEventSchema = z.object({
    eventId: z.string(),
    serverClock: z.number().optional(),
    deviceClock: z.number(),
    deviceId: z.string(),
    userId: z.string(),
    ts: z.number(),
    type: EventTypeSchema,
    payload: z.record(z.any()),
    deps: z.array(z.string()),
});
