import { getDB } from '../lib/db'
import { seedDemoData } from '../lib/seed'

const db = getDB()

// Force re-seed: wipe existing data and insert fresh demo data
db.prepare('DELETE FROM email_chats').run()
db.prepare('DELETE FROM emails').run()
db.prepare('DELETE FROM events').run()
db.prepare('DELETE FROM projects').run()
db.prepare('DELETE FROM inquiries').run()

seedDemoData(db)

console.log('Demo data re-seeded.')
