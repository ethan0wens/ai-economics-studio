export function exportName(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-/, '').slice(0, 100).replace(/-$/, '');
  return !slug || /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(slug) ? 'environment' : slug;
}

export function download(content: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  try {
    link.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
}
