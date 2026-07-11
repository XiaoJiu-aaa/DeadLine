import Dexie from 'dexie'

const db = new Dexie('TodoCalendarFiles')

db.version(1).stores({
  attachments: 'id',
})

export async function saveFile(id, file) {
  await db.attachments.put({
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  })
}

export async function getFile(id) {
  return db.attachments.get(id)
}

export async function deleteFile(id) {
  return db.attachments.delete(id)
}

export async function deleteFiles(ids) {
  return db.attachments.bulkDelete(ids)
}

export async function clearOldAttachments() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const all = await db.attachments.toArray()
  const old = all.filter(a => (a.createdAt || 0) < cutoff)
  const ids = old.map(a => a.id)
  if (ids.length) await db.attachments.bulkDelete(ids)
  return ids.length
}
