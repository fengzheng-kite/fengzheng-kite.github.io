import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { notesApiPlugin } from './notes-api.mjs';

export default defineConfig({
  site: 'https://fengzheng-kite.github.io',
  integrations: [mdx()],
  vite: { plugins: [notesApiPlugin()] },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: { theme: 'github-dark' }
  }
});
