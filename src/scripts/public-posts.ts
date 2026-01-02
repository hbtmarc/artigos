import { withBase } from '../lib/withBase';
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

const createTagChips = (tags: string[]) => {
  if (!tags.length) return null;
  const container = document.createElement('div');
  container.className = 'tag-chips';
  container.setAttribute('aria-label', 'Tags');
  tags.forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = tag;
    container.appendChild(chip);
  });
  return container;
};

const renderPostCard = (post: Post) => {
  const article = document.createElement('article');
  article.className = 'post-card';
  article.dataset.postType = post.type;

  const header = document.createElement('div');
  header.className = 'post-card-header';

  const badge = document.createElement('span');
  badge.className = 'post-badge';
  badge.textContent = typeLabels[post.type] ?? post.type;

  const date = document.createElement('span');
  date.className = 'post-date';
  date.textContent = formatDate(post.publishedAt ?? post.updatedAt);

  header.append(badge, date);

  const title = document.createElement('h3');
  const link = document.createElement('a');
  link.href = withBase(`p/${post.id}/`);
  link.textContent = post.title;
  title.appendChild(link);

  const excerpt = document.createElement('p');
  excerpt.className = 'post-excerpt';
  excerpt.textContent = post.excerpt;

  article.append(header, title, excerpt);

  const tags = createTagChips(post.tags ?? []);
  if (tags) article.appendChild(tags);

  return article;
};

document.addEventListener('DOMContentLoaded', async () => {
  const listEl = document.querySelector('[data-post-list]');
  if (!listEl) return;

  const params = new URLSearchParams(window.location.search);
  const typeParam = params.get('type') ?? '';
  const validTypes = new Set(['artigo', 'roteiro', 'plano-diretor']);
  const selectedType = validTypes.has(typeParam) ? typeParam : 'all';

  document.querySelectorAll('[data-filter-chip]').forEach((chip) => {
    const value = chip.getAttribute('data-filter-chip');
    const isActive = (selectedType === 'all' && value === 'all') || value === selectedType;
    chip.classList.toggle('is-active', isActive);
    if (isActive) {
      chip.setAttribute('aria-current', 'page');
    } else {
      chip.removeAttribute('aria-current');
    }
  });

  try {
    const module = await import('../lib/posts/firestore');
    const posts = await module.listPublishedPosts();
    const visiblePosts =
      selectedType === 'all'
        ? posts
        : posts.filter((post) => post.type === selectedType);

    listEl.innerHTML = '';
    if (!visiblePosts.length) {
      const empty = document.createElement('p');
      empty.className = 'post-empty';
      empty.textContent = 'Nenhum post publicado ainda.';
      listEl.appendChild(empty);
      return;
    }

    visiblePosts.forEach((post) => {
      listEl.appendChild(renderPostCard(post));
    });
  } catch (error) {
    console.log(error);
    listEl.innerHTML = '';
    const errorMessage = document.createElement('p');
    errorMessage.className = 'post-empty';
    errorMessage.textContent = 'Nao foi possivel carregar posts.';
    listEl.appendChild(errorMessage);
  }
});
