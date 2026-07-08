import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// Stockage des fichiers uploadés. Abstraction unique : le jour où on passe à un
// bucket externe (S3/R2), seul ce module change — la BDD garde un chemin relatif.
const ROOT = process.env.UPLOAD_DIR || '/opt/atline/data/uploads'

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain', csv: 'text/csv',
  webm: 'video/webm', mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v',
}

export function mimeFor(format: string): string {
  return MIME[format.toLowerCase()] ?? 'application/octet-stream'
}

function safe(rel: string): string {
  // empêche le path traversal (../)
  return path.normalize(rel).replace(/^(\.\.([/\\]|$))+/, '')
}

export async function saveUpload(userId: string, file: File): Promise<{ relPath: string; format: string }> {
  const format = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  const rel = path.posix.join(userId, `${randomUUID()}.${format}`)
  const abs = path.join(ROOT, rel)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()))
  return { relPath: rel, format }
}

export async function readUpload(relPath: string): Promise<Buffer> {
  return fs.readFile(path.join(ROOT, safe(relPath)))
}

export async function deleteUpload(relPath: string): Promise<void> {
  try { await fs.unlink(path.join(ROOT, safe(relPath))) } catch { /* déjà absent */ }
}
