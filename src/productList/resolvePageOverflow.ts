export function resolvePageOverflow(page: number, totalCount: number, pageSize: number): number | null {
  if (totalCount === 0) {
    return null;
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  if (page <= totalPages) {
    return null;
  }

  return totalPages;
}
