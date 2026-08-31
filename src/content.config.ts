import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false)
  })
});

const papers = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/papers' }),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    venue: z.string(),
    year: z.number(),
    addedAt: z.coerce.date(),
    status: z.enum(['reading', 'finished', 'to-read']),
    progress: z.number().min(0).max(100).default(0),
    paperUrl: z.url().refine((url) => url.startsWith('https://arxiv.org/abs/'), {
      message: 'paperUrl 必须是 arXiv 摘要页链接'
    }),
    pdfUrl: z.string().optional(),
    codeUrl: z.url().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    description: z.string()
  })
});

export const collections = { blog, papers };
