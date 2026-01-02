# Firestore Rules (MVP)

1) Abra o Firebase Console e selecione o projeto.
2) Va em Firestore Database -> Rules.
3) Substitua o conteudo atual pelas regras de `firebase/firestore.rules`.
4) Clique em Publish.

Notas:
- A regra de `posts` permite leitura publica apenas para documentos com `status == "published"`.
- Qualquer escrita exige admin (documento `admins/{uid}` com `active: true`).
- A colecao `admins` e somente leitura para admins; escrita e bloqueada.
