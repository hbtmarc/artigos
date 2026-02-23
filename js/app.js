import { Store } from "./store.js";
import { nowISO, uid } from "./utils.js";

const store = new Store();
let activeView = "dashboard";

const views = {
  dashboard: document.querySelector("#dashboard"),
  projects: document.querySelector("#projects"),
  kanban: document.querySelector("#kanban"),
  writing: document.querySelector("#writing"),
  brainstorm: document.querySelector("#brainstorm"),
  mindmap: document.querySelector("#mindmap"),
  whiteboard: document.querySelector("#whiteboard")
};

const authScreen = document.querySelector("#auth-screen");
const appShell = document.querySelector("#app-shell");
const authEmailInput = document.querySelector("#auth-email");
const authPasswordInput = document.querySelector("#auth-password");
const authMessage = document.querySelector("#auth-message");
const authLoginBtn = document.querySelector("#auth-login-btn");
const authSignupBtn = document.querySelector("#auth-signup-btn");
const logoutBtn = document.querySelector("#logout-btn");
const currentUserEl = document.querySelector("#current-user");

document.querySelector("#main-nav").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-view]");
  if (!button) return;

  activeView = button.dataset.view;

  document
    .querySelectorAll("#main-nav button")
    .forEach((node) => node.classList.remove("active"));
  button.classList.add("active");

  render();
});

store.subscribe(() => render());
render();
store.connectFirebase().catch(() => {});

authLoginBtn.addEventListener("click", async () => {
  await submitAuth("signin");
});

authSignupBtn.addEventListener("click", async () => {
  await submitAuth("signup");
});

authPasswordInput.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;
  await submitAuth("signin");
});

logoutBtn.addEventListener("click", async () => {
  try {
    await store.signOut();
    authMessage.textContent = "Sessão encerrada.";
  } catch (error) {
    authMessage.textContent = `Falha ao sair: ${error.message}`;
  }
});

async function submitAuth(mode) {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value.trim();

  if (!email || !password) {
    authMessage.textContent = "Informe email e senha para continuar.";
    return;
  }

  try {
    if (mode === "signup") {
      await store.signUp(email, password);
      authMessage.textContent = "Conta criada e acesso liberado.";
      return;
    }

    await store.signIn(email, password);
    authMessage.textContent = "Login realizado com sucesso.";
  } catch (error) {
    authMessage.textContent =
      mode === "signup"
        ? `Falha ao criar conta: ${error.message}`
        : `Falha no login: ${error.message}`;
  }
}

function updateUserContext(state) {
  const authenticated = Boolean(state.settings.authUser);

  currentUserEl.textContent = authenticated
    ? `Usuário: ${state.settings.authUser.email || state.settings.authUser.uid}`
    : "Faça login para acessar o ambiente";
}

function applyAuthGate(state) {
  const authenticated = Boolean(state.settings.authUser);

  authScreen.classList.toggle("active", !authenticated);
  appShell.classList.toggle("hidden", !authenticated);
}

function render() {
  const state = store.getState();

  applyAuthGate(state);

  if (!state.settings.authUser) {
    updateUserContext(state);
    return;
  }

  Object.entries(views).forEach(([key, section]) => {
    section.classList.toggle("active", key === activeView);
  });

  updateUserContext(state);
  renderDashboard(state);
  renderProjects(state);
  renderKanban(state);
  renderWriting(state);
  renderBrainstorm(state);
  renderMindmap(state);
  renderWhiteboard(state);
}

function renderDashboard(state) {
  const cardsCount = Object.keys(state.kanban.cards).length;
  const lastUpdate = new Date(state.meta.updatedAt).toLocaleString("pt-BR");

  views.dashboard.innerHTML = `
    <div class="page-header">
      <h2>Dashboard</h2>
      <p>Visão geral da sua produção e organização criativa.</p>
    </div>

    <div class="grid four" style="margin-bottom: 20px">
      <article class="stat-card">
        <div class="stat-icon" style="background: var(--accent-light); color: var(--accent)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        </div>
        <div class="stat-value">${state.projects.length}</div>
        <div class="stat-label">Projetos</div>
      </article>
      <article class="stat-card">
        <div class="stat-icon" style="background: var(--warning-light); color: var(--warning)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>
        </div>
        <div class="stat-value">${cardsCount}</div>
        <div class="stat-label">Cards Kanban</div>
      </article>
      <article class="stat-card">
        <div class="stat-icon" style="background: var(--success-light); color: var(--success)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </div>
        <div class="stat-value">${state.writing.docs.length}</div>
        <div class="stat-label">Documentos</div>
      </article>
      <article class="stat-card">
        <div class="stat-icon" style="background: var(--danger-light); color: var(--danger)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
        </div>
        <div class="stat-value">${state.brainstorm.ideas.length}</div>
        <div class="stat-label">Ideias</div>
      </article>
    </div>

    <div class="grid two">
      <article class="card">
        <div class="card-header">
          <h3>Resumo geral</h3>
          <span class="badge accent">Workspace</span>
        </div>
        <p class="muted" style="font-size: 0.88rem">Última atualização: ${lastUpdate}</p>
        <p class="muted" style="font-size: 0.88rem">Itens organizados em projetos, quadros e ideias.</p>
      </article>
      <article class="card">
        <div class="card-header">
          <h3>Atividade recente</h3>
        </div>
        <p class="muted" style="font-size: 0.88rem">
          ${state.projects.length > 0 ? `Projeto mais recente: <strong>${state.projects[0].name}</strong>` : "Nenhum projeto cadastrado."}
        </p>
        <p class="muted" style="font-size: 0.88rem">
          ${state.writing.docs.length > 0 ? `Último doc: <strong>${state.writing.docs[0].title}</strong>` : "Nenhum documento."}
        </p>
      </article>
    </div>
  `;
}

function renderProjects(state) {
  const statusBadge = (status) => {
    const map = {
      "Planejamento": "accent",
      "Em andamento": "warning",
      "Pausado": "muted",
      "Concluído": "success"
    };
    return `<span class="badge ${map[status] || "muted"}">${status}</span>`;
  };

  views.projects.innerHTML = `
    <div class="page-header">
      <h2>Projetos</h2>
      <p>Gerencie seus projetos de conteúdo e produção.</p>
    </div>
    <div class="grid two">
      <article class="card">
        <div class="card-header"><h3>Novo projeto</h3></div>
        <div style="display: flex; flex-direction: column; gap: 12px">
          <div>
            <label>Nome</label>
            <input id="project-name" placeholder="Ex: Série sobre produtividade" />
          </div>
          <div>
            <label>Descrição</label>
            <textarea id="project-desc" placeholder="Objetivo e escopo do projeto" style="min-height: 80px"></textarea>
          </div>
          <div>
            <label>Status</label>
            <select id="project-status">
              <option>Planejamento</option>
              <option>Em andamento</option>
              <option>Pausado</option>
              <option>Concluído</option>
            </select>
          </div>
          <div class="actions">
            <button class="primary" id="add-project-btn">Criar projeto</button>
          </div>
        </div>
      </article>
      <article class="card">
        <div class="card-header"><h3>Todos os projetos</h3></div>
        ${state.projects.length === 0 ? `
          <div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            <p>Nenhum projeto ainda.</p>
          </div>
        ` : `
          <div class="list">
            ${state.projects
              .map(
                (project) => `
                <div class="list-item">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px">
                    <strong>${project.name}</strong>
                    ${statusBadge(project.status)}
                  </div>
                  <p class="muted" style="font-size: 0.85rem; margin-bottom: 10px">${project.description || "Sem descrição"}</p>
                  <div class="actions">
                    <select data-project-status="${project.id}" style="width: auto; min-width: 140px">
                      <option ${project.status === "Planejamento" ? "selected" : ""}>Planejamento</option>
                      <option ${project.status === "Em andamento" ? "selected" : ""}>Em andamento</option>
                      <option ${project.status === "Pausado" ? "selected" : ""}>Pausado</option>
                      <option ${project.status === "Concluído" ? "selected" : ""}>Concluído</option>
                    </select>
                    <button class="danger" data-project-delete="${project.id}">Remover</button>
                  </div>
                </div>
              `
              )
              .join("")}
          </div>
        `}
      </article>
    </div>
  `;

  views.projects.querySelector("#add-project-btn").addEventListener("click", () => {
    const name = views.projects.querySelector("#project-name").value.trim();
    const description = views.projects.querySelector("#project-desc").value.trim();
    const status = views.projects.querySelector("#project-status").value;

    if (!name) return;

    store.setState((prev) => ({
      ...prev,
      projects: [
        {
          id: uid("project"),
          name,
          description,
          status,
          tags: [],
          updatedAt: nowISO()
        },
        ...prev.projects
      ]
    }));
  });

  views.projects.querySelectorAll("[data-project-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.projectDelete;
      store.setState((prev) => ({
        ...prev,
        projects: prev.projects.filter((item) => item.id !== id)
      }));
    });
  });

  views.projects.querySelectorAll("[data-project-status]").forEach((select) => {
    select.addEventListener("change", () => {
      const id = select.dataset.projectStatus;
      store.setState((prev) => ({
        ...prev,
        projects: prev.projects.map((project) =>
          project.id === id
            ? { ...project, status: select.value, updatedAt: nowISO() }
            : project
        )
      }));
    });
  });
}

function renderKanban(state) {
  views.kanban.innerHTML = `
    <div class="page-header">
      <h2>Kanban</h2>
      <p>Organize tarefas em colunas e mova entre estágios.</p>
    </div>
    <div class="card" style="margin-bottom: 16px">
      <div class="actions">
        <input id="new-column-title" placeholder="Nome da nova coluna" style="max-width: 260px" />
        <button class="secondary" id="add-column-btn">+ Nova coluna</button>
      </div>
    </div>
    <div class="kanban">
      ${state.kanban.columns
        .map((column, columnIndex) => {
          const cards = column.cardIds
            .map((cardId) => state.kanban.cards[cardId])
            .filter(Boolean);

          return `
            <article class="kanban-column">
              <h3>${column.title} <span class="badge muted" style="font-size: 0.7rem">${cards.length}</span></h3>
              <div class="actions" style="margin-bottom: 10px">
                <input data-new-card-title="${column.id}" placeholder="Título do card" />
                <button class="secondary" data-add-card="${column.id}">+</button>
              </div>
              <div>
                ${cards.length === 0 ? `<p class="muted" style="text-align: center; font-size: 0.82rem; padding: 12px 0">Vazio</p>` : cards
                  .map(
                    (card) => `
                    <div class="kanban-card">
                      <strong style="font-size: 0.9rem">${card.title}</strong>
                      ${card.description ? `<p class="muted" style="font-size: 0.82rem; margin-top: 4px">${card.description}</p>` : ""}
                      <div class="actions" style="margin-top: 8px">
                        <button class="ghost" data-move-left="${card.id}" ${
                      columnIndex === 0 ? "disabled" : ""
                    }>← Mover</button>
                        <button class="ghost" data-move-right="${card.id}" ${
                      columnIndex === state.kanban.columns.length - 1
                        ? "disabled"
                        : ""
                    }>Mover →</button>
                        <button class="ghost" style="color: var(--danger)" data-delete-card="${card.id}">Excluir</button>
                      </div>
                    </div>
                  `
                  )
                  .join("")}
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  views.kanban.querySelector("#add-column-btn").addEventListener("click", () => {
    const input = views.kanban.querySelector("#new-column-title");
    const title = input.value.trim();
    if (!title) return;

    store.setState((prev) => ({
      ...prev,
      kanban: {
        ...prev.kanban,
        columns: [...prev.kanban.columns, { id: uid("col"), title, cardIds: [] }]
      }
    }));
    input.value = "";
  });

  views.kanban.querySelectorAll("[data-add-card]").forEach((button) => {
    button.addEventListener("click", () => {
      const columnId = button.dataset.addCard;
      const input = views.kanban.querySelector(
        `[data-new-card-title=\"${columnId}\"]`
      );
      const title = input.value.trim();
      if (!title) return;

      const cardId = uid("card");

      store.setState((prev) => ({
        ...prev,
        kanban: {
          cards: {
            ...prev.kanban.cards,
            [cardId]: {
              id: cardId,
              title,
              description: "",
              updatedAt: nowISO()
            }
          },
          columns: prev.kanban.columns.map((column) =>
            column.id === columnId
              ? { ...column, cardIds: [...column.cardIds, cardId] }
              : column
          )
        }
      }));
      input.value = "";
    });
  });

  views.kanban.querySelectorAll("[data-delete-card]").forEach((button) => {
    button.addEventListener("click", () => {
      const cardId = button.dataset.deleteCard;

      store.setState((prev) => {
        const cards = { ...prev.kanban.cards };
        delete cards[cardId];

        return {
          ...prev,
          kanban: {
            cards,
            columns: prev.kanban.columns.map((column) => ({
              ...column,
              cardIds: column.cardIds.filter((id) => id !== cardId)
            }))
          }
        };
      });
    });
  });

  views.kanban.querySelectorAll("[data-move-left], [data-move-right]").forEach((button) => {
    button.addEventListener("click", () => {
      const cardId = button.dataset.moveLeft || button.dataset.moveRight;
      const direction = button.dataset.moveLeft ? -1 : 1;

      store.setState((prev) => {
        const columns = prev.kanban.columns.map((column) => ({ ...column, cardIds: [...column.cardIds] }));

        const sourceIndex = columns.findIndex((column) => column.cardIds.includes(cardId));
        if (sourceIndex < 0) return prev;

        const targetIndex = sourceIndex + direction;
        if (targetIndex < 0 || targetIndex >= columns.length) return prev;

        columns[sourceIndex].cardIds = columns[sourceIndex].cardIds.filter((id) => id !== cardId);
        columns[targetIndex].cardIds.push(cardId);

        return {
          ...prev,
          kanban: {
            ...prev.kanban,
            columns
          }
        };
      });
    });
  });
}

function renderWriting(state) {
  const selectedDocId =
    state.writing.selectedDocId || state.writing.docs[0]?.id || null;
  const selected = state.writing.docs.find((doc) => doc.id === selectedDocId);

  const kindBadge = (kind) => {
    const map = { roteiro: "accent", artigo: "warning", nota: "success", texto: "muted" };
    return `<span class="badge ${map[kind] || "muted"}">${kind}</span>`;
  };

  views.writing.innerHTML = `
    <div class="page-header">
      <h2>Escrita</h2>
      <p>Roteiros, artigos, notas e textos num só editor.</p>
    </div>
    <div class="grid two">
      <article class="card">
        <div class="card-header">
          <h3>Documentos</h3>
          <button class="primary" id="new-doc-btn" style="padding: 6px 14px; font-size: 0.82rem">+ Novo</button>
        </div>
        ${state.writing.docs.length === 0 ? `
          <div class="empty-state">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <p>Crie seu primeiro documento.</p>
          </div>
        ` : `
          <div class="list">
            ${state.writing.docs
              .map(
                (doc) => `
                <button class="list-item ${
                  doc.id === selectedDocId ? "active" : ""
                }" data-doc-open="${doc.id}">
                  <div style="display: flex; justify-content: space-between; align-items: center">
                    <strong style="font-size: 0.9rem">${doc.title}</strong>
                    ${kindBadge(doc.kind)}
                  </div>
                  <p class="muted" style="font-size: 0.8rem; margin-top: 4px">${new Date(
                    doc.updatedAt
                  ).toLocaleDateString("pt-BR")}</p>
                </button>
              `
              )
              .join("")}
          </div>
        `}
      </article>
      <article class="card">
        <div class="card-header"><h3>Editor</h3></div>
        <div style="display: flex; flex-direction: column; gap: 12px">
          <div>
            <label>Título</label>
            <input id="doc-title" value="${selected?.title || ""}" placeholder="Título do documento" />
          </div>
          <div>
            <label>Tipo</label>
            <select id="doc-kind">
              ${["roteiro", "artigo", "nota", "texto"]
                .map(
                  (kind) =>
                    `<option ${selected?.kind === kind ? "selected" : ""}>${kind}</option>`
                )
                .join("")}
            </select>
          </div>
          <div>
            <label>Conteúdo</label>
            <textarea id="doc-content" placeholder="Escreva aqui..." style="min-height: 180px">${
              selected?.content || ""
            }</textarea>
          </div>
          <div class="actions">
            <button class="primary" id="save-doc-btn">Salvar</button>
            <button class="danger" id="delete-doc-btn" ${
              selected ? "" : "disabled"
            }>Excluir</button>
          </div>
        </div>
      </article>
    </div>
  `;

  views.writing.querySelector("#new-doc-btn").addEventListener("click", () => {
    const newId = uid("doc");

    store.setState((prev) => ({
      ...prev,
      writing: {
        selectedDocId: newId,
        docs: [
          {
            id: newId,
            title: "Novo documento",
            kind: "nota",
            content: "",
            updatedAt: nowISO()
          },
          ...prev.writing.docs
        ]
      }
    }));
  });

  views.writing.querySelectorAll("[data-doc-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.docOpen;
      store.setState((prev) => ({
        ...prev,
        writing: {
          ...prev.writing,
          selectedDocId: id
        }
      }));
    });
  });

  views.writing.querySelector("#save-doc-btn").addEventListener("click", () => {
    const title = views.writing.querySelector("#doc-title").value.trim();
    const kind = views.writing.querySelector("#doc-kind").value;
    const content = views.writing.querySelector("#doc-content").value;

    if (!selectedDocId) return;

    store.setState((prev) => ({
      ...prev,
      writing: {
        ...prev.writing,
        docs: prev.writing.docs.map((doc) =>
          doc.id === selectedDocId
            ? {
                ...doc,
                title: title || "Sem título",
                kind,
                content,
                updatedAt: nowISO()
              }
            : doc
        )
      }
    }));
  });

  views.writing.querySelector("#delete-doc-btn").addEventListener("click", () => {
    if (!selectedDocId) return;

    store.setState((prev) => {
      const docs = prev.writing.docs.filter((doc) => doc.id !== selectedDocId);
      return {
        ...prev,
        writing: {
          docs,
          selectedDocId: docs[0]?.id ?? null
        }
      };
    });
  });
}

function renderBrainstorm(state) {
  views.brainstorm.innerHTML = `
    <div class="page-header">
      <h2>Brainstorm</h2>
      <p>Registre e priorize ideias por votação.</p>
    </div>
    <div class="grid two">
      <article class="card">
        <div class="card-header"><h3>Nova ideia</h3></div>
        <div style="display: flex; flex-direction: column; gap: 12px">
          <div>
            <label>Título</label>
            <input id="idea-title" placeholder="Ex: Série de vídeos curtos" />
          </div>
          <div>
            <label>Descrição</label>
            <textarea id="idea-content" placeholder="Detalhe a ideia" style="min-height: 80px"></textarea>
          </div>
          <div class="actions">
            <button class="primary" id="add-idea-btn">Adicionar ideia</button>
          </div>
        </div>
      </article>
      <article class="card">
        <div class="card-header">
          <h3>Backlog de ideias</h3>
          <span class="badge muted">${state.brainstorm.ideas.length}</span>
        </div>
        ${state.brainstorm.ideas.length === 0 ? `
          <div class="empty-state">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            <p>Adicione sua primeira ideia.</p>
          </div>
        ` : `
          <div class="list">
            ${state.brainstorm.ideas
              .map(
                (idea) => `
                <div class="list-item">
                  <div style="display: flex; justify-content: space-between; align-items: start">
                    <strong style="font-size: 0.9rem">${idea.title}</strong>
                    <span class="badge ${idea.votes > 0 ? "accent" : "muted"}">▲ ${idea.votes}</span>
                  </div>
                  ${idea.content ? `<p class="muted" style="font-size: 0.82rem; margin-top: 4px">${idea.content}</p>` : ""}
                  <div class="actions" style="margin-top: 8px">
                    <button class="ghost" data-idea-vote-up="${idea.id}">▲ Votar</button>
                    <button class="ghost" data-idea-vote-down="${idea.id}">▼</button>
                    <button class="ghost" style="color: var(--danger)" data-idea-delete="${idea.id}">Excluir</button>
                  </div>
                </div>
              `
              )
              .join("")}
          </div>
        `}
      </article>
    </div>
  `;

  views.brainstorm.querySelector("#add-idea-btn").addEventListener("click", () => {
    const title = views.brainstorm.querySelector("#idea-title").value.trim();
    const content = views.brainstorm.querySelector("#idea-content").value.trim();
    if (!title) return;

    store.setState((prev) => ({
      ...prev,
      brainstorm: {
        ideas: [
          {
            id: uid("idea"),
            title,
            content,
            votes: 0,
            updatedAt: nowISO()
          },
          ...prev.brainstorm.ideas
        ]
      }
    }));
  });

  views.brainstorm.querySelectorAll("[data-idea-vote-up]").forEach((button) => {
    button.addEventListener("click", () => changeIdeaVote(button.dataset.ideaVoteUp, 1));
  });

  views.brainstorm.querySelectorAll("[data-idea-vote-down]").forEach((button) => {
    button.addEventListener("click", () => changeIdeaVote(button.dataset.ideaVoteDown, -1));
  });

  views.brainstorm.querySelectorAll("[data-idea-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.ideaDelete;
      store.setState((prev) => ({
        ...prev,
        brainstorm: {
          ideas: prev.brainstorm.ideas.filter((idea) => idea.id !== id)
        }
      }));
    });
  });
}

function changeIdeaVote(ideaId, amount) {
  store.setState((prev) => ({
    ...prev,
    brainstorm: {
      ideas: prev.brainstorm.ideas.map((idea) =>
        idea.id === ideaId
          ? { ...idea, votes: Math.max(0, idea.votes + amount), updatedAt: nowISO() }
          : idea
      )
    }
  }));
}

function renderMindmap(state) {
  const options = state.mindmap.nodes
    .map((node) => `<option value="${node.id}">${node.label}</option>`)
    .join("");

  views.mindmap.innerHTML = `
    <div class="page-header">
      <h2>Mapa Mental</h2>
      <p>Organize temas em árvore hierárquica.</p>
    </div>
    <div class="grid two">
      <article class="card">
        <div class="card-header"><h3>Novo nó</h3></div>
        <div style="display: flex; flex-direction: column; gap: 12px">
          <div>
            <label>Rótulo</label>
            <input id="node-label" placeholder="Ex: Ângulo de conteúdo" />
          </div>
          <div>
            <label>Nó pai</label>
            <select id="node-parent">
              <option value="">Sem pai (novo tema raiz)</option>
              ${options}
            </select>
          </div>
          <div class="actions">
            <button class="primary" id="add-node-btn">Adicionar nó</button>
          </div>
        </div>
      </article>
      <article class="card">
        <div class="card-header">
          <h3>Estrutura</h3>
          <span class="badge muted">${state.mindmap.nodes.length} nós</span>
        </div>
        <div class="tree">
          ${renderMindTree(state.mindmap.nodes, null)}
        </div>
      </article>
    </div>
  `;

  views.mindmap.querySelector("#add-node-btn").addEventListener("click", () => {
    const label = views.mindmap.querySelector("#node-label").value.trim();
    const parentId = views.mindmap.querySelector("#node-parent").value || null;

    if (!label) return;

    store.setState((prev) => ({
      ...prev,
      mindmap: {
        nodes: [...prev.mindmap.nodes, { id: uid("node"), label, parentId }]
      }
    }));
  });

  views.mindmap.querySelectorAll("[data-node-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const nodeId = button.dataset.nodeDelete;
      if (nodeId === "root") return;

      store.setState((prev) => {
        const idsToRemove = collectChildren(prev.mindmap.nodes, nodeId);
        idsToRemove.add(nodeId);

        return {
          ...prev,
          mindmap: {
            nodes: prev.mindmap.nodes.filter((node) => !idsToRemove.has(node.id))
          }
        };
      });
    });
  });
}

function collectChildren(nodes, parentId, buffer = new Set()) {
  nodes.forEach((node) => {
    if (node.parentId === parentId) {
      buffer.add(node.id);
      collectChildren(nodes, node.id, buffer);
    }
  });

  return buffer;
}

function renderMindTree(nodes, parentId) {
  const children = nodes.filter((node) => node.parentId === parentId);
  if (!children.length) return "";

  return children
    .map(
      (node) => `
      <div class="tree-node">
        <strong>${node.label}</strong>
        ${node.id !== "root" ? `<button class="danger" data-node-delete="${node.id}">x</button>` : ""}
        ${renderMindTree(nodes, node.id)}
      </div>
    `
    )
    .join("");
}

function renderWhiteboard(state) {
  views.whiteboard.innerHTML = `
    <div class="page-header">
      <h2>Whiteboard</h2>
      <p>Desenhe livremente para rascunhos e fluxos visuais.</p>
    </div>
    <article class="card">
      <div class="actions" style="margin-bottom: 12px">
        <label style="margin-bottom: 0; display: flex; align-items: center; gap: 8px">
          Cor
          <input type="color" id="brush-color" value="#1a1a1a" style="width: 36px; height: 36px; padding: 2px; cursor: pointer" />
        </label>
        <label style="margin-bottom: 0; display: flex; align-items: center; gap: 8px">
          Tamanho
          <input type="range" id="brush-size" min="1" max="12" value="3" style="width: 100px" />
        </label>
        <button class="secondary" id="clear-board-btn">Limpar quadro</button>
      </div>
      <div class="canvas-wrap">
        <canvas id="whiteboard-canvas"></canvas>
      </div>
    </article>
  `;

  setupCanvas(state.whiteboard.strokes);

  views.whiteboard.querySelector("#clear-board-btn").addEventListener("click", () => {
    store.setState((prev) => ({
      ...prev,
      whiteboard: {
        strokes: []
      }
    }));
  });
}

function setupCanvas(strokes) {
  const canvas = views.whiteboard.querySelector("#whiteboard-canvas");
  const colorInput = views.whiteboard.querySelector("#brush-color");
  const sizeInput = views.whiteboard.querySelector("#brush-size");

  const context = canvas.getContext("2d");

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = 520;
    redraw();
  }

  function redraw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";

    strokes.forEach((stroke) => {
      if (!stroke.points.length) return;
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.size;
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i += 1) {
        context.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      context.stroke();
    });
  }

  let drawing = false;
  let currentStroke = null;

  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    currentStroke = {
      color: colorInput.value,
      size: Number(sizeInput.value),
      points: [{ x: event.offsetX, y: event.offsetY }]
    };

    strokes.push(currentStroke);
    redraw();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!drawing || !currentStroke) return;
    currentStroke.points.push({ x: event.offsetX, y: event.offsetY });
    redraw();
  });

  canvas.addEventListener("pointerup", () => {
    drawing = false;
    currentStroke = null;

    store.setState((prev) => ({
      ...prev,
      whiteboard: {
        strokes: [...strokes]
      }
    }));
  });

  canvas.addEventListener("pointerleave", () => {
    drawing = false;
    currentStroke = null;
  });

  resize();
  window.addEventListener("resize", resize, { once: true });
}

