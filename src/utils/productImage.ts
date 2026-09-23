/** Return browser-friendly image URLs for common Google Drive share links. */
export function getProductImageCandidates(value?: string | null): string[] {
  const source = value?.trim();
  if (!source) return [];

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return [source];
  }

  const driveHosts = new Set(["drive.google.com", "docs.google.com", "drive.usercontent.google.com"]);
  if (!driveHosts.has(url.hostname)) return [source];

  const id = url.searchParams.get("id") || url.pathname.match(/\/d\/([^/]+)/)?.[1];
  if (!id) return [source];

  const resourceKey = url.searchParams.get("resourcekey");
  const resourceKeyQuery = resourceKey ? "&resourcekey=" + encodeURIComponent(resourceKey) : "";
  return [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600${resourceKeyQuery}`,
    `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}${resourceKeyQuery}`,
  ];
}

export function normalizeProductImageUrl(value?: string | null): string | undefined {
  return getProductImageCandidates(value)[0];
}
