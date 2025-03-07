import type { Meme } from '../models/database';

export interface IElectronAPI {
    invoke(channel: 'import-local-meme'): Promise<Meme[]>;
    invoke(channel: 'import-url-meme', url: string): Promise<Meme>;
    invoke(channel: 'get-all-memes'): Promise<Meme[]>;
    invoke(channel: 'delete-meme', id: string): Promise<boolean>;
}

declare global {
    interface Window {
        electron: IElectronAPI;
    }
} 