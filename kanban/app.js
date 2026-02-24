/*
  App Kanban Local
  - Armazenamento: localForage (IndexedDB)
  - Arrastar e soltar: SortableJS
  - Estrutura simples e legível
*/

const STORAGE_KEY = "kanban_state_v1";

const store = localforage.createInstance({
  name: "artigos-kanban",
  storeName: "kanban_app"
});

const state = {
  projects: [],
  boards: [],
  columns: [],
  cards: [],
  attachments: [],
  selectedProjectId: "all",
  selectedBoardId: null,
  editingCardId: null
};

const dom = {
  projectFilter: document.querySelector("#project-filter"),
  boardSelect: document.querySelector("#board-select"),
  boardMeta: document.querySelector("#board-meta"),
  newBoardBtn: document.querySelector("#new-board-btn"),
  newProjectBtn: document.querySelector("#new-project-btn"),
  addColumnBtn: document.querySelector("#add-column-btn"),
  columnsContainer: document.querySelector("#columns-container"),

  exportBtn: document.querySelector("#export-btn"),
  importBtn: document.querySelector("#import-btn"),
  importFile: document.querySelector("#import-file"),

  modal: document.querySelector("#card-modal"),
  closeModalBtn: document.querySelector("#close-modal-btn"),
  modalTitleInput: document.querySelector("#card-title-input"),
  modalDescription: document.querySelector("#card-description"),
  saveCardBtn: document.querySelector("#save-card-btn"),
  deleteCardBtn: document.querySelector("#delete-card-btn"),
  checklistInput: document.querySelector("#checklist-input"),
  addChecklistBtn: document.querySelector("#add-checklist-btn"),
  checklistList: document.querySelector("#checklist-list"),
  addAttachmentBtn: document.querySelector("#add-attachment-btn"),
  attachmentFileInput: document.querySelector("#attachment-file-input"),
  attachmentList: document.querySelector("#attachment-list"),

  uiDialog: document.querySelector("#ui-dialog"),
  uiDialogTitle: document.querySelector("#ui-dialog-title"),
  uiDialogMessage: document.querySelector("#ui-dialog-message"),
  uiDialogInputWrap: document.querySelector("#ui-dialog-input-wrap"),
  uiDialogLabel: document.querySelector("#ui-dialog-label"),
  uiDialogInput: document.querySelector("#ui-dialog-input"),
  uiDialogCloseBtn: document.querySelector("#ui-dialog-close-btn"),
  uiDialogCancelBtn: document.querySelector("#ui-dialog-cancel-btn"),
  uiDialogConfirmBtn: document.querySelector("#ui-dialog-confirm-btn"),
  toastContainer: document.querySelector("#toast-container")
};

let sortableColumns = null;
const sortableCardLists = [];
const attachmentPreviewUrls = [];
let dialogResolver = null;
let dialogMode = null;

function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function fmtDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR");
}

function mostrarToast(mensagem, tipo = "normal") {
  const item = document.createElement("div");
  item.className = `toast ${tipo}`;
  item.textContent = mensagem;
  dom.toastContainer.appendChild(item);

  setTimeout(() => {
    item.remove();
  }, 2600);
}

function fecharDialogoInterno(resultado = null) {
  if (dialogResolver) {
    dialogResolver(resultado);
    dialogResolver = null;
  }

  dialogMode = null;
  dom.uiDialog.classList.add("hidden");
  dom.uiDialog.setAttribute("aria-hidden", "true");
}

function abrirDialogoTexto({ titulo, label, valorInicial = "", placeholder = "", botaoConfirmar = "Confirmar" }) {
  return new Promise((resolve) => {
    dialogResolver = resolve;
    dialogMode = "texto";

    dom.uiDialogTitle.textContent = titulo;
    dom.uiDialogMessage.textContent = "";
    dom.uiDialogInputWrap.classList.remove("hidden");
    dom.uiDialogLabel.textContent = label;
    dom.uiDialogInput.value = valorInicial;
    dom.uiDialogInput.placeholder = placeholder;
    dom.uiDialogConfirmBtn.textContent = botaoConfirmar;
    dom.uiDialogConfirmBtn.classList.remove("danger");
    dom.uiDialogConfirmBtn.classList.add("primary");

    dom.uiDialog.classList.remove("hidden");
    dom.uiDialog.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      dom.uiDialogInput.focus();
      dom.uiDialogInput.select();
    }, 0);
  });
}

function abrirDialogoConfirmacao({ titulo, mensagem, botaoConfirmar = "Excluir" }) {
  return new Promise((resolve) => {
    dialogResolver = resolve;
    dialogMode = "confirmacao";

    dom.uiDialogTitle.textContent = titulo;
    dom.uiDialogMessage.textContent = mensagem;
    dom.uiDialogInputWrap.classList.add("hidden");
    dom.uiDialogConfirmBtn.textContent = botaoConfirmar;
    dom.uiDialogConfirmBtn.classList.remove("primary");
    dom.uiDialogConfirmBtn.classList.add("danger");

    dom.uiDialog.classList.remove("hidden");
    dom.uiDialog.setAttribute("aria-hidden", "false");
  });
}

function clearAttachmentPreviewUrls() {
  while (attachmentPreviewUrls.length) {
    URL.revokeObjectURL(attachmentPreviewUrls.pop());
  }
}

function sanitizeHtml(inputHtml) {
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = inputHtml || "";

  doc.querySelectorAll("script, style, iframe, object, embed").forEach((node) => {
    node.remove();
  });

  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      const attrValue = (attr.value || "").toLowerCase().trim();

      if (attrName.startsWith("on")) {
        el.removeAttribute(attr.name);
      }

      if ((attrName === "href" || attrName === "src") && attrValue.startsWith("javascript:")) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}

function insertHtmlAtCursor(html) {
  const safeHtml = sanitizeHtml(html);
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    dom.modalDescription.innerHTML += safeHtml;
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const template = document.createElement("template");
  template.innerHTML = safeHtml;
  const fragment = template.content;
  range.insertNode(fragment);
  range.collapse(false);
}

function normalizeState(raw) {
  const normalized = {
    projects: Array.isArray(raw?.projects) ? raw.projects : [],
    boards: Array.isArray(raw?.boards) ? raw.boards : [],
    columns: Array.isArray(raw?.columns) ? raw.columns : [],
    cards: Array.isArray(raw?.cards) ? raw.cards : [],
    attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
    selectedProjectId: raw?.selectedProjectId || "all",
    selectedBoardId: raw?.selectedBoardId || null,
    editingCardId: null
  };

  if (!normalized.projects.length) {
    const projectId = createId("project");
    normalized.projects.push({ id: projectId, name: "Geral", color: "#4f6ef7" });
  }

  if (!normalized.boards.length) {
    const boardId = createId("board");
    normalized.boards.push({
      id: boardId,
      name: "Quadro principal",
      projectId: normalized.projects[0].id,
      columnOrder: []
    });
    normalized.selectedBoardId = boardId;
  }

  if (!normalized.selectedBoardId || !normalized.boards.some((board) => board.id === normalized.selectedBoardId)) {
    normalized.selectedBoardId = normalized.boards[0]?.id || null;
  }

  return normalized;
}

async function loadState() {
  try {
    const raw = await store.getItem(STORAGE_KEY);
    const loaded = normalizeState(raw || {});
    Object.assign(state, loaded);
  } catch (error) {
    console.error("Falha ao carregar estado:", error);
    Object.assign(state, normalizeState({}));
  }
}

async function saveState() {
  try {
    const payload = {
      projects: state.projects,
      boards: state.boards,
      columns: state.columns,
      cards: state.cards,
      attachments: state.attachments,
      selectedProjectId: state.selectedProjectId,
      selectedBoardId: state.selectedBoardId
    };

    await store.setItem(STORAGE_KEY, payload);
  } catch (error) {
    console.error("Falha ao salvar estado:", error);
    mostrarToast("Não foi possível salvar no IndexedDB.", "erro");
  }
}

function getBoard(boardId = state.selectedBoardId) {
  return state.boards.find((item) => item.id === boardId) || null;
}

function getColumnsForBoard(boardId = state.selectedBoardId) {
  const board = getBoard(boardId);
  if (!board) return [];

  const byId = new Map(state.columns.filter((col) => col.boardId === board.id).map((col) => [col.id, col]));
  return board.columnOrder.map((columnId) => byId.get(columnId)).filter(Boolean);
}

function getCardsForColumn(columnId) {
  const column = state.columns.find((item) => item.id === columnId);
  if (!column) return [];

  const byId = new Map(state.cards.filter((card) => card.columnId === columnId).map((card) => [card.id, card]));
  return column.cardOrder.map((cardId) => byId.get(cardId)).filter(Boolean);
}

function getAttachmentById(attId) {
  return state.attachments.find((item) => item.id === attId) || null;
}

function activeBoards() {
  if (state.selectedProjectId === "all") return state.boards;
  return state.boards.filter((board) => board.projectId === state.selectedProjectId);
}

function renderProjectFilter() {
  const options = [
    `<option value="all" ${state.selectedProjectId === "all" ? "selected" : ""}>Todos os projetos</option>`,
    ...state.projects.map(
      (project) =>
        `<option value="${project.id}" ${state.selectedProjectId === project.id ? "selected" : ""}>${project.name}</option>`
    )
  ];

  dom.projectFilter.innerHTML = options.join("");
}

function renderBoardSelector() {
  const boards = activeBoards();

  if (!boards.length) {
    dom.boardSelect.innerHTML = "";
    state.selectedBoardId = null;
    return;
  }

  if (!boards.some((board) => board.id === state.selectedBoardId)) {
    state.selectedBoardId = boards[0].id;
  }

  dom.boardSelect.innerHTML = boards
    .map((board) => `<option value="${board.id}" ${board.id === state.selectedBoardId ? "selected" : ""}>${board.name}</option>`)
    .join("");
}

function renderBoardMeta() {
  const board = getBoard();
  if (!board) {
    dom.boardMeta.textContent = "Nenhum quadro selecionado";
    return;
  }

  const project = state.projects.find((item) => item.id === board.projectId);
  dom.boardMeta.textContent = `${project?.name || "Sem projeto"} • Atualizado em ${fmtDate(new Date().toISOString())}`;
}

function renderColumns() {
  const board = getBoard();
  if (!board) {
    dom.columnsContainer.innerHTML = `<article class="empty-board">Nenhum quadro. Crie um em “Novo quadro”.</article>`;
    bindSortables();
    return;
  }

  const columns = getColumnsForBoard(board.id);

  if (!columns.length) {
    dom.columnsContainer.innerHTML = `<article class="empty-board">Nenhuma coluna ainda. Clique em “Adicionar coluna”.</article>`;
    bindSortables();
    return;
  }

  dom.columnsContainer.innerHTML = columns
    .map((column) => {
      const cards = getCardsForColumn(column.id);
      return `
        <article class="column" data-column-id="${column.id}">
          <header class="column-header">
            <h3 class="column-title">${column.title}</h3>
            <div class="column-actions">
              <button class="btn ghost" data-action="rename-column" data-column-id="${column.id}">Renomear</button>
              <button class="btn ghost" data-action="delete-column" data-column-id="${column.id}">Excluir</button>
            </div>
          </header>
          <div class="card-list" data-column-id="${column.id}">
            ${cards
              .map((card) => {
                const doneCount = card.checklist.filter((item) => item.done).length;
                const checklistText = card.checklist.length
                  ? `${doneCount}/${card.checklist.length} checklist`
                  : "Sem checklist";
                const attachmentText = card.attachments.length
                  ? `${card.attachments.length} anexo(s)`
                  : "Sem anexos";

                return `
                  <article class="card" data-card-id="${card.id}" data-action="open-card">
                    <h4>${card.title}</h4>
                    <div class="card-meta">
                      <span>${checklistText}</span>
                      <span>${attachmentText}</span>
                    </div>
                  </article>
                `;
              })
              .join("")}
          </div>
          <footer class="column-footer">
            <button class="btn secondary" data-action="add-card" data-column-id="${column.id}">+ Adicionar card</button>
          </footer>
        </article>
      `;
    })
    .join("");

  bindSortables();
}

function atualizarSugestaoColunasPadrao() {
  const quadro = getBoard();
  if (!quadro) {
    dom.addColumnBtn.classList.remove("show-default-hint");
    return;
  }

  const colunas = getColumnsForBoard(quadro.id);
  const semColunas = colunas.length === 0;

  if (semColunas) {
    dom.addColumnBtn.classList.add("show-default-hint");
    return;
  }

  dom.addColumnBtn.classList.remove("show-default-hint");
}

function renderAll() {
  renderProjectFilter();
  renderBoardSelector();
  renderBoardMeta();
  renderColumns();
  atualizarSugestaoColunasPadrao();
}

async function addProject() {
  const name = await abrirDialogoTexto({
    titulo: "Novo projeto",
    label: "Nome do projeto",
    placeholder: "Ex: Conteúdo 2026",
    botaoConfirmar: "Criar"
  });
  if (!name || !name.trim()) return;

  const color =
    (await abrirDialogoTexto({
      titulo: "Cor do projeto",
      label: "Cor em hexadecimal (opcional)",
      valorInicial: "#4f6ef7",
      placeholder: "#4f6ef7",
      botaoConfirmar: "Salvar"
    })) || "#4f6ef7";

  state.projects.push({
    id: createId("project"),
    name: name.trim(),
    color,
  });

  saveState();
  renderAll();
}

async function addBoard() {
  const name = await abrirDialogoTexto({
    titulo: "Novo quadro",
    label: "Nome do quadro",
    placeholder: "Ex: Planejamento Semanal",
    botaoConfirmar: "Criar"
  });
  if (!name || !name.trim()) return;

  const possibleProjectId =
    state.selectedProjectId !== "all" ? state.selectedProjectId : state.projects[0]?.id;

  if (!possibleProjectId) {
    mostrarToast("Crie um projeto primeiro.", "erro");
    return;
  }

  const boardId = createId("board");
  state.boards.push({
    id: boardId,
    name: name.trim(),
    projectId: possibleProjectId,
    columnOrder: []
  });

  state.selectedBoardId = boardId;
  saveState();
  renderAll();
}

async function addColumn() {
  const board = getBoard();
  if (!board) return;

  const title = await abrirDialogoTexto({
    titulo: "Nova coluna",
    label: "Título da coluna",
    placeholder: "Ex: Backlog",
    botaoConfirmar: "Adicionar"
  });
  if (!title || !title.trim()) return;

  const columnId = createId("column");
  state.columns.push({
    id: columnId,
    boardId: board.id,
    title: title.trim(),
    cardOrder: []
  });

  board.columnOrder.push(columnId);
  saveState();
  renderAll();
}

async function renameColumn(columnId) {
  const column = state.columns.find((item) => item.id === columnId);
  if (!column) return;

  const nextTitle = await abrirDialogoTexto({
    titulo: "Renomear coluna",
    label: "Novo título",
    valorInicial: column.title,
    botaoConfirmar: "Salvar"
  });
  if (!nextTitle || !nextTitle.trim()) return;

  column.title = nextTitle.trim();
  saveState();
  renderAll();
}

async function deleteColumn(columnId) {
  const column = state.columns.find((item) => item.id === columnId);
  if (!column) return;

  const confirmar = await abrirDialogoConfirmacao({
    titulo: "Excluir coluna",
    mensagem: `Deseja excluir a coluna “${column.title}” e todos os cards?`,
    botaoConfirmar: "Excluir"
  });
  if (!confirmar) return;

  const cardIds = [...column.cardOrder];

  state.columns = state.columns.filter((item) => item.id !== columnId);
  state.cards = state.cards.filter((card) => !cardIds.includes(card.id));
  state.attachments = state.attachments.filter((att) => !cardIds.includes(att.cardId));

  state.boards = state.boards.map((board) => {
    if (board.id !== column.boardId) return board;
    return {
      ...board,
      columnOrder: board.columnOrder.filter((id) => id !== columnId)
    };
  });

  if (state.editingCardId && cardIds.includes(state.editingCardId)) {
    closeCardModal();
  }

  saveState();
  renderAll();
}

async function addCard(columnId) {
  const column = state.columns.find((item) => item.id === columnId);
  if (!column) return;

  const title = await abrirDialogoTexto({
    titulo: "Novo card",
    label: "Título do card",
    placeholder: "Ex: Revisar artigo",
    botaoConfirmar: "Criar"
  });
  if (!title || !title.trim()) return;

  const cardId = createId("card");
  const createdAt = nowISO();

  state.cards.push({
    id: cardId,
    columnId,
    title: title.trim(),
    descriptionHtml: "",
    checklist: [],
    attachments: [],
    createdAt,
    updatedAt: createdAt
  });

  column.cardOrder.push(cardId);
  saveState();
  renderAll();
}

function openCardModal(cardId) {
  const card = state.cards.find((item) => item.id === cardId);
  if (!card) return;

  state.editingCardId = cardId;
  dom.modalTitleInput.value = card.title;
  dom.modalDescription.innerHTML = card.descriptionHtml || "";

  renderChecklist(card);
  renderAttachments(card);

  dom.modal.classList.remove("hidden");
  dom.modal.setAttribute("aria-hidden", "false");
}

function closeCardModal() {
  state.editingCardId = null;
  dom.modal.classList.add("hidden");
  dom.modal.setAttribute("aria-hidden", "true");
  clearAttachmentPreviewUrls();
}

function renderChecklist(card) {
  dom.checklistList.innerHTML = card.checklist
    .map(
      (item) => `
      <li class="checklist-item" data-check-item-id="${item.id}">
        <div class="checklist-left">
          <input type="checkbox" data-action="toggle-check-item" data-check-item-id="${item.id}" ${
        item.done ? "checked" : ""
      } />
          <span class="${item.done ? "checklist-done" : ""}">${item.text}</span>
        </div>
        <button class="btn ghost" data-action="delete-check-item" data-check-item-id="${item.id}">Excluir</button>
      </li>
    `
    )
    .join("");
}

function renderAttachments(card) {
  clearAttachmentPreviewUrls();

  const attachments = card.attachments
    .map((attId) => getAttachmentById(attId))
    .filter(Boolean);

  if (!attachments.length) {
    dom.attachmentList.innerHTML = `<li class="muted">Sem anexos</li>`;
    return;
  }

  dom.attachmentList.innerHTML = attachments
    .map((att) => {
      let previewHtml = "";

      if (att.mime?.startsWith("image/") && att.blob) {
        const previewUrl = URL.createObjectURL(att.blob);
        attachmentPreviewUrls.push(previewUrl);
        previewHtml = `<img src="${previewUrl}" alt="${att.name}" class="attachment-preview" />`;
      }

      return `
        <li class="attachment-item" data-attachment-id="${att.id}">
          ${previewHtml}
          <span class="attachment-name">${att.name}</span>
          <button class="btn ghost" data-action="delete-attachment" data-attachment-id="${att.id}">Excluir</button>
        </li>
      `;
    })
    .join("");
}

function saveCardFromModal() {
  const card = state.cards.find((item) => item.id === state.editingCardId);
  if (!card) return;

  const title = dom.modalTitleInput.value.trim();
  if (!title) {
    mostrarToast("O título é obrigatório.", "erro");
    return;
  }

  card.title = title;
  card.descriptionHtml = sanitizeHtml(dom.modalDescription.innerHTML);
  card.updatedAt = nowISO();

  saveState();
  renderAll();
  closeCardModal();
}

async function deleteCard(cardId) {
  const card = state.cards.find((item) => item.id === cardId);
  if (!card) return;

  const confirmar = await abrirDialogoConfirmacao({
    titulo: "Excluir card",
    mensagem: "Deseja excluir este card?",
    botaoConfirmar: "Excluir"
  });
  if (!confirmar) return;

  state.cards = state.cards.filter((item) => item.id !== cardId);
  state.attachments = state.attachments.filter((att) => att.cardId !== cardId);

  const column = state.columns.find((item) => item.id === card.columnId);
  if (column) {
    column.cardOrder = column.cardOrder.filter((id) => id !== cardId);
  }

  saveState();
  renderAll();
  closeCardModal();
}

function addChecklistItem() {
  const card = state.cards.find((item) => item.id === state.editingCardId);
  if (!card) return;

  const text = dom.checklistInput.value.trim();
  if (!text) return;

  card.checklist.push({ id: createId("check"), text, done: false });
  card.updatedAt = nowISO();
  dom.checklistInput.value = "";

  saveState();
  renderChecklist(card);
  renderAll();
}

function toggleChecklistItem(checkItemId) {
  const card = state.cards.find((item) => item.id === state.editingCardId);
  if (!card) return;

  const item = card.checklist.find((entry) => entry.id === checkItemId);
  if (!item) return;

  item.done = !item.done;
  card.updatedAt = nowISO();

  saveState();
  renderChecklist(card);
  renderAll();
}

function deleteChecklistItem(checkItemId) {
  const card = state.cards.find((item) => item.id === state.editingCardId);
  if (!card) return;

  card.checklist = card.checklist.filter((entry) => entry.id !== checkItemId);
  card.updatedAt = nowISO();

  saveState();
  renderChecklist(card);
  renderAll();
}

async function attachFilesToEditingCard(fileList) {
  const card = state.cards.find((item) => item.id === state.editingCardId);
  if (!card) return;

  const files = [...fileList];
  if (!files.length) return;

  try {
    for (const file of files) {
      const attachmentId = createId("att");
      state.attachments.push({
        id: attachmentId,
        cardId: card.id,
        name: file.name || "arquivo-da-area-de-transferencia",
        mime: file.type || "application/octet-stream",
        blob: file,
        createdAt: nowISO()
      });

      card.attachments.push(attachmentId);
    }

    card.updatedAt = nowISO();
    await saveState();
    renderAttachments(card);
    renderAll();
  } catch (error) {
    console.error("Falha ao salvar anexo:", error);
    mostrarToast("Falha ao salvar anexo no IndexedDB.", "erro");
  }
}

function deleteAttachment(attId) {
  const card = state.cards.find((item) => item.id === state.editingCardId);
  if (!card) return;

  card.attachments = card.attachments.filter((id) => id !== attId);
  card.updatedAt = nowISO();
  state.attachments = state.attachments.filter((att) => att.id !== attId);

  saveState();
  renderAttachments(card);
  renderAll();
}

function bindSortables() {
  if (sortableColumns) {
    sortableColumns.destroy();
    sortableColumns = null;
  }

  while (sortableCardLists.length) {
    const sortable = sortableCardLists.pop();
    sortable.destroy();
  }

  if (!getBoard()) return;

  sortableColumns = new Sortable(dom.columnsContainer, {
    animation: 150,
    handle: ".column-header",
    draggable: ".column",
    onEnd() {
      const board = getBoard();
      if (!board) return;

      board.columnOrder = [...dom.columnsContainer.querySelectorAll(".column")].map(
        (columnEl) => columnEl.dataset.columnId
      );

      saveState();
      renderAll();
    }
  });

  dom.columnsContainer.querySelectorAll(".card-list").forEach((listEl) => {
    const sortable = new Sortable(listEl, {
      group: "cards-group",
      animation: 140,
      draggable: ".card",
      onEnd() {
        // Recalcula ordem e coluna de todos os cards visíveis.
        dom.columnsContainer.querySelectorAll(".card-list").forEach((cardListEl) => {
          const columnId = cardListEl.dataset.columnId;
          const column = state.columns.find((item) => item.id === columnId);
          if (!column) return;

          const cardIds = [...cardListEl.querySelectorAll(".card")].map((cardEl) => cardEl.dataset.cardId);
          column.cardOrder = cardIds;

          cardIds.forEach((cardId) => {
            const card = state.cards.find((item) => item.id === cardId);
            if (card) card.columnId = columnId;
          });
        });

        saveState();
        renderAll();
      }
    });

    sortableCardLists.push(sortable);
  });
}

function handleColumnsClick(event) {
  const button = event.target.closest("button[data-action]");
  const cardEl = event.target.closest(".card[data-action='open-card']");

  if (cardEl && !button) {
    openCardModal(cardEl.dataset.cardId);
    return;
  }

  if (!button) return;

  const action = button.dataset.action;
  const columnId = button.dataset.columnId;

  if (action === "add-card") addCard(columnId);
  if (action === "rename-column") renameColumn(columnId);
  if (action === "delete-column") deleteColumn(columnId);
}

function handleModalClick(event) {
  const checkInput = event.target.closest("input[data-action='toggle-check-item']");
  if (checkInput) {
    toggleChecklistItem(checkInput.dataset.checkItemId);
    return;
  }

  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "toggle-check-item") toggleChecklistItem(button.dataset.checkItemId);
  if (action === "delete-check-item") deleteChecklistItem(button.dataset.checkItemId);
  if (action === "delete-attachment") deleteAttachment(button.dataset.attachmentId);
}

function handleDescriptionPaste(event) {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return;

  const imageFiles = [];

  for (const item of clipboardData.items || []) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) imageFiles.push(file);
    }
  }

  if (imageFiles.length) {
    event.preventDefault();
    attachFilesToEditingCard(imageFiles);
    return;
  }

  const html = clipboardData.getData("text/html");
  const text = clipboardData.getData("text/plain");

  if (html || text) {
    event.preventDefault();
    if (html) {
      insertHtmlAtCursor(html);
    } else {
      insertHtmlAtCursor(text.replace(/\n/g, "<br>"));
    }
  }
}

function exportSelectedBoard() {
  const board = getBoard();
  if (!board) {
    mostrarToast("Nenhum quadro selecionado.", "erro");
    return;
  }

  const columns = getColumnsForBoard(board.id);
  const cards = columns.flatMap((column) => getCardsForColumn(column.id));
  const cardIdSet = new Set(cards.map((card) => card.id));

  const payload = {
    exportedAt: nowISO(),
    version: 1,
    note: "Anexos são exportados sem blob para manter o JSON leve.",
    project: state.projects.find((project) => project.id === board.projectId) || null,
    board,
    columns,
    cards,
    attachments: state.attachments
      .filter((att) => cardIdSet.has(att.cardId))
      .map((att) => ({
        id: att.id,
        cardId: att.cardId,
        name: att.name,
        mime: att.mime,
        createdAt: att.createdAt,
        blobExcluded: true
      }))
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `kanban-${board.name.replace(/\s+/g, "-").toLowerCase()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importBoardFromFile(file) {
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data?.board || !Array.isArray(data.columns) || !Array.isArray(data.cards)) {
      mostrarToast("Formato de JSON inválido para importação do Kanban.", "erro");
      return;
    }

    const existingProjectId =
      state.projects.find((project) => project.name === data.project?.name)?.id || createId("project");

    if (!state.projects.some((project) => project.id === existingProjectId)) {
      state.projects.push({
        id: existingProjectId,
        name: data.project?.name || "Projeto importado",
        color: data.project?.color || "#4f6ef7"
      });
    }

    const boardId = createId("board");
    const columnIdMap = new Map();
    const cardIdMap = new Map();

    const importedColumns = data.columns.map((column) => {
      const newColId = createId("column");
      columnIdMap.set(column.id, newColId);
      return {
        id: newColId,
        boardId,
        title: column.title,
        cardOrder: []
      };
    });

    const importedCards = data.cards.map((card) => {
      const newCardId = createId("card");
      cardIdMap.set(card.id, newCardId);
      return {
        id: newCardId,
        columnId: columnIdMap.get(card.columnId),
        title: card.title || "Card importado",
        descriptionHtml: sanitizeHtml(card.descriptionHtml || ""),
        checklist: Array.isArray(card.checklist) ? card.checklist : [],
        attachments: [],
        createdAt: card.createdAt || nowISO(),
        updatedAt: card.updatedAt || nowISO()
      };
    });

    importedColumns.forEach((column) => {
      column.cardOrder = importedCards
        .filter((card) => card.columnId === column.id)
        .map((card) => card.id);
    });

    const board = {
      id: boardId,
      name: `${data.board.name || "Quadro importado"} (importado)`,
      projectId: existingProjectId,
      columnOrder: importedColumns.map((column) => column.id)
    };

    state.boards.push(board);
    state.columns.push(...importedColumns);
    state.cards.push(...importedCards);
    state.selectedBoardId = boardId;

    await saveState();
    renderAll();

    mostrarToast("Importação concluída. Observação: blobs de anexos não são importados.", "sucesso");
  } catch (error) {
    console.error("Falha na importação:", error);
    mostrarToast("Falha ao importar JSON.", "erro");
  }
}

function setupEvents() {
  dom.projectFilter.addEventListener("change", async (event) => {
    state.selectedProjectId = event.target.value;

    const boards = activeBoards();
    state.selectedBoardId = boards[0]?.id || null;

    await saveState();
    renderAll();
  });

  dom.boardSelect.addEventListener("change", async (event) => {
    state.selectedBoardId = event.target.value;
    await saveState();
    renderAll();
  });

  dom.newBoardBtn.addEventListener("click", async () => addBoard());
  dom.newProjectBtn.addEventListener("click", async () => addProject());
  dom.addColumnBtn.addEventListener("click", async () => addColumn());

  dom.columnsContainer.addEventListener("click", handleColumnsClick);

  dom.closeModalBtn.addEventListener("click", closeCardModal);
  dom.modal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal='true']")) closeCardModal();
  });

  dom.saveCardBtn.addEventListener("click", saveCardFromModal);
  dom.deleteCardBtn.addEventListener("click", async () => {
    if (state.editingCardId) await deleteCard(state.editingCardId);
  });

  dom.addChecklistBtn.addEventListener("click", addChecklistItem);
  dom.checklistInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addChecklistItem();
    }
  });

  dom.checklistList.addEventListener("click", handleModalClick);
  dom.checklistList.addEventListener("change", handleModalClick);
  dom.attachmentList.addEventListener("click", handleModalClick);

  dom.addAttachmentBtn.addEventListener("click", () => dom.attachmentFileInput.click());
  dom.attachmentFileInput.addEventListener("change", async (event) => {
    await attachFilesToEditingCard(event.target.files || []);
    event.target.value = "";
  });

  dom.modalDescription.addEventListener("paste", handleDescriptionPaste);

  dom.exportBtn.addEventListener("click", exportSelectedBoard);
  dom.importBtn.addEventListener("click", () => dom.importFile.click());
  dom.importFile.addEventListener("change", async (event) => {
    await importBoardFromFile(event.target.files?.[0]);
    event.target.value = "";
  });

  dom.uiDialogCancelBtn.addEventListener("click", () => fecharDialogoInterno(null));
  dom.uiDialogCloseBtn.addEventListener("click", () => fecharDialogoInterno(null));
  dom.uiDialog.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-ui-dialog='true']")) {
      fecharDialogoInterno(null);
    }
  });
  dom.uiDialogConfirmBtn.addEventListener("click", () => {
    if (dialogMode === "texto") {
      fecharDialogoInterno(dom.uiDialogInput.value);
      return;
    }
    fecharDialogoInterno(true);
  });
  dom.uiDialogInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      fecharDialogoInterno(dom.uiDialogInput.value);
    }
  });
}

async function bootstrap() {
  await loadState();
  setupEvents();
  renderAll();
}

bootstrap();
