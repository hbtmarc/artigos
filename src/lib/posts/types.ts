import type { Timestamp } from 'firebase/firestore';

export type Post = {
  id: string;
  title: string;
  excerpt: string;
  type: 'artigo' | 'roteiro' | 'plano-diretor';
  tags: string[];
  status: 'draft' | 'published';
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp | null;
};
