import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    type: z.enum(['artigo', 'roteiro', 'plano-diretor']),
    excerpt: z.string(),
    tags: z.array(z.string()).default([]),
    status: z.enum(['draft', 'published']),
    publishedAt: z.date().optional(),
    updatedAt: z.date().optional(),
    coverImageUrl: z.string().optional(),
    coverCredits: z.string().optional(),
    author: z.string().default('Marcelino')
  })
});

export const collections = { posts };
