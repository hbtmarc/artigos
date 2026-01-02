import type { Post } from '../lib/posts/types';

const typeLabels: Record<Post['type'], string> = {
  artigo: 'Artigo',
  roteiro: 'Roteiro',
  'plano-diretor': 'Plano Diretor'
};

const formatDate = (timestamp: Post['publishedAt'] | Post['updatedAt']) => {
  if (!timestamp || typeof (timestamp as { toDate?: () => Date }).toDate !== 'function') {
    return 'Sem data';
  }
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(
    (timestamp as { toDate: () => Date }).toDate()
  );
};

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('[data-post-id]') as HTMLElement | null;
  const postId = container?.dataset.postId || '';
  const titleEl = document.querySelector('[data-post-title]') as HTMLElement | null;
  const typeEl = document.querySelector('[data-post-type]') as HTMLElement | null;
  const dateEl = document.querySelector('[data-post-date]') as HTMLElement | null;
  const metaEl = document.querySelector('[data-post-meta]') as HTMLElement | null;
  const contentEl = document.querySelector('[data-post-content]') as HTMLElement | null;

  const setMessage = (message: string) => {
    if (contentEl) contentEl.textContent = message;
  };

  if (!postId) {
    setMessage('Post nao encontrado.');
    return;
  }

  try {
    const module = await import('../lib/posts/firestore');
    const post = await module.getPostById(postId);
    if (!post || post.status !== 'published') {
      setMessage('Post nao encontrado.');
      return;
    }

    if (titleEl) titleEl.textContent = post.title;
    if (typeEl) typeEl.textContent = typeLabels[post.type] ?? post.type;
    if (dateEl) dateEl.textContent = formatDate(post.publishedAt ?? post.updatedAt);
    if (metaEl) metaEl.textContent = `Tipo: ${typeLabels[post.type] ?? post.type}`;
    if (contentEl) contentEl.textContent = post.content || '';

    if (post.title) {
      document.title = `${post.title} | Artigos`;
    }
  } catch (error) {
    console.log(error);
    setMessage('Nao foi possivel carregar este post.');
  }
});
