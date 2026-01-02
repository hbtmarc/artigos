import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  setDoc
} from 'firebase/firestore';

import type { Post } from './types';
import { db } from '../firebase/client';

const postsCollection = collection(db, 'posts');

type PostInput = Omit<Post, 'createdAt' | 'updatedAt' | 'publishedAt'> & {
  publishedAt?: Post['publishedAt'];
};

const toPost = (snapshot: Awaited<ReturnType<typeof getDoc>>): Post => {
  const data = snapshot.data() as Omit<Post, 'id'>;
  return {
    id: snapshot.id,
    ...data
  } as Post;
};

const getSortTimestamp = (post: Post) => {
  const timestamp = post.publishedAt ?? post.updatedAt;
  return timestamp ? timestamp.toMillis() : 0;
};

export async function listPublishedPosts(): Promise<Post[]> {
  const postsQuery = query(postsCollection, where('status', '==', 'published'));
  const snapshot = await getDocs(postsQuery);
  const posts = snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Omit<Post, 'id'>;
    return { id: docSnap.id, ...data } as Post;
  });
  return posts.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
}

export async function listAllPostsAdmin(): Promise<Post[]> {
  const snapshot = await getDocs(postsCollection);
  const posts = snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Omit<Post, 'id'>;
    return { id: docSnap.id, ...data } as Post;
  });
  return posts.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
}

export async function getPostById(id: string): Promise<Post | null> {
  const snapshot = await getDoc(doc(postsCollection, id));
  if (!snapshot.exists()) return null;
  return toPost(snapshot);
}

export async function upsertPostAdmin(post: PostInput): Promise<void> {
  const ref = doc(postsCollection, post.id);
  const snapshot = await getDoc(ref);
  const existing = snapshot.exists() ? snapshot.data() : null;

  const payload: Record<string, unknown> = {
    title: post.title,
    excerpt: post.excerpt,
    type: post.type,
    tags: post.tags ?? [],
    status: post.status,
    content: post.content
  };

  if (!snapshot.exists()) {
    payload.createdAt = serverTimestamp();
  }

  payload.updatedAt = serverTimestamp();

  const shouldSetPublishedAt =
    post.status === 'published' && (!existing || !existing.publishedAt);

  if (shouldSetPublishedAt) {
    payload.publishedAt = serverTimestamp();
  }

  await setDoc(ref, payload, { merge: true });
}

export async function deletePostAdmin(id: string): Promise<void> {
  await deleteDoc(doc(postsCollection, id));
}
