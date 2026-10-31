const db = require('../server/db/database');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name='forum_posts'").get());
