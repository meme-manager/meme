import { z } from 'zod';
export declare const EventTypeSchema: z.ZodEnum<["asset.create", "asset.update.meta", "asset.delete", "tag.add", "tag.remove", "keyword.add", "keyword.remove", "relation.upsert", "relation.delete", "format.merge"]>;
export declare const OperationEventSchema: z.ZodObject<{
    eventId: z.ZodString;
    serverClock: z.ZodOptional<z.ZodNumber>;
    deviceClock: z.ZodNumber;
    deviceId: z.ZodString;
    userId: z.ZodString;
    ts: z.ZodNumber;
    type: z.ZodEnum<["asset.create", "asset.update.meta", "asset.delete", "tag.add", "tag.remove", "keyword.add", "keyword.remove", "relation.upsert", "relation.delete", "format.merge"]>;
    payload: z.ZodRecord<z.ZodString, z.ZodAny>;
    deps: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    eventId: string;
    deviceClock: number;
    deviceId: string;
    userId: string;
    ts: number;
    type: "asset.create" | "asset.update.meta" | "asset.delete" | "tag.add" | "tag.remove" | "keyword.add" | "keyword.remove" | "relation.upsert" | "relation.delete" | "format.merge";
    payload: Record<string, any>;
    deps: string[];
    serverClock?: number | undefined;
}, {
    eventId: string;
    deviceClock: number;
    deviceId: string;
    userId: string;
    ts: number;
    type: "asset.create" | "asset.update.meta" | "asset.delete" | "tag.add" | "tag.remove" | "keyword.add" | "keyword.remove" | "relation.upsert" | "relation.delete" | "format.merge";
    payload: Record<string, any>;
    deps: string[];
    serverClock?: number | undefined;
}>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type OperationEvent = z.infer<typeof OperationEventSchema>;
