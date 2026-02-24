# Kanban Local (/kanban)

Aplicação web Kanban com persistência local (IndexedDB) usando `localForage` e arrastar/soltar com `SortableJS`.

## Recursos

- Seletor de quadro + Novo quadro + Filtro de projeto
- Colunas customizáveis: adicionar, renomear, excluir
- Reordenação de colunas por drag-and-drop
- Cards: adicionar, editar em modal, mover entre colunas por drag-and-drop
- Descrição rica simples (`contenteditable`) com sanitização básica
- Checklist no card: adicionar, marcar/desmarcar, excluir
- Anexos no card (imagem/arquivo) com thumbnail para imagens
- Ctrl+V no editor do card:
  - cola imagem/arquivo do clipboard como anexo
  - cola HTML/texto no campo de descrição (sanitizado)
- Exportar JSON / Importar JSON

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

- `http://localhost:5500/index.html` e acesse a aba Kanban.

Observação:

- `http://localhost:5500/kanban/` redireciona para a aplicação principal.

> Também funciona com a extensão Live Server do VS Code.

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

- Não há colaboração em tempo real (somente local/offline).
- Sanitização de HTML é básica (remove tags/atributos perigosos mais comuns).
