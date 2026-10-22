/**
 * Reads a Blob from either realm as text. Which realm the test sees depends on the Node version:
 * on Node 24 it is jsdom's Blob (no text(); FileReader works), on Node 22 Node's fetch Blob (text()
 * works, and jsdom's FileReader rejects it). CI failed on exactly that.
 */
export function readBlobText(blob: Blob): Promise<string> {
  if (typeof (blob as Partial<Blob>).text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(new Error('read failed'));
    };
    reader.readAsText(blob);
  });
}
