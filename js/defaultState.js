import { uid, nowISO } from "./utils.js";

export function createDefaultState() {
  const todo = uid("col");
  const doing = uid("col");
  const done = uid("col");

  const card1 = uid("card");
  const card2 = uid("card");

  return {
    meta: {
      updatedAt: Date.now(),
      createdAt: nowISO()
    },
    projects: [
      {
        id: uid("project"),
        name: "Projeto Principal",
        description: "Central de conteúdos, ideias e execução",
        status: "Planejamento",
        tags: ["conteúdo", "produção"],
        updatedAt: nowISO()
      }
    ],
    kanban: {
      columns: [
        { id: todo, title: "A Fazer", cardIds: [card1] },
        { id: doing, title: "Em Progresso", cardIds: [card2] },
        { id: done, title: "Concluído", cardIds: [] }
      ],
      cards: {
        [card1]: {
          id: card1,
          title: "Planejar calendário editorial",
          description: "Definir 4 semanas de produção",
          updatedAt: nowISO()
        },
        [card2]: {
          id: card2,
          title: "Escrever artigo pilar",
          description: "Publicação base para o tema principal",
          updatedAt: nowISO()
        }
      }
    },
    writing: {
      docs: [
        {
          id: uid("doc"),
          title: "Roteiro inicial",
          kind: "roteiro",
          content: "Estrutura de abertura, desenvolvimento e CTA.",
          updatedAt: nowISO()
        }
      ],
      selectedDocId: null
    },
    brainstorm: {
      ideas: [
        {
          id: uid("idea"),
          title: "Série de artigos por estágio do cliente",
          content: "Topo, meio e fundo de funil com sequência narrativa",
          votes: 1,
          updatedAt: nowISO()
        }
      ]
    },
    mindmap: {
      nodes: [
        { id: "root", label: "Tema Central", parentId: null },
        { id: uid("node"), label: "Subtema 1", parentId: "root" },
        { id: uid("node"), label: "Subtema 2", parentId: "root" }
      ]
    },
    whiteboard: {
      strokes: []
    },
    settings: {
      firebase: {
        apiKey: "AIzaSyAuZ_RWLLn26CqUy3zpyz75_IuQSVQti2k",
        authDomain: "projectshub-marc35.firebaseapp.com",
        databaseURL: "https://projectshub-marc35-default-rtdb.firebaseio.com",
        projectId: "projectshub-marc35",
        storageBucket: "projectshub-marc35.firebasestorage.app",
        messagingSenderId: "949883815683",
        appId: "1:949883815683:web:98ddc84e2cb7195ab34b36",
        measurementId: "G-RB87ZL806J",
        workspaceId: "nucleo-criativo-main"
      },
      authUser: null,
      firebaseConnected: false,
      lastSyncAt: null
    }
  };
}
