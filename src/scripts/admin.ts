console.log('admin script loaded');

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import type { Post } from '../lib/posts/types';
import { withBase } from '../lib/withBase';

type PostInput = {
  id: string;
  title: string;
  excerpt: string;
  type: Post['type'];
  tags: string[];
  status: Post['status'];
  content: string;
};

document.addEventListener('DOMContentLoaded', async () => {
  let auth: Auth | null = null;
  let db: Firestore | null = null;
  let postsApi:
    | {
        listAllPostsAdmin: () => Promise<Post[]>;
        getPostById: (id: string) => Promise<Post | null>;
        upsertPostAdmin: (post: PostInput) => Promise<void>;
        deletePostAdmin: (id: string) => Promise<void>;
      }
    | null = null;
  let postsCache = new Map<string, Post>();
  let isAdminUser = false;

  const form = document.getElementById('login-form') as HTMLFormElement | null;
  const emailInput = document.getElementById('email') as HTMLInputElement | null;
  const passwordInput = document.getElementById('password') as HTMLInputElement | null;
  const statusEl = document.getElementById('status') as HTMLParagraphElement | null;
  const loggedOutSection = document.getElementById('loggedOut') as HTMLElement | null;
  const loggedSection = document.getElementById('logged') as HTMLElement | null;
  const resetButton = document.getElementById('btn-reset') as HTMLButtonElement | null;
  const logoutButton = document.getElementById('btn-logout') as HTMLButtonElement | null;
  const userEmailEl = document.getElementById('user-email') as HTMLElement | null;
  const userUidEl = document.getElementById('user-uid') as HTMLElement | null;
  const adminStatusEl = document.getElementById('admin-status') as HTMLElement | null;
  const adminNoteEl = document.getElementById('admin-note') as HTMLElement | null;
  const postCountEl = document.getElementById('post-count') as HTMLElement | null;

  const editorialPanel = document.getElementById('editorial-panel') as HTMLElement | null;
  const editorPanel = document.getElementById('editor-panel') as HTMLElement | null;
  const postsList = document.getElementById('posts-list') as HTMLElement | null;
  const newPostButton = document.getElementById('btn-new-post') as HTMLButtonElement | null;
  const backButton = document.getElementById('btn-back') as HTMLButtonElement | null;
  const postForm = document.getElementById('post-form') as HTMLFormElement | null;
  const slugInput = document.getElementById('post-slug') as HTMLInputElement | null;
  const titleInput = document.getElementById('post-title') as HTMLInputElement | null;
  const excerptInput = document.getElementById('post-excerpt') as HTMLInputElement | null;
  const typeInput = document.getElementById('post-type') as HTMLSelectElement | null;
  const tagsInput = document.getElementById('post-tags') as HTMLInputElement | null;
  const statusInput = document.getElementById('post-status') as HTMLSelectElement | null;
  const contentInput = document.getElementById('post-content') as HTMLTextAreaElement | null;
  const saveButton = document.getElementById('btn-save') as HTMLButtonElement | null;
  const publishButton = document.getElementById('btn-publish') as HTMLButtonElement | null;

  const errorMessages: Record<string, string> = {
    'auth/wrong-password': 'Senha incorreta. Tente novamente.',
    'auth/user-not-found': 'Usuario nao encontrado para este email.',
    'auth/unauthorized-domain':
      'Dominio nao autorizado. Adicione este dominio nas configuracoes do Firebase.',
    'auth/invalid-email': 'Email invalido. Verifique e tente novamente.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.'
  };

  const typeLabels: Record<Post['type'], string> = {
    artigo: 'Artigo',
    roteiro: 'Roteiro',
    'plano-diretor': 'Plano Diretor'
  };

  const setStatus = (message: string, kind = 'info') => {
    if (!statusEl) return;
    if (!message) {
      statusEl.textContent = '';
      statusEl.hidden = true;
      statusEl.dataset.kind = '';
      return;
    }
    statusEl.textContent = message;
    statusEl.hidden = false;
    statusEl.dataset.kind = kind;
  };

  const getErrorMessage = (error: unknown) => {
    if (!error || typeof error !== 'object') return 'Nao foi possivel concluir.';
    const code = (error as { code?: string }).code || '';
    return errorMessages[code] || 'Nao foi possivel concluir.';
  };

  const setAdminState = (isAdmin: boolean) => {
    isAdminUser = isAdmin;
    if (adminStatusEl) adminStatusEl.textContent = isAdmin ? 'SIM' : 'NAO';
    if (adminNoteEl) adminNoteEl.hidden = isAdmin;
    if (!isAdmin && postCountEl) postCountEl.textContent = '-';
    if (editorialPanel) editorialPanel.hidden = !isAdmin;
    if (editorPanel) editorPanel.hidden = true;
  };

  const showLoggedIn = (user: { email: string | null; uid: string }) => {
    if (loggedOutSection) loggedOutSection.hidden = true;
    if (loggedSection) loggedSection.hidden = false;
    if (userEmailEl) userEmailEl.textContent = user.email || '-';
    if (userUidEl) userUidEl.textContent = user.uid;
  };

  const showLoggedOut = () => {
    if (loggedOutSection) loggedOutSection.hidden = false;
    if (loggedSection) loggedSection.hidden = true;
    if (userEmailEl) userEmailEl.textContent = '';
    if (userUidEl) userUidEl.textContent = '';
    if (adminStatusEl) adminStatusEl.textContent = '-';
    if (adminNoteEl) adminNoteEl.hidden = true;
    if (postCountEl) postCountEl.textContent = '-';
    if (editorialPanel) editorialPanel.hidden = true;
    if (editorPanel) editorPanel.hidden = true;
    if (postsList) postsList.innerHTML = '';
    postsCache.clear();
  };

  const formatTimestamp = (timestamp: Post['updatedAt'] | Post['publishedAt'] | undefined | null) => {
    if (!timestamp || typeof (timestamp as { toDate?: () => Date }).toDate !== 'function') {
      return '-';
    }
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(
      (timestamp as { toDate: () => Date }).toDate()
    );
  };

  const createCell = (label: string, value: string, className = 'admin-post-cell') => {
    const cell = document.createElement('div');
    cell.className = className;

    const labelEl = document.createElement('span');
    labelEl.className = 'admin-post-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'admin-post-value';
    valueEl.textContent = value;

    cell.append(labelEl, valueEl);
    return cell;
  };

  const renderPostRow = (post: Post) => {
    const row = document.createElement('div');
    row.className = 'admin-post-row';

    const titleCell = document.createElement('div');
    titleCell.className = 'admin-post-title';

    const titleLabel = document.createElement('span');
    titleLabel.className = 'admin-post-label';
    titleLabel.textContent = 'Titulo';

    const titleValue = document.createElement('span');
    titleValue.className = 'admin-post-value';
    titleValue.textContent = post.title;

    const slugValue = document.createElement('span');
    slugValue.className = 'admin-post-id';
    slugValue.textContent = post.id;

    titleCell.append(titleLabel, titleValue, slugValue);

    const statusCell = createCell('Status', post.status);
    const typeCell = createCell('Tipo', typeLabels[post.type] ?? post.type);
    const updatedCell = createCell('Atualizado', formatTimestamp(post.updatedAt));

    const actions = document.createElement('div');
    actions.className = 'admin-post-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'admin-action';
    editButton.dataset.action = 'edit';
    editButton.dataset.id = post.id;
    editButton.textContent = 'Editar';

    const viewLink = document.createElement('a');
    viewLink.className = 'admin-action';
    viewLink.href = withBase(`p/${post.id}/`);
    viewLink.textContent = 'Ver';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'admin-action is-danger';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.id = post.id;
    deleteButton.textContent = 'Excluir';

    actions.append(editButton, viewLink, deleteButton);

    row.append(titleCell, statusCell, typeCell, updatedCell, actions);
    return row;
  };

  const renderPostsList = (posts: Post[]) => {
    if (!postsList) return;
    postsList.innerHTML = '';
    postsCache = new Map<string, Post>();

    if (!posts.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = 'Nenhum post encontrado.';
      postsList.appendChild(empty);
      return;
    }

    posts.forEach((post) => {
      postsCache.set(post.id, post);
      postsList.appendChild(renderPostRow(post));
    });
  };

  const showListView = () => {
    if (editorialPanel) editorialPanel.hidden = !isAdminUser;
    if (editorPanel) editorPanel.hidden = true;
  };

  const showEditorView = () => {
    if (editorialPanel) editorialPanel.hidden = true;
    if (editorPanel) editorPanel.hidden = false;
  };

  const resetForm = () => {
    if (postForm) postForm.reset();
    if (slugInput) {
      slugInput.readOnly = false;
      slugInput.classList.remove('is-readonly');
    }
    if (statusInput) statusInput.value = 'draft';
    if (typeInput) typeInput.value = 'artigo';
    if (contentInput) contentInput.value = '';
  };

  const fillForm = (post: Post) => {
    if (slugInput) {
      slugInput.value = post.id;
      slugInput.readOnly = true;
      slugInput.classList.add('is-readonly');
    }
    if (titleInput) titleInput.value = post.title;
    if (excerptInput) excerptInput.value = post.excerpt;
    if (typeInput) typeInput.value = post.type;
    if (tagsInput) tagsInput.value = post.tags.join(', ');
    if (statusInput) statusInput.value = post.status;
    if (contentInput) contentInput.value = post.content;
  };

  const isValidSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

  const getPostInput = (statusOverride?: Post['status']): PostInput | null => {
    const slug = slugInput?.value?.trim() ?? '';
    if (!slug) {
      setStatus('Slug obrigatorio.', 'error');
      return null;
    }
    if (!isValidSlug(slug)) {
      setStatus('Slug deve ser kebab-case.', 'error');
      return null;
    }
    const title = titleInput?.value?.trim() ?? '';
    if (!title) {
      setStatus('Titulo obrigatorio.', 'error');
      return null;
    }

    const excerpt = excerptInput?.value?.trim() ?? '';
    const type = (typeInput?.value || 'artigo') as Post['type'];
    const tags = (tagsInput?.value || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const status = (statusOverride || statusInput?.value || 'draft') as Post['status'];
    const content = contentInput?.value ?? '';

    return {
      id: slug,
      title,
      excerpt,
      type,
      tags,
      status,
      content
    };
  };

  const loadPostsApi = async () => {
    if (postsApi) return postsApi;
    const module = await import('../lib/posts/firestore');
    postsApi = {
      listAllPostsAdmin: module.listAllPostsAdmin,
      getPostById: module.getPostById,
      upsertPostAdmin: module.upsertPostAdmin,
      deletePostAdmin: module.deletePostAdmin
    };
    return postsApi;
  };

  const loadAdminPosts = async () => {
    if (!isAdminUser) return;
    try {
      const api = await loadPostsApi();
      const posts = await api.listAllPostsAdmin();
      renderPostsList(posts);
      if (postCountEl) postCountEl.textContent = String(posts.length);
      showListView();
    } catch (error) {
      console.log(error);
      setStatus('Nao foi possivel carregar posts.', 'error');
    }
  };

  const openEditor = async (id: string) => {
    if (!isAdminUser) return;
    try {
      const api = await loadPostsApi();
      const post = postsCache.get(id) ?? (await api.getPostById(id));
      if (!post) {
        setStatus('Post nao encontrado.', 'error');
        return;
      }
      fillForm(post);
      showEditorView();
    } catch (error) {
      console.log(error);
      setStatus('Nao foi possivel abrir o post.', 'error');
    }
  };

  const savePost = async (statusOverride?: Post['status']) => {
    if (!isAdminUser) {
      setStatus('Acesso admin necessario.', 'error');
      return;
    }
    const payload = getPostInput(statusOverride);
    if (!payload) return;
    if (statusOverride && statusInput) statusInput.value = statusOverride;

    try {
      const api = await loadPostsApi();
      await api.upsertPostAdmin(payload);
      setStatus(statusOverride === 'published' ? 'Post publicado.' : 'Post salvo.', 'success');
      await loadAdminPosts();
      showListView();
    } catch (error) {
      console.log(error);
      setStatus('Nao foi possivel salvar o post.', 'error');
    }
  };

  const deletePost = async (id: string) => {
    if (!isAdminUser) {
      setStatus('Acesso admin necessario.', 'error');
      return;
    }
    const confirmed = window.confirm('Excluir este post?');
    if (!confirmed) return;

    try {
      const api = await loadPostsApi();
      await api.deletePostAdmin(id);
      setStatus('Post removido.', 'success');
      await loadAdminPosts();
    } catch (error) {
      console.log(error);
      setStatus('Nao foi possivel excluir o post.', 'error');
    }
  };

  const checkAdmin = async (uid: string) => {
    if (!db) return false;
    try {
      const snapshot = await getDoc(doc(db, 'admins', uid));
      const data = snapshot.exists() ? snapshot.data() : null;
      const isAdmin = Boolean(data && data.active === true);
      setAdminState(isAdmin);
      return isAdmin;
    } catch (error) {
      console.log(error);
      setAdminState(false);
      setStatus('Nao foi possivel verificar permissao de admin.', 'error');
      return false;
    }
  };

  const initFirebase = async () => {
    try {
      const firebase = await import('../lib/firebase/client');
      auth = firebase.auth;
      db = firebase.db;
      return true;
    } catch (error) {
      console.log(error);
      const message =
        error instanceof Error
          ? error.message
          : 'Configuracao Firebase invalida. Verifique as variaveis de ambiente.';
      setStatus(message, 'error');
      return false;
    }
  };

  const isReady = await initFirebase();
  if (isReady && auth) {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        showLoggedIn(user);
        setStatus('Login ativo.', 'success');
        checkAdmin(user.uid).then((isAdmin) => {
          if (isAdmin) loadAdminPosts();
        });
      } else {
        showLoggedOut();
        setStatus('', 'info');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!auth) {
        setStatus('Configuracao Firebase invalida. Verifique as variaveis de ambiente.', 'error');
        return;
      }
      const email = emailInput?.value?.trim();
      const password = passwordInput?.value || '';
      if (!email || !password) {
        setStatus('Preencha email e senha para entrar.', 'error');
        return;
      }
      try {
        await signInWithEmailAndPassword(auth, email, password);
        setStatus('Login realizado.', 'success');
        if (passwordInput) passwordInput.value = '';
      } catch (error) {
        console.log(error);
        setStatus(getErrorMessage(error), 'error');
      }
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', async () => {
      if (!auth) {
        setStatus('Configuracao Firebase invalida. Verifique as variaveis de ambiente.', 'error');
        return;
      }
      const email = emailInput?.value?.trim();
      if (!email) {
        setStatus('Informe o email para enviar o reset.', 'error');
        return;
      }
      try {
        await sendPasswordResetEmail(auth, email);
        setStatus('Email de recuperacao enviado.', 'success');
      } catch (error) {
        console.log(error);
        setStatus(getErrorMessage(error), 'error');
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      if (!auth) {
        setStatus('Configuracao Firebase invalida. Verifique as variaveis de ambiente.', 'error');
        return;
      }
      try {
        await signOut(auth);
        setStatus('Sessao encerrada.', 'info');
      } catch (error) {
        console.log(error);
        setStatus(getErrorMessage(error), 'error');
      }
    });
  }

  if (newPostButton) {
    newPostButton.addEventListener('click', () => {
      if (!isAdminUser) return;
      resetForm();
      showEditorView();
    });
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      showListView();
    });
  }

  if (postForm) {
    postForm.addEventListener('submit', (event) => {
      event.preventDefault();
      savePost();
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      savePost();
    });
  }

  if (publishButton) {
    publishButton.addEventListener('click', () => {
      savePost('published');
    });
  }

  if (postsList) {
    postsList.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (!button) return;
      const action = button.dataset.action;
      const id = button.dataset.id;
      if (!action || !id) return;
      if (action === 'edit') openEditor(id);
      if (action === 'delete') deletePost(id);
    });
  }
});
