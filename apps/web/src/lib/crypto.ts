const enc = new TextEncoder()

async function getSubtle(): Promise<SubtleCrypto> {
  // @ts-ignore
  if (globalThis.crypto?.subtle) return globalThis.crypto.subtle as SubtleCrypto
  throw new Error('WebCrypto not available')
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = await getSubtle()
  const baseKey = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, iterations: 100000 },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function b64(arr: ArrayBuffer): string { return Buffer.from(new Uint8Array(arr)).toString('base64') }
function fromB64(b: string): Uint8Array { return new Uint8Array(Buffer.from(b, 'base64')) }

export async function encryptStringAESGCM(plain: string, key: string): Promise<string> {
  const enc = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), 'AES-GCM', false, ['encrypt'])
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, enc.encode(plain))
  const buf = new Uint8Array(iv.byteLength + (ct as ArrayBuffer).byteLength)
  buf.set(iv, 0)
  buf.set(new Uint8Array(ct as ArrayBuffer), iv.byteLength)
  return btoa(String.fromCharCode(...buf))
}

export async function decryptStringAESGCM(ciph: string, key: string): Promise<string> {
  const raw = Uint8Array.from(atob(ciph), c => c.charCodeAt(0))
  const iv = raw.slice(0, 12)
  const data = raw.slice(12)
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), 'AES-GCM', false, ['decrypt'])
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, data)
  return new TextDecoder().decode(pt)
}

// Vault shim (feature-flagged)
export type VaultClient = {
  write: (path: string, data: Record<string, string>) => Promise<void>
  read: (path: string) => Promise<Record<string, string> | null>
}

export function getVaultClient(): VaultClient | null {
  const mode = String(process.env.SECRETS_VAULT_MODE||'').toLowerCase()
  if (!mode || mode === 'off') return null
  // Placeholder shim; integrate real KMS/Vault in production deployments
  return {
    async write(_path: string, _data: Record<string,string>) { /* no-op in CI */ },
    async read(_path: string) { return null },
  }
}


