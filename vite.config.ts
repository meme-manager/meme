import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import electron from 'vite-plugin-electron';
import { resolve } from 'path';
import commonjs from '@rollup/plugin-commonjs';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        svelte({
            compilerOptions: {
                dev: true
            }
        }),
        electron({
            entry: [
                'src/main/index.ts',
                'src/main/preload.ts'
            ],
            vite: {
                build: {
                    outDir: 'dist/main',
                    lib: {
                        entry: {
                            index: 'src/main/index.ts',
                            'services/meme-service': 'src/main/services/meme-service.ts'
                        },
                        formats: ['cjs']
                    },
                    rollupOptions: {
                        external: [
                            'electron',
                            'electron-store',
                            'node-fetch',
                            'sqlite3',
                            'sequelize',
                            'pg-hstore'
                        ],
                        output: {
                            format: 'cjs',
                            entryFileNames: '[name].cjs',
                            chunkFileNames: '[name]-[hash].cjs'
                        },
                        plugins: [
                            commonjs({
                                dynamicRequireTargets: [
                                    'node_modules/sqlite3/**/*.js'
                                ]
                            })
                        ]
                    }
                },
                optimizeDeps: {
                    exclude: ['sqlite3', 'sequelize', 'pg-hstore']
                }
            }
        })
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    root: 'src/renderer',
    base: './',
    build: {
        outDir: resolve(__dirname, 'dist/renderer'),
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'src/renderer/index.html')
        }
    }
}); 