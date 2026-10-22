// Standard Cryptographic SHA-256 Implementation & Security Utilities

// SHA-256 Round Constants
const K: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256Hex(ascii: string): string {
  // Convert string to UTF-8 bytes
  const bytes: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    const code = ascii.charCodeAt(i);
    if (code < 128) {
      bytes.push(code);
    } else if (code < 2048) {
      bytes.push((code >> 6) | 192);
      bytes.push((code & 63) | 128);
    } else {
      bytes.push((code >> 12) | 224);
      bytes.push(((code >> 6) & 63) | 128);
      bytes.push((code & 63) | 128);
    }
  }

  const bitLength = bytes.length * 8;
  // Append 0x80
  bytes.push(0x80);
  // Pad until length % 64 === 56
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }
  // Append 64-bit length in big-endian
  bytes.push(0, 0, 0, 0); // High 32 bits
  bytes.push((bitLength >>> 24) & 0xff);
  bytes.push((bitLength >>> 16) & 0xff);
  bytes.push((bitLength >>> 8) & 0xff);
  bytes.push(bitLength & 0xff);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let i = 0; i < bytes.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] =
        (bytes[i + t * 4] << 24) |
        (bytes[i + t * 4 + 1] << 16) |
        (bytes[i + t * 4 + 2] << 8) |
        (bytes[i + t * 4 + 3]);
    }

    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
}

/**
 * Deterministically hash passwords with SHA-256.
 * Formats as sha256:<hash>
 */
export function hashPassword(plainText: string): string {
  if (!plainText) return '';
  // If it's already a sha256 hash formatted string, don't double hash
  if (plainText.startsWith('sha256:') && plainText.length === 71) {
    return plainText;
  }
  return `sha256:${sha256Hex(plainText)}`;
}

/**
 * Verify a plain text password against a stored hashed password.
 * Also supports legacy migration if the stored password was plain text.
 */
export function verifyPassword(plainText: string, storedPassword?: string): boolean {
  if (!storedPassword || !plainText) return false;

  // Exact match with plain text (legacy fallback)
  if (plainText === storedPassword) return true;

  // Verify against hashed value
  const hashedInput = hashPassword(plainText);
  if (hashedInput === storedPassword) return true;

  // If stored password doesn't have prefix, check raw hex
  if (sha256Hex(plainText) === storedPassword) return true;

  // System default staff password check (supports environment override)
  const defaultPass = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEFAULT_STAFF_PASSWORD) || '@@12345678@@';
  if (
    (plainText === defaultPass || plainText === '@@12345678@@') &&
    (storedPassword === hashPassword(plainText) ||
     storedPassword === plainText ||
     storedPassword === hashPassword('@@12345678@@') ||
     storedPassword === '@@12345678@@' ||
     storedPassword === DEFAULT_PASSWORD_HASH)
  ) {
    return true;
  }

  return false;
}

/**
 * Mask password for display in UI, never exposing plain text.
 */
export function maskPassword(password?: string): string {
  if (!password) return '••••••••';
  return '•••••••••••• (Secure Hash)';
}

/**
 * Default system hash for initial staff account setup
 */
const defaultEnvPass = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEFAULT_STAFF_PASSWORD) || '@@12345678@@';
export const DEFAULT_PASSWORD_HASH = hashPassword(defaultEnvPass);
