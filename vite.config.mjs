import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import electron from 'vite-plugin-electron';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    plugins: [
        svelte(),
        electron([
            {
                // Main-Process entry file of the Electron App.
                entry: 'src/main/index.ts',
                onstart({ startup }) {
                    startup();
                },
                vite: {
                    build: {
                        outDir: 'dist/main',
                        rollupOptions: {
                            output: {
                                format: 'cjs',
                                entryFileNames: '[name].cjs'
                            }
                        }
                    }
                }
            },
            {
                entry: 'src/main/preload.ts',
                onstart({ reload }) {
                    reload();
                },
                vite: {
                    build: {
                        outDir: 'dist/preload',
                        rollupOptions: {
                            output: {
                                format: 'cjs',
                                entryFileNames: '[name].cjs'
                            }
                        }
                    }
                }
            }
        ])
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    build: {
        outDir: 'dist/renderer'
    },
    server: {
        port: 5173
    }
}); 