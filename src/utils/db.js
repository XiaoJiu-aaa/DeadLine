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
