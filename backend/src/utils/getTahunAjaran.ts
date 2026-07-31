export function getTahunAjaran(): string {
  const y = new Date().getFullYear();
  return new Date().getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}
