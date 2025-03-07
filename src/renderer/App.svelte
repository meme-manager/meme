<script lang="ts">
  import { onMount } from 'svelte';
  import type { Meme } from '../models/database';
  
  let searchKeyword = '';
  let memes: Meme[] = [];
  let urlInput = '';
  
  onMount(async () => {
    await loadMemes();
  });
  
  async function loadMemes() {
    memes = await window.electron.invoke('get-all-memes');
  }
  
  async function handleLocalImport() {
    const newMemes = await window.electron.invoke('import-local-meme');
    memes = [...newMemes, ...memes];
  }
  
  async function handleUrlImport() {
    if (urlInput) {
      const newMeme = await window.electron.invoke('import-url-meme', urlInput);
      if (newMeme) {
        memes = [newMeme, ...memes];
        urlInput = '';
      }
    }
  }
  
  async function handleDelete(id: string) {
    const success = await window.electron.invoke('delete-meme', id);
    if (success) {
      memes = memes.filter(meme => meme.id !== id);
    }
  }
</script>

<main>
  <header>
    <div class="search-bar">
      <input 
        type="text" 
        bind:value={searchKeyword} 
        placeholder="搜索表情包..."
      />
    </div>
    
    <div class="import-section">
      <button on:click={handleLocalImport}>从本地导入</button>
      <div class="url-import">
        <input 
          type="text" 
          bind:value={urlInput} 
          placeholder="输入图片URL..."
        />
        <button on:click={handleUrlImport}>导入</button>
      </div>
    </div>
  </header>
  
  <div class="meme-grid">
    {#each memes as meme}
      <div class="meme-item">
        <img src={`file://${meme.path}`} alt="表情包" />
        <div class="meme-actions">
          <button on:click={() => handleDelete(meme.id)}>删除</button>
        </div>
      </div>
    {/each}
  </div>
</main>

<style>
  main {
    padding: 20px;
  }
  
  header {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .meme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
  }
  
  .meme-item {
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .meme-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .import-section {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  .url-import {
    display: flex;
    gap: 5px;
  }
  
  .meme-actions {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 5px;
    background: rgba(0, 0, 0, 0.5);
    display: none;
  }
  
  .meme-item:hover .meme-actions {
    display: flex;
    justify-content: center;
  }
  
  .meme-actions button {
    background: #ff4444;
    color: white;
    border: none;
    padding: 3px 8px;
    border-radius: 3px;
    cursor: pointer;
  }
</style> 