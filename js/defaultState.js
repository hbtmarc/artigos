import { nowISO } from "./utils.js";

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAuZ_RWLLn26CqUy3zpyz75_IuQSVQti2k",
  authDomain: "projectshub-marc35.firebaseapp.com",
  databaseURL: "https://projectshub-marc35-default-rtdb.firebaseio.com",
  projectId: "projectshub-marc35",
  storageBucket: "projectshub-marc35.firebasestorage.app",
  messagingSenderId: "949883815683",
  appId: "1:949883815683:web:98ddc84e2cb7195ab34b36",
  measurementId: "G-RB87ZL806J",
  workspaceId: "nucleo-criativo-main"
};

export function createDefaultState() {
  return {
    meta: {
      updatedAt: Date.now(),
      createdAt: nowISO()
    },
    projects: [],
    kanban: {
      columns: [],
      cards: {}
    },
    writing: {
      docs: [],
      selectedDocId: null
    },
    brainstorm: {
      ideas: []
    },
    mindmap: {
      nodes: []
    },
    whiteboard: {
      strokes: []
    },
    settings: {
      firebase: { ...DEFAULT_FIREBASE_CONFIG },
      authUser: null,
      firebaseConnected: false,
      lastSyncAt: null
    }
  };
}
