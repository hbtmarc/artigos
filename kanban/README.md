# Kanban Offline (/kanban)

Kanban web app com persistência local (IndexedDB) usando `localForage` e drag-and-drop com `SortableJS`.

## Recursos

- Board selector + New board + Project filter
- Colunas customizáveis: adicionar, renomear, excluir
- Reordenação de colunas por drag-and-drop
- Cards: adicionar, editar em modal, mover entre colunas por drag-and-drop
- Descrição rica simples (`contenteditable`) com sanitização básica
- Checklist no card: adicionar, marcar/desmarcar, excluir
- Anexos no card (imagem/arquivo) com thumbnail para imagens
- Ctrl+V no editor do card:
  - cola imagem/arquivo do clipboard como anexo
  - cola HTML/texto no campo de descrição (sanitizado)
- Export JSON / Import JSON

## Stack

- Storage: `localForage` (IndexedDB)
- DnD: `SortableJS`
- Sem backend

## Como rodar

1. Na raiz do repositório, inicie um servidor estático (exemplo):

```bash
python3 -m http.server 5500
```

2. Abra:

- `http://localhost:5500/kanban/`

> Também funciona com VS Code Live Server.

## Modelo de dados

- `projects`: `{id, name, color}`
- `boards`: `{id, name, projectId, columnOrder:[colId]}`
- `columns`: `{id, boardId, title, cardOrder:[cardId]}`
- `cards`: `{id, columnId, title, descriptionHtml, checklist:[{id,text,done}], attachments:[attId], createdAt, updatedAt}`
- `attachments`: `{id, cardId, name, mime, blob, createdAt}`

## Export/Import e anexos

- Export inclui board/colunas/cards/checklists.
- Export de anexos **não inclui blob** para manter JSON leve.
- Import recria board/colunas/cards/checklists.
- Import de anexos é apenas metadado (sem blob).

## Limitações

- Não há colaboração em tempo real (offline/local apenas).
- Sanitização de HTML é básica (remove tags/atributos perigosos mais comuns).
