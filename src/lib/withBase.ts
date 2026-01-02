export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');

  if (!normalizedBase) {
    return `/${normalizedPath}`;
  }

  if (!normalizedPath) {
    return `${normalizedBase}/`;
  }

  return `${normalizedBase}/${normalizedPath}`;
}
