const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.join(__dirname, "devtrack.db")

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Erro ao conectar ao banco:", err.message);
    } else {
        console.log("Conectado ao banco SQlite.");
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        email TEXT UNIQUE NOT NULL,           
        password TEXT NOT NULL                
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        user_id INTEGER NOT NULL,             
        description TEXT NOT NULL,            
        hours REAL NOT NULL,                  
        date TEXT NOT NULL,                   

        -- ligação com a tabela de usuários
        FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
});

module.exports = db