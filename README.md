# Núcleo Criativo (SPA + Firebase RTDB)

SPA em JavaScript puro para organizar:
- roteiros, artigos, notas e textos
- projetos e status
- quadro Kanban
- brainstorm de ideias com votação
- mapa mental em árvore
- whiteboard para rascunhos

## Como usar

1. Abra `index.html` no navegador (ou use uma extensão/servidor local).
2. Navegue até a aba **Firebase**.
3. Preencha as credenciais do seu projeto Firebase.
4. Defina um `workspaceId` (ex: `meu-time-conteudo`).
5. Clique em **Salvar e conectar**.

## Abrir sempre para teste (VS Code)

Fluxo recomendado para o dia a dia:

1. Abra a pasta `artigos` no VS Code.
2. Rode a task: **Terminal → Run Task → Serve artigos (5500)**.
3. Acesse: `http://localhost:5500`.
4. Para parar o servidor: volte no terminal da task e pressione `Ctrl + C`.

Dica: depois de usar uma vez, a task aparece no histórico de tarefas recentes.

## Estrutura de dados no RTDB

Os dados são salvos em:

- `workspaces/{workspaceId}`

Com o formato:

- `updatedAt`: timestamp numérico
- `data`: estado completo da aplicação

## Regras sugeridas (desenvolvimento)

No Realtime Database Rules, para testes locais:

```json
{
  "rules": {
    "workspaces": {
      "$workspaceId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Para produção, configure autenticação e regras restritas.

## Kanban Offline (novo)

Foi adicionado um app Kanban dedicado em `kanban/`:

- Entrada: `kanban/index.html`
- Guia completo: `kanban/README.md`

Execução:

1. Inicie servidor local na raiz do repositório:

```bash
python3 -m http.server 5500
```

2. Abra no navegador:

- `http://localhost:5500/kanban/`
