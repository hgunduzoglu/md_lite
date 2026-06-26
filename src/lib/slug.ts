// Slugs are generated client-side and only need to be unique, not readable —
// the database unique constraint on documents.slug is the real guarantee. We
// combine a short timestamp component with random characters to make a
// collision vanishingly unlikely on insert.

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomString(length: number): string {
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return result;
}

export function generateSlug(): string {
  const time = Date.now().toString(36);
  return `${time}-${randomString(6)}`;
}
