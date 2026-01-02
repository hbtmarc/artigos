export type Post = {
  slug: string;
  title: string;
  summary: string;
};

export const posts: Post[] = [
  {
    slug: 'primeiro-artigo',
    title: 'Primeiro artigo: o ritual da escrita',
    summary: 'Como preparar um ambiente que convida ao pensamento longo e cuidadoso.'
  },
  {
    slug: 'mapa-de-ideias',
    title: 'Mapa de ideias e conexoes',
    summary: 'Uma estrutura simples para guardar referencias e transformar notas em texto.'
  },
  {
    slug: 'editorial-em-camadas',
    title: 'Editorial em camadas',
    summary: 'Do rascunho ao ensaio final: etapas para dar ritmo e clareza.'
  }
];
