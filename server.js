const express = require("express");
const path = require("path");
const db = require("./database/db");
const session = require("express-session");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "devtrack_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// REGISTRAR
app.get("/", (req, res) => {
  res.redirect("/register");
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.send("Preencha email e senha.");
  }
  db.run(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, password],
    function (err) {
      if (err) {
        console.error("Erro ao cadastrar usuário:", err.message);
        return res.send("Erro ao cadastrar usuário. Talvez esse email já exista.");
      }
      console.log("Usuário cadastrado com ID:", this.lastID);
      res.redirect("/login");
    }
  );
});

// LOGIN
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.send("Preencha email e senha.");
  }
  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, user) => {
      if (err) {
        console.error("Erro no login:", err.message);
        return res.send("Erro ao fazer login.");
      }
      if (!user) {
        return res.send("Email ou senha inválidos.");
      }
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      res.redirect("/dashboard");
    }
  );
});

// DASHBOARD
app.get("/dashboard", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  db.all(
    "SELECT * FROM activities WHERE user_id = ? ORDER BY date DESC, id DESC",
    [req.session.userId],
    (err, activities) => {
      if (err) {
        console.error("Erro ao buscar atividades:", err.message);
        return res.send("Erro ao carregar dashboard.");
      }
      let html = `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
          <meta charset="UTF-8">
          <title>Dashboard</title>
        </head>
        <body>
          <h1>Bem-vindo ao DevTrack</h1>
          <p>Usuário: ${req.session.userEmail}</p>
          <h2>Adicionar atividade</h2>
          <form action="/activities" method="POST">
            <input type="text" name="description" placeholder="Descrição" required>
            <br><br>
            <input type="number" name="hours" placeholder="Horas" step="0.5" required>
            <br><br>
            <input type="date" name="date" required>
            <br><br>
            <button type="submit">Adicionar</button>
          </form>
          <h2>Minhas atividades</h2>
      `;
      if (activities.length === 0) {
        html += "<p>Nenhuma atividade cadastrada.</p>";
      } else {
        html += "<ul>";
        activities.forEach((activity) => {
          html += `
            <li>
              ${activity.description} -
              ${activity.hours} horas -
              ${activity.date}
            </li>
          `;
        });
        html += "</ul>";
      }
      html += `
          <br><a href="/logout">Sair</a>
        </body>
        </html>
      `;
      res.send(html);
    }
  );
});

// CRIAR ACTIVITY
app.post("/activities", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  const { description, hours, date } = req.body;
  if (!description || !hours || !date) {
    return res.send("Preencha todos os campos.");
  }
  db.run(
    "INSERT INTO activities (user_id, description, hours, date) VALUES (?, ?, ?, ?)",
    [req.session.userId, description, hours, date],
    (err) => {
      if (err) {
        console.error("Erro ao salvar atividade:", err.message);
        return res.send("Erro ao salvar atividade.");
      }
      res.redirect("/dashboard");
    }
  );
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao fazer logout:", err.message);
      return res.send("Erro ao sair.");
    }
    res.redirect("/login");
  });
});
app.listen(5000, () => {
  console.log("Servidor rodando em http://localhost:5000");
});