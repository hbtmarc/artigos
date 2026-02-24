const STORAGE_KEY = "kanban_state_v2";

const store = localforage.createInstance({
  name: "artigos-kanban",
  storeName: "kanban_app"
});

const state = {
  dbVersion: 2,
  projects: [],
  boards: [],
  columns: [],
  cards: [],
  attachments: [],
  selectedProjectId: "all",
  selectedBoardId: null,
  editingCardId: null,
  searchText: "",
  filterLabelId: "all",
  filterDue: "todos",
  showArchived: false
};

const dom = {
  projectFilter: document.querySelector("#project-filter"),
  boardSelect: document.querySelector("#board-select"),
  boardMeta: document.querySelector("#board-meta"),
  newBoardBtn: document.querySelector("#new-board-btn"),
  newProjectBtn: document.querySelector("#new-project-btn"),
  boardCanvas: document.querySelector("#board-canvas"),
  listsRow: document.querySelector("#lists-row"),

  toggleFiltersBtn: document.querySelector("#toggle-filters-btn"),
  filterPanel: document.querySelector("#filter-panel"),

  boardBgColor: document.querySelector("#board-bg-color"),
  boardBgImage: document.querySelector("#board-bg-image"),
  saveBgBtn: document.querySelector("#save-bg-btn"),

  searchInput: document.querySelector("#search-input"),
  filterLabel: document.querySelector("#filter-label"),
  filterDue: document.querySelector("#filter-due"),
  filterArchived: document.querySelector("#filter-archived"),

  archivedBtn: document.querySelector("#archived-btn"),
  archivedModal: document.querySelector("#archived-modal"),
  closeArchivedBtn: document.querySelector("#close-archived-btn"),
  archivedLists: document.querySelector("#archived-lists"),
  archivedCards: document.querySelector("#archived-cards"),

  exportBtn: document.querySelector("#export-btn"),
  importBtn: document.querySelector("#import-btn"),
  importFile: document.querySelector("#import-file"),

  modal: document.querySelector("#card-modal"),
  closeModalBtn: document.querySelector("#close-modal-btn"),
  modalTitleInput: document.querySelector("#card-title-input"),
  modalDescription: document.querySelector("#card-description"),
  saveCardBtn: document.querySelector("#save-card-btn"),
  deleteCardBtn: document.querySelector("#delete-card-btn"),
  archiveCardBtn: document.querySelector("#archive-card-btn"),

  checklistInput: document.querySelector("#checklist-input"),
  addChecklistBtn: document.querySelector("#add-checklist-btn"),
  checklistList: document.querySelector("#checklist-list"),
  checklistProgress: document.querySelector("#checklist-progress"),

  addAttachmentBtn: document.querySelector("#add-attachment-btn"),
  attachmentFileInput: document.querySelector("#attachment-file-input"),
  attachmentList: document.querySelector("#attachment-list"),
  dropZone: document.querySelector("#drop-zone"),

  commentInput: document.querySelector("#comment-input"),
  addCommentBtn: document.querySelector("#add-comment-btn"),
  commentsList: document.querySelector("#comments-list"),
  activityList: document.querySelector("#activity-list"),

  dueInput: document.querySelector("#due-input"),
  dueDone: document.querySelector("#due-done"),

  newLabelName: document.querySelector("#new-label-name"),
  newLabelColor: document.querySelector("#new-label-color"),
  addLabelBtn: document.querySelector("#add-label-btn"),
  labelPicker: document.querySelector("#label-picker"),

  coverColor: document.querySelector("#cover-color"),
  setCoverColorBtn: document.querySelector("#set-cover-color-btn"),
  clearCoverBtn: document.querySelector("#clear-cover-btn"),
  coverAttachmentPicker: document.querySelector("#cover-attachment-picker"),

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

let sortableLists = null;
const sortableCardLists = [];
const attachmentPreviewUrls = [];
let cardDragInProgress = false;
let dialogResolver = null;
let dialogMode = null;

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const nowISO = () => new Date().toISOString();
const fmtDate = (value) => (value ? new Date(value).toLocaleString("pt-BR") : "");

function toast(message, kind = "normal") {
  const item = document.createElement("div");
  item.className = `toast ${kind}`;
  item.textContent = message;
  dom.toastContainer.appendChild(item);
  setTimeout(() => item.remove(), 2600);
}

function closeDialog(result = null) {
  if (dialogResolver) dialogResolver(result);
  dialogResolver = null;
  dialogMode = null;
  dom.uiDialog.classList.add("hidden");
  dom.uiDialog.setAttribute("aria-hidden", "true");
}

function askText({ title, label, initial = "", placeholder = "", confirm = "Confirmar" }) {
  return new Promise((resolve) => {
    dialogResolver = resolve;
    dialogMode = "text";
    dom.uiDialogTitle.textContent = title;
    dom.uiDialogMessage.textContent = "";
    dom.uiDialogInputWrap.classList.remove("hidden");
    dom.uiDialogLabel.textContent = label;
    dom.uiDialogInput.value = initial;
    dom.uiDialogInput.placeholder = placeholder;
    dom.uiDialogConfirmBtn.textContent = confirm;
    dom.uiDialogConfirmBtn.classList.remove("danger");
    dom.uiDialogConfirmBtn.classList.add("primary");
    dom.uiDialog.classList.remove("hidden");
    dom.uiDialog.setAttribute("aria-hidden", "false");
    setTimeout(() => dom.uiDialogInput.focus(), 0);
  });
}

function askConfirm({ title, message, confirm = "Confirmar" }) {
  return new Promise((resolve) => {
    dialogResolver = resolve;
    dialogMode = "confirm";
    dom.uiDialogTitle.textContent = title;
    dom.uiDialogMessage.textContent = message;
    dom.uiDialogInputWrap.classList.add("hidden");
    dom.uiDialogConfirmBtn.textContent = confirm;
    dom.uiDialogConfirmBtn.classList.remove("primary");
    dom.uiDialogConfirmBtn.classList.add("danger");
    dom.uiDialog.classList.remove("hidden");
    dom.uiDialog.setAttribute("aria-hidden", "false");
  });
}

function clearPreviewUrls() {
  while (attachmentPreviewUrls.length) {
    URL.revokeObjectURL(attachmentPreviewUrls.pop());
  }
}

function sanitizeHtml(inputHtml) {
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = inputHtml || "";
  doc.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());
  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = (attr.value || "").toLowerCase().trim();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      if ((name === "href" || name === "src") && value.startsWith("javascript:")) el.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML;
}

function normalizeCard(raw, columnId) {
  return {
    id: raw?.id || uid("card"),
    columnId,
    title: raw?.title || "Card sem título",
    descriptionHtml: sanitizeHtml(raw?.descriptionHtml || ""),
    checklist: Array.isArray(raw?.checklist) ? raw.checklist : [],
    attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
    comments: Array.isArray(raw?.comments) ? raw.comments : [],
    activity: Array.isArray(raw?.activity) ? raw.activity : [],
    labelIds: Array.isArray(raw?.labelIds) ? raw.labelIds : [],
    dueAt: raw?.dueAt || null,
    dueDone: !!raw?.dueDone,
    archived: !!raw?.archived,
    cover: raw?.cover || null,
    createdAt: raw?.createdAt || nowISO(),
    updatedAt: raw?.updatedAt || nowISO()
  };
}

function normalizeBoard(raw, projectId) {
  return {
    id: raw?.id || uid("board"),
    name: raw?.name || "Quadro principal",
    projectId,
    labels: Array.isArray(raw?.labels) ? raw.labels : [],
    bgColor: raw?.bgColor || "#f6f7fb",
    bgImage: raw?.bgImage || "",
    columnOrder: Array.isArray(raw?.columnOrder) ? raw.columnOrder : []
  };
}

function normalizeState(raw) {
  const projects = Array.isArray(raw?.projects) ? raw.projects : [];
  if (!projects.length) projects.push({ id: uid("project"), name: "Geral", color: "#4f6ef7" });

  const boards = (Array.isArray(raw?.boards) ? raw.boards : []).map((board) =>
    normalizeBoard(board, board.projectId || projects[0].id)
  );
  if (!boards.length) boards.push(normalizeBoard({}, projects[0].id));

  const columns = Array.isArray(raw?.columns) ? raw.columns : [];
  const cards = (Array.isArray(raw?.cards) ? raw.cards : []).map((card) => normalizeCard(card, card.columnId));

  boards.forEach((board) => {
    const boardCols = columns.filter((column) => column.boardId === board.id && !column.archived);
    if (!Array.isArray(board.columnOrder)) board.columnOrder = [];
    board.columnOrder = board.columnOrder.filter((id) => boardCols.some((col) => col.id === id));
    boardCols.forEach((col) => {
      if (!board.columnOrder.includes(col.id)) board.columnOrder.push(col.id);
      if (!Array.isArray(col.cardOrder)) col.cardOrder = [];
      const colCards = cards.filter((card) => card.columnId === col.id && !card.archived).map((card) => card.id);
      col.cardOrder = col.cardOrder.filter((cardId) => colCards.includes(cardId));
      colCards.forEach((id) => {
        if (!col.cardOrder.includes(id)) col.cardOrder.push(id);
      });
    });
  });

  let selectedBoardId = raw?.selectedBoardId || boards[0].id;
  if (!boards.some((board) => board.id === selectedBoardId)) selectedBoardId = boards[0].id;

  return {
    dbVersion: 2,
    projects,
    boards,
    columns,
    cards,
    attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
    selectedProjectId: raw?.selectedProjectId || "all",
    selectedBoardId,
    editingCardId: null,
    searchText: "",
    filterLabelId: "all",
    filterDue: "todos",
    showArchived: false
  };
}

async function loadState() {
  try {
    const saved = (await store.getItem(STORAGE_KEY)) || (await store.getItem("kanban_state_v1")) || {};
    Object.assign(state, normalizeState(saved));
  } catch (error) {
    console.error(error);
    Object.assign(state, normalizeState({}));
  }
}

async function saveState() {
  try {
    await store.setItem(STORAGE_KEY, {
      dbVersion: state.dbVersion,
      projects: state.projects,
      boards: state.boards,
      columns: state.columns,
      cards: state.cards,
      attachments: state.attachments,
      selectedProjectId: state.selectedProjectId,
      selectedBoardId: state.selectedBoardId
    });
  } catch (error) {
    console.error(error);
    toast("Falha ao salvar no armazenamento local.", "erro");
  }
}

function getBoard(boardId = state.selectedBoardId) {
  return state.boards.find((board) => board.id === boardId) || null;
}

function getColumns(boardId = state.selectedBoardId, includeArchived = false) {
  const board = getBoard(boardId);
  if (!board) return [];
  const byId = new Map(
    state.columns
      .filter((column) => column.boardId === board.id && (includeArchived || !column.archived))
      .map((column) => [column.id, column])
  );
  const ordered = board.columnOrder.map((id) => byId.get(id)).filter(Boolean);
  const extra = [...byId.values()].filter((col) => !ordered.some((orderedCol) => orderedCol.id === col.id));
  return [...ordered, ...extra];
}

function getCards(columnId, includeArchived = false) {
  const column = state.columns.find((item) => item.id === columnId);
  if (!column) return [];
  const byId = new Map(
    state.cards
      .filter((card) => card.columnId === columnId && (includeArchived || !card.archived))
      .map((card) => [card.id, card])
  );
  const ordered = (column.cardOrder || []).map((id) => byId.get(id)).filter(Boolean);
  const extra = [...byId.values()].filter((card) => !ordered.some((orderedCard) => orderedCard.id === card.id));
  return [...ordered, ...extra];
}

function addActivity(card, text) {
  card.activity.unshift({ id: uid("act"), text, at: nowISO() });
  if (card.activity.length > 50) card.activity = card.activity.slice(0, 50);
}

function dueBadge(card) {
  if (!card.dueAt) return "";
  const due = new Date(card.dueAt);
  const now = new Date();
  const sameDay = due.toDateString() === now.toDateString();
  const late = !card.dueDone && due.getTime() < now.getTime();
  let className = "prazo-ok";
  if (late) className = "prazo-atrasado";
  else if (sameDay) className = "prazo-hoje";
  return `<span class="badge ${className}">Prazo: ${fmtDate(card.dueAt)}${card.dueDone ? " ✓" : ""}</span>`;
}

function cardMatchesFilters(card, board) {
  if (!state.showArchived && card.archived) return false;
  if (state.filterLabelId !== "all" && !card.labelIds.includes(state.filterLabelId)) return false;
  if (state.filterDue === "hoje") {
    if (!card.dueAt) return false;
    if (new Date(card.dueAt).toDateString() !== new Date().toDateString()) return false;
  }
  if (state.filterDue === "atrasado") {
    if (!card.dueAt) return false;
    if (card.dueDone) return false;
    if (new Date(card.dueAt).getTime() >= Date.now()) return false;
  }
  const q = state.searchText.trim().toLowerCase();
  if (!q) return true;
  const text = [
    card.title,
    card.descriptionHtml,
    ...(card.comments || []).map((item) => item.text),
    ...card.labelIds
      .map((labelId) => board.labels.find((label) => label.id === labelId)?.name || "")
      .filter(Boolean)
  ]
    .join(" ")
    .toLowerCase();
  return text.includes(q);
}

function renderProjectFilter() {
  dom.projectFilter.innerHTML = [
    `<option value="all" ${state.selectedProjectId === "all" ? "selected" : ""}>Todos os projetos</option>`,
    ...state.projects.map(
      (project) => `<option value="${project.id}" ${state.selectedProjectId === project.id ? "selected" : ""}>${project.name}</option>`
    )
  ].join("");
}

function activeBoards() {
  if (state.selectedProjectId === "all") return state.boards;
  return state.boards.filter((board) => board.projectId === state.selectedProjectId);
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

function renderLabelFilter() {
  const board = getBoard();
  if (!board) {
    dom.filterLabel.innerHTML = `<option value="all">Todos</option>`;
    return;
  }
  dom.filterLabel.innerHTML = [
    `<option value="all">Todos</option>`,
    ...board.labels.map((label) => `<option value="${label.id}" ${state.filterLabelId === label.id ? "selected" : ""}>${label.name}</option>`)
  ].join("");
}

function renderBoardMeta() {
  const board = getBoard();
  if (!board) {
    dom.boardMeta.textContent = "Nenhum quadro selecionado";
    return;
  }
  const totalCards = getColumns(board.id, true).reduce((acc, column) => acc + getCards(column.id, true).length, 0);
  dom.boardMeta.textContent = `${totalCards} cartão(ões)`;
  dom.boardBgColor.value = board.bgColor || "#f6f7fb";
  dom.boardBgImage.value = board.bgImage || "";
  dom.boardCanvas.style.backgroundColor = board.bgColor || "#f6f7fb";
  dom.boardCanvas.style.backgroundImage = board.bgImage ? `url(${board.bgImage})` : "none";
}

function renderLists() {
  const board = getBoard();
  if (!board) {
    dom.listsRow.innerHTML = `<article class="empty-board">Crie um quadro para começar.</article>`;
    bindSortables();
    return;
  }

  const columns = getColumns(board.id, state.showArchived);
  if (!columns.length) {
    dom.listsRow.innerHTML = `
      <article class="empty-board">Nenhuma lista ainda. Use “Adicionar lista”.</article>
      <article class="add-list-card">
        <button class="btn primary" data-action="add-list">+ Adicionar lista</button>
      </article>
    `;
    bindSortables();
    return;
  }

  dom.listsRow.innerHTML = `${columns
    .map((column) => {
      const cards = getCards(column.id, state.showArchived).filter((card) => cardMatchesFilters(card, board));
      return `
        <article class="lista" data-column-id="${column.id}">
          <header class="lista-header">
            <h3>${column.title}${column.archived ? " (arquivada)" : ""}</h3>
            <div class="lista-menu-wrap">
              <button class="btn ghost" data-action="toggle-list-menu" data-column-id="${column.id}">⋯</button>
              <div class="lista-menu hidden" data-list-menu="${column.id}">
                <button data-action="rename-list" data-column-id="${column.id}">Renomear</button>
                <button data-action="archive-list" data-column-id="${column.id}">${column.archived ? "Restaurar" : "Arquivar"}</button>
                <button data-action="delete-list" data-column-id="${column.id}">Excluir</button>
              </div>
            </div>
          </header>
          <section class="cartoes" data-column-id="${column.id}">
            ${cards
              .map((card) => {
                const labels = card.labelIds
                  .map((id) => board.labels.find((label) => label.id === id))
                  .filter(Boolean)
                  .map((label) => `<span class="rotulo-chip" style="background:${label.color}"></span>`)
                  .join("");
                const checklistDone = card.checklist.filter((item) => item.done).length;
                const checklistPreview = card.checklist
                  .slice(0, 3)
                  .map(
                    (item) => `
                      <li class="card-check-item ${item.done ? "done" : ""}">
                        <button class="card-check-toggle" data-action="toggle-check-preview" data-card-id="${card.id}" data-check-id="${item.id}" aria-label="Marcar item ${item.text}">${item.done ? "✓" : ""}</button>
                        <span class="card-check-text">${item.text}</span>
                      </li>
                    `
                  )
                  .join("");
                const checklistRemainder = card.checklist.length > 3 ? card.checklist.length - 3 : 0;
                return `
                  <article class="cartao" data-card-id="${card.id}">
                    ${card.cover?.type === "color" ? `<div class="cartao-capa" style="background:${card.cover.value}"></div>` : ""}
                    ${card.cover?.type === "attachment" ? `<div class="cartao-capa" style="background-image:url(${card.cover.value})"></div>` : ""}
                    <div class="rotulos">${labels}</div>
                    <h4>${card.title}${card.archived ? " (arquivado)" : ""}</h4>
                    ${card.checklist.length
                      ? `<ul class="card-checklist-preview">
                          ${checklistPreview}
                          ${checklistRemainder ? `<li class="card-check-more">+${checklistRemainder} item(ns)</li>` : ""}
                        </ul>`
                      : ""}
                    <div class="badges">
                      ${card.checklist.length ? `<span class="badge">Checklist ${checklistDone}/${card.checklist.length}</span>` : ""}
                      ${card.attachments.length ? `<span class="badge">Anexos ${card.attachments.length}</span>` : ""}
                      ${dueBadge(card)}
                    </div>
                  </article>
                `;
              })
              .join("")}
          </section>
          <footer class="lista-footer">
            <div class="quick-add">
              <textarea data-quick-card="${column.id}" placeholder="Novo cartão..."></textarea>
              <button class="btn secondary" data-action="quick-add-card" data-column-id="${column.id}">Adicionar cartão</button>
            </div>
          </footer>
        </article>
      `;
    })
    .join("")}
    <article class="add-list-card">
      <button class="btn primary" data-action="add-list">+ Adicionar lista</button>
    </article>
  `;

  bindSortables();
}

function renderArchivedModal() {
  const board = getBoard();
  if (!board) return;
  const listItems = getColumns(board.id, true)
    .filter((column) => column.archived)
    .map(
      (column) => `<li><span>${column.title}</span><button class="btn secondary" data-action="restore-list" data-column-id="${column.id}">Restaurar</button></li>`
    );

  const cardItems = state.cards
    .filter((card) => card.archived)
    .filter((card) => {
      const column = state.columns.find((item) => item.id === card.columnId);
      return column?.boardId === board.id;
    })
    .map((card) => `<li><span>${card.title}</span><button class="btn secondary" data-action="restore-card" data-card-id="${card.id}">Restaurar</button></li>`);

  dom.archivedLists.innerHTML = listItems.length ? listItems.join("") : `<li class="muted">Nenhuma lista arquivada</li>`;
  dom.archivedCards.innerHTML = cardItems.length ? cardItems.join("") : `<li class="muted">Nenhum cartão arquivado</li>`;
}

function renderAll() {
  renderProjectFilter();
  renderBoardSelector();
  renderLabelFilter();
  renderBoardMeta();
  renderLists();
  renderArchivedModal();
}

async function addProject() {
  const name = await askText({ title: "Novo projeto", label: "Nome do projeto", placeholder: "Ex: Conteúdo 2026", confirm: "Criar" });
  if (!name?.trim()) return;
  state.projects.push({ id: uid("project"), name: name.trim(), color: "#4f6ef7" });
  await saveState();
  renderAll();
}

async function addBoard() {
  const name = await askText({ title: "Novo quadro", label: "Nome do quadro", placeholder: "Ex: Planejamento" });
  if (!name?.trim()) return;
  const projectId = state.selectedProjectId !== "all" ? state.selectedProjectId : state.projects[0]?.id;
  if (!projectId) return;
  const board = normalizeBoard({ id: uid("board"), name: name.trim(), projectId }, projectId);
  state.boards.push(board);
  state.selectedBoardId = board.id;
  await saveState();
  renderAll();
}

async function addList() {
  const board = getBoard();
  if (!board) return;
  const title = await askText({ title: "Nova lista", label: "Título da lista", placeholder: "Ex: Backlog", confirm: "Adicionar" });
  if (!title?.trim()) return;
  const columnId = uid("column");
  state.columns.push({ id: columnId, boardId: board.id, title: title.trim(), cardOrder: [], archived: false });
  board.columnOrder.push(columnId);
  await saveState();
  renderAll();
}

async function renameList(columnId) {
  const column = state.columns.find((item) => item.id === columnId);
  if (!column) return;
  const title = await askText({ title: "Renomear lista", label: "Novo nome", initial: column.title, confirm: "Salvar" });
  if (!title?.trim()) return;
  column.title = title.trim();
  await saveState();
  renderAll();
}

async function deleteList(columnId) {
  const column = state.columns.find((item) => item.id === columnId);
  if (!column) return;
  const ok = await askConfirm({ title: "Excluir lista", message: `Excluir “${column.title}” e todos os cartões?`, confirm: "Excluir" });
  if (!ok) return;

  const cardIds = getCards(columnId, true).map((card) => card.id);
  state.cards = state.cards.filter((card) => !cardIds.includes(card.id));
  state.attachments = state.attachments.filter((attachment) => !cardIds.includes(attachment.cardId));
  state.columns = state.columns.filter((item) => item.id !== columnId);

  const board = getBoard(column.boardId);
  if (board) board.columnOrder = board.columnOrder.filter((id) => id !== columnId);

  await saveState();
  renderAll();
}

async function toggleArchiveList(columnId) {
  const column = state.columns.find((item) => item.id === columnId);
  if (!column) return;
  column.archived = !column.archived;
  await saveState();
  renderAll();
}

async function quickAddCard(columnId) {
  const textarea = dom.listsRow.querySelector(`textarea[data-quick-card="${columnId}"]`);
  const title = textarea?.value?.trim();
  if (!title) return;
  const column = state.columns.find((item) => item.id === columnId);
  if (!column) return;

  const card = normalizeCard({ title, comments: [], activity: [] }, columnId);
  card.archived = false;
  addActivity(card, "Cartão criado");
  state.cards.push(card);
  column.cardOrder.push(card.id);
  textarea.value = "";

  await saveState();
  renderAll();
}

function openCard(cardId) {
  const card = state.cards.find((item) => item.id === cardId);
  if (!card) return;
  state.editingCardId = cardId;
  dom.modalTitleInput.value = card.title;
  dom.modalDescription.innerHTML = card.descriptionHtml || "";
  dom.dueInput.value = card.dueAt ? card.dueAt.slice(0, 16) : "";
  dom.dueDone.checked = !!card.dueDone;
  renderCardLabels(card);
  renderChecklist(card);
  renderAttachments(card);
  renderComments(card);
  renderActivity(card);
  dom.modal.classList.remove("hidden");
  dom.modal.setAttribute("aria-hidden", "false");
}

function closeCard() {
  state.editingCardId = null;
  dom.modal.classList.add("hidden");
  dom.modal.setAttribute("aria-hidden", "true");
  clearPreviewUrls();
}

function getEditingCard() {
  return state.cards.find((item) => item.id === state.editingCardId) || null;
}

function renderCardLabels(card) {
  const board = getBoard();
  if (!board) return;
  dom.labelPicker.innerHTML = board.labels
    .map(
      (label) => `
      <button class="label-item ${card.labelIds.includes(label.id) ? "ativo" : ""}" data-action="toggle-card-label" data-label-id="${label.id}" style="border-color:${label.color}">
        <span class="rotulo-chip" style="background:${label.color}"></span>${label.name}
      </button>
    `
    )
    .join("");
}

function renderChecklist(card) {
  const total = card.checklist.length;
  const done = card.checklist.filter((i) => i.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  dom.checklistProgress.innerHTML = total
    ? `<span class="checklist-progress-text">${done}/${total} concluídos</span>
       <div class="checklist-progress-bar"><div class="checklist-progress-fill" style="width:${pct}%"></div></div>`
    : "";

  dom.checklistList.innerHTML = card.checklist
    .map(
      (item) => `
      <li class="checklist-item" data-check-id="${item.id}">
        <div class="checklist-left">
          <input type="checkbox" data-action="toggle-check" data-check-id="${item.id}" ${item.done ? "checked" : ""}>
          <span class="${item.done ? "checklist-done" : ""}">${item.text}</span>
        </div>
        <button class="btn ghost sm" data-action="delete-check" data-check-id="${item.id}">Excluir</button>
      </li>
    `
    )
    .join("");
}

function renderAttachments(card) {
  clearPreviewUrls();
  const attachments = card.attachments
    .map((id) => state.attachments.find((item) => item.id === id))
    .filter(Boolean);

  dom.attachmentList.innerHTML = attachments.length
    ? attachments
        .map((att) => {
          let preview = "";
          if (att.mime?.startsWith("image/") && att.blob) {
            const url = URL.createObjectURL(att.blob);
            attachmentPreviewUrls.push(url);
            preview = `<img class="attachment-preview" src="${url}" alt="${att.name}">`;
          }
          return `<li class="attachment-item">${preview}<span class="attachment-name">${att.name}</span><button class="btn ghost" data-action="set-cover-attachment" data-att-id="${att.id}">Usar capa</button><button class="btn ghost" data-action="delete-attachment" data-att-id="${att.id}">Excluir</button></li>`;
        })
        .join("")
    : `<li class="muted">Sem anexos</li>`;

  dom.coverAttachmentPicker.innerHTML = attachments
    .filter((att) => att.mime?.startsWith("image/"))
    .map((att) => `<button class="label-item" data-action="set-cover-attachment" data-att-id="${att.id}">${att.name}</button>`)
    .join("");
}

function renderComments(card) {
  dom.commentsList.innerHTML = (card.comments || [])
    .map((comment) => `<li><span>${comment.text}</span><small class="muted">${fmtDate(comment.at)}</small></li>`)
    .join("") || `<li class="muted">Sem comentários</li>`;
}

function renderActivity(card) {
  dom.activityList.innerHTML = (card.activity || [])
    .map((item) => `<li><span>${item.text}</span><small class="muted">${fmtDate(item.at)}</small></li>`)
    .join("") || `<li class="muted">Sem atividades</li>`;
}

async function saveCard() {
  const card = getEditingCard();
  if (!card) return;
  const title = dom.modalTitleInput.value.trim();
  if (!title) {
    toast("O título é obrigatório.", "erro");
    return;
  }
  card.title = title;
  card.descriptionHtml = sanitizeHtml(dom.modalDescription.innerHTML);
  card.dueAt = dom.dueInput.value ? new Date(dom.dueInput.value).toISOString() : null;
  card.dueDone = !!dom.dueDone.checked;
  card.updatedAt = nowISO();
  addActivity(card, "Cartão atualizado");
  await saveState();
  renderAll();
  closeCard();
}

async function archiveCard(cardId) {
  const card = state.cards.find((item) => item.id === cardId);
  if (!card) return;
  card.archived = !card.archived;
  addActivity(card, card.archived ? "Cartão arquivado" : "Cartão restaurado");
  await saveState();
  renderAll();
  if (state.editingCardId === card.id) closeCard();
}

async function deleteCard(cardId) {
  const card = state.cards.find((item) => item.id === cardId);
  if (!card) return;
  const ok = await askConfirm({ title: "Excluir cartão", message: "Deseja excluir este cartão?", confirm: "Excluir" });
  if (!ok) return;

  state.cards = state.cards.filter((item) => item.id !== cardId);
  state.attachments = state.attachments.filter((att) => att.cardId !== cardId);
  const column = state.columns.find((item) => item.id === card.columnId);
  if (column) column.cardOrder = column.cardOrder.filter((id) => id !== cardId);

  await saveState();
  renderAll();
  closeCard();
}

async function addChecklistItem() {
  const card = getEditingCard();
  if (!card) return;
  const text = dom.checklistInput.value.trim();
  if (!text) return;
  card.checklist.push({ id: uid("check"), text, done: false });
  dom.checklistInput.value = "";
  card.updatedAt = nowISO();
  await saveState();
  renderChecklist(card);
  renderAll();
}

async function attachFiles(files) {
  const card = getEditingCard();
  if (!card || !files?.length) return;
  for (const file of [...files]) {
    const id = uid("att");
    state.attachments.push({
      id,
      cardId: card.id,
      name: file.name || "arquivo",
      mime: file.type || "application/octet-stream",
      blob: file,
      createdAt: nowISO()
    });
    card.attachments.push(id);
  }
  card.updatedAt = nowISO();
  addActivity(card, "Anexo adicionado");
  await saveState();
  renderAttachments(card);
  renderAll();
}

function insertHtmlAtCursor(html) {
  const selection = window.getSelection();
  const safeHtml = sanitizeHtml(html);
  if (!selection || selection.rangeCount === 0) {
    dom.modalDescription.innerHTML += safeHtml;
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const template = document.createElement("template");
  template.innerHTML = safeHtml;
  range.insertNode(template.content);
  range.collapse(false);
}

function bindSortables() {
  if (sortableLists) sortableLists.destroy();
  while (sortableCardLists.length) sortableCardLists.pop().destroy();

  sortableLists = new Sortable(dom.listsRow, {
    animation: 140,
    draggable: ".lista",
    onEnd() {
      const board = getBoard();
      if (!board) return;
      board.columnOrder = [...dom.listsRow.querySelectorAll(".lista")].map((el) => el.dataset.columnId);
      saveState();
    }
  });

  dom.listsRow.querySelectorAll(".cartoes").forEach((list) => {
    const sortable = new Sortable(list, {
      group: "cards",
      animation: 140,
      draggable: ".cartao",
      filter: ".card-check-toggle",
      delayOnTouchOnly: true,
      delay: 120,
      touchStartThreshold: 4,
      ghostClass: "cartao-ghost",
      chosenClass: "cartao-chosen",
      dragClass: "cartao-drag",
      onStart() {
        cardDragInProgress = true;
      },
      onEnd() {
        dom.listsRow.querySelectorAll(".cartoes").forEach((cardsEl) => {
          const columnId = cardsEl.dataset.columnId;
          const column = state.columns.find((item) => item.id === columnId);
          if (!column) return;
          const cardIds = [...cardsEl.querySelectorAll(".cartao")].map((el) => el.dataset.cardId);
          column.cardOrder = cardIds;
          cardIds.forEach((id) => {
            const card = state.cards.find((item) => item.id === id);
            if (card) card.columnId = columnId;
          });
        });
        saveState();
        setTimeout(() => {
          cardDragInProgress = false;
        }, 0);
      }
    });
    sortableCardLists.push(sortable);
  });
}

function toggleListMenu(columnId) {
  dom.listsRow.querySelectorAll(".lista-menu").forEach((menu) => menu.classList.add("hidden"));
  const target = dom.listsRow.querySelector(`[data-list-menu="${columnId}"]`);
  if (target) target.classList.toggle("hidden");
}

async function handleListsClick(event) {
  const actionBtn = event.target.closest("[data-action]");
  const cardEl = event.target.closest(".cartao");

  if (cardEl && !actionBtn) {
    if (cardDragInProgress) return;
    openCard(cardEl.dataset.cardId);
    return;
  }

  if (!actionBtn) return;

  const action = actionBtn.dataset.action;
  const columnId = actionBtn.dataset.columnId;
  const cardId = actionBtn.dataset.cardId;

  if (action === "add-list") await addList();
  if (action === "toggle-list-menu") toggleListMenu(columnId);
  if (action === "rename-list") await renameList(columnId);
  if (action === "archive-list") await toggleArchiveList(columnId);
  if (action === "delete-list") await deleteList(columnId);
  if (action === "quick-add-card") await quickAddCard(columnId);
  if (action === "toggle-check-preview") {
    const checkId = actionBtn.dataset.checkId;
    const targetCard = state.cards.find((item) => item.id === cardId);
    if (targetCard && checkId) {
      const checkItem = targetCard.checklist.find((entry) => entry.id === checkId);
      if (checkItem) {
        checkItem.done = !checkItem.done;
        targetCard.updatedAt = nowISO();
        await saveState();
        renderAll();
      }
    }
  }
  if (action === "restore-list") {
    const column = state.columns.find((item) => item.id === columnId);
    if (column) {
      column.archived = false;
      await saveState();
      renderAll();
    }
  }
  if (action === "restore-card") await archiveCard(cardId);
}

async function handleCardModalClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const card = getEditingCard();
  if (!card) return;

  if (action === "toggle-check") {
    const item = card.checklist.find((entry) => entry.id === button.dataset.checkId);
    if (item) item.done = !item.done;
    await saveState();
    renderChecklist(card);
    renderAll();
  }

  if (action === "delete-check") {
    card.checklist = card.checklist.filter((entry) => entry.id !== button.dataset.checkId);
    await saveState();
    renderChecklist(card);
    renderAll();
  }

  if (action === "toggle-card-label") {
    const labelId = button.dataset.labelId;
    if (card.labelIds.includes(labelId)) card.labelIds = card.labelIds.filter((id) => id !== labelId);
    else card.labelIds.push(labelId);
    await saveState();
    renderCardLabels(card);
    renderAll();
  }

  if (action === "delete-attachment") {
    const attId = button.dataset.attId;
    card.attachments = card.attachments.filter((id) => id !== attId);
    state.attachments = state.attachments.filter((item) => item.id !== attId);
    await saveState();
    renderAttachments(card);
    renderAll();
  }

  if (action === "set-cover-attachment") {
    const att = state.attachments.find((item) => item.id === button.dataset.attId);
    if (att?.mime?.startsWith("image/") && att.blob) {
      card.cover = { type: "attachment", value: URL.createObjectURL(att.blob) };
      attachmentPreviewUrls.push(card.cover.value);
      await saveState();
      renderAll();
    }
  }
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
    attachFiles(imageFiles);
    return;
  }
  const html = clipboardData.getData("text/html");
  const text = clipboardData.getData("text/plain");
  if (html || text) {
    event.preventDefault();
    insertHtmlAtCursor(html || text.replace(/\n/g, "<br>"));
  }
}

function exportBoard() {
  const board = getBoard();
  if (!board) {
    toast("Nenhum quadro selecionado.", "erro");
    return;
  }

  const columns = getColumns(board.id, true);
  const cards = columns.flatMap((column) => getCards(column.id, true));
  const payload = {
    exportedAt: nowISO(),
    version: 2,
    project: state.projects.find((project) => project.id === board.projectId),
    board,
    columns,
    cards,
    attachments: state.attachments
      .filter((attachment) => cards.some((card) => card.id === attachment.cardId))
      .map((attachment) => ({
        id: attachment.id,
        cardId: attachment.cardId,
        name: attachment.name,
        mime: attachment.mime,
        createdAt: attachment.createdAt,
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

async function importBoard(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed?.board || !Array.isArray(parsed.columns) || !Array.isArray(parsed.cards)) {
      toast("JSON inválido para importação.", "erro");
      return;
    }

    const projectId = uid("project");
    state.projects.push({
      id: projectId,
      name: parsed.project?.name || "Projeto importado",
      color: parsed.project?.color || "#4f6ef7"
    });

    const boardId = uid("board");
    const board = normalizeBoard({
      id: boardId,
      name: `${parsed.board.name || "Quadro"} (importado)`,
      projectId,
      labels: Array.isArray(parsed.board.labels) ? parsed.board.labels : []
    }, projectId);

    const colMap = new Map();
    const newColumns = parsed.columns.map((column) => {
      const id = uid("column");
      colMap.set(column.id, id);
      return {
        id,
        boardId,
        title: column.title || "Lista",
        cardOrder: [],
        archived: !!column.archived
      };
    });

    const newCards = parsed.cards.map((card) =>
      normalizeCard(
        {
          ...card,
          id: uid("card"),
          columnId: colMap.get(card.columnId),
          attachments: []
        },
        colMap.get(card.columnId)
      )
    );

    newColumns.forEach((column) => {
      column.cardOrder = newCards.filter((card) => card.columnId === column.id).map((card) => card.id);
    });

    board.columnOrder = newColumns.filter((column) => !column.archived).map((column) => column.id);
    state.boards.push(board);
    state.columns.push(...newColumns);
    state.cards.push(...newCards);
    state.selectedProjectId = projectId;
    state.selectedBoardId = boardId;

    await saveState();
    renderAll();
    toast("Importação concluída. Blobs de anexos não são importados.", "sucesso");
  } catch (error) {
    console.error(error);
    toast("Falha ao importar JSON.", "erro");
  }
}

function setupEvents() {
  dom.projectFilter.addEventListener("change", async (event) => {
    state.selectedProjectId = event.target.value;
    state.selectedBoardId = activeBoards()[0]?.id || null;
    await saveState();
    renderAll();
  });

  dom.boardSelect.addEventListener("change", async (event) => {
    state.selectedBoardId = event.target.value;
    await saveState();
    renderAll();
  });

  dom.searchInput.addEventListener("input", (event) => {
    state.searchText = event.target.value || "";
    renderLists();
  });

  dom.filterLabel.addEventListener("change", (event) => {
    state.filterLabelId = event.target.value;
    renderLists();
  });

  dom.filterDue.addEventListener("change", (event) => {
    state.filterDue = event.target.value;
    renderLists();
  });

  dom.filterArchived.addEventListener("change", (event) => {
    state.showArchived = !!event.target.checked;
    renderAll();
  });

  dom.newProjectBtn.addEventListener("click", () => addProject());
  dom.newBoardBtn.addEventListener("click", () => addBoard());

  dom.toggleFiltersBtn.addEventListener("click", () => {
    dom.filterPanel.classList.toggle("hidden");
    dom.toggleFiltersBtn.textContent = dom.filterPanel.classList.contains("hidden") ? "Filtros" : "Fechar filtros";
  });

  dom.saveBgBtn.addEventListener("click", async () => {
    const board = getBoard();
    if (!board) return;
    board.bgColor = dom.boardBgColor.value || "#f6f7fb";
    board.bgImage = dom.boardBgImage.value.trim();
    await saveState();
    renderBoardMeta();
  });

  dom.listsRow.addEventListener("click", handleListsClick);

  dom.archivedBtn.addEventListener("click", () => {
    dom.archivedModal.classList.remove("hidden");
    dom.archivedModal.setAttribute("aria-hidden", "false");
  });
  dom.closeArchivedBtn.addEventListener("click", () => {
    dom.archivedModal.classList.add("hidden");
    dom.archivedModal.setAttribute("aria-hidden", "true");
  });
  dom.archivedModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-archived='true']")) {
      dom.archivedModal.classList.add("hidden");
      dom.archivedModal.setAttribute("aria-hidden", "true");
    }
  });
  dom.archivedModal.addEventListener("click", handleListsClick);

  dom.closeModalBtn.addEventListener("click", closeCard);
  dom.modal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal='true']")) closeCard();
  });

  dom.saveCardBtn.addEventListener("click", saveCard);
  dom.archiveCardBtn.addEventListener("click", async () => {
    if (state.editingCardId) await archiveCard(state.editingCardId);
  });
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

  dom.addAttachmentBtn.addEventListener("click", () => dom.attachmentFileInput.click());
  dom.attachmentFileInput.addEventListener("change", async (event) => {
    await attachFiles(event.target.files || []);
    event.target.value = "";
  });

  dom.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dom.dropZone.classList.add("ativo");
  });
  dom.dropZone.addEventListener("dragleave", () => dom.dropZone.classList.remove("ativo"));
  dom.dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    dom.dropZone.classList.remove("ativo");
    await attachFiles(event.dataTransfer?.files || []);
  });

  dom.modalDescription.addEventListener("paste", handleDescriptionPaste);
  dom.modal.addEventListener("click", handleCardModalClick);

  dom.addCommentBtn.addEventListener("click", async () => {
    const card = getEditingCard();
    const text = dom.commentInput.value.trim();
    if (!card || !text) return;
    card.comments.unshift({ id: uid("cmt"), text, at: nowISO() });
    addActivity(card, "Comentário adicionado");
    dom.commentInput.value = "";
    await saveState();
    renderComments(card);
    renderActivity(card);
    renderAll();
  });

  dom.addLabelBtn.addEventListener("click", async () => {
    const board = getBoard();
    const card = getEditingCard();
    if (!board || !card) return;
    const name = dom.newLabelName.value.trim();
    if (!name) return;
    const label = { id: uid("label"), name, color: dom.newLabelColor.value || "#4f6ef7" };
    board.labels.push(label);
    card.labelIds.push(label.id);
    dom.newLabelName.value = "";
    await saveState();
    renderCardLabels(card);
    renderLabelFilter();
    renderAll();
  });

  dom.setCoverColorBtn.addEventListener("click", async () => {
    const card = getEditingCard();
    if (!card) return;
    card.cover = { type: "color", value: dom.coverColor.value || "#4f6ef7" };
    await saveState();
    renderAll();
  });

  dom.clearCoverBtn.addEventListener("click", async () => {
    const card = getEditingCard();
    if (!card) return;
    card.cover = null;
    await saveState();
    renderAll();
  });

  dom.exportBtn.addEventListener("click", exportBoard);
  dom.importBtn.addEventListener("click", () => dom.importFile.click());
  dom.importFile.addEventListener("change", async (event) => {
    await importBoard(event.target.files?.[0]);
    event.target.value = "";
  });

  dom.uiDialogCancelBtn.addEventListener("click", () => closeDialog(null));
  dom.uiDialogCloseBtn.addEventListener("click", () => closeDialog(null));
  dom.uiDialog.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-ui-dialog='true']")) closeDialog(null);
  });
  dom.uiDialogConfirmBtn.addEventListener("click", () => {
    if (dialogMode === "text") closeDialog(dom.uiDialogInput.value);
    else closeDialog(true);
  });
  dom.uiDialogInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      closeDialog(dom.uiDialogInput.value);
    }
  });
}

async function bootstrap() {
  await loadState();
  setupEvents();
  renderAll();
}

bootstrap();
