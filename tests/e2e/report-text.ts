import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function reportText(bytes: Buffer) {
  const task = getDocument({ data: new Uint8Array(bytes) });
  try {
    const doc = await task.promise;
    return await Promise.all(Array.from({ length: doc.numPages }, async (_, index) =>
      (await (await doc.getPage(index + 1)).getTextContent()).items
        .map(item => 'str' in item ? item.str : '').join(' ').replace(/\s+/g, ' ')));
  } finally {
    await task.destroy();
  }
}
