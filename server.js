const express = require("express");
const path = require("path");
const db = require("./database/db");
const session = require("express-session");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "devtrack_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.static("public"));

// REGISTRAR
app.get("/", (req, res) => {
  res.redirect("/register");
});

app.get("/register", (req, res) => {
  res.render("register");
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
  res.render("login");
});
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.redirect("/login?error=empty");
  }
  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, user) => {
      if (err) {
        console.error("Erro no login:", err.message);
        return res.redirect("/login?error=server");
      }
      if (!user) {
        return res.redirect("/login?error=invalid");
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
      res.render("dashboard", {
        user: req.session.userEmail,
        activities: activities
      });
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

// DELETE 
app.post("/activities/delete/:id", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  const activityId = req.params.id;
  db.run(
    "DELETE FROM activities WHERE id = ? AND user_id = ?",
    [activityId, req.session.userId],
    function (err) {
      if (err) {
        console.error("Erro ao deletar atividade:", err.message);
        return res.send("Erro ao deletar atividade.");
      }
      res.redirect("/dashboard");
    }
  );
});

// EDIT
app.get("/activities/edit/:id", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  const activityId = req.params.id;
  db.get(
    "SELECT * FROM activities WHERE id = ? AND user_id = ?",
    [activityId, req.session.userId],
    (err, activity) => {
      if (err) {
        console.error("Erro ao buscar atividade:", err.message);
        return res.send("Erro ao carregar atividade.");
      }
      if (!activity) {
        return res.send("Atividade não encontrada.");
      }
      res.render("edit", { activity });
    }
  );
});

app.post("/activities/update/:id", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  const activityId = req.params.id;
  const { description, hours, date } = req.body;
  if (!description || !hours || !date) {
    return res.send("Preencha todos os campos.");
  }
  db.run(
    "UPDATE activities SET description = ?, hours = ?, date = ? WHERE id = ? AND user_id = ?",
    [description, hours, date, activityId, req.session.userId],
    function (err) {
      if (err) {
        console.error("Erro ao atualizar atividade:", err.message);
        return res.send("Erro ao atualizar atividade.");
      }
      res.redirect("/dashboard");
    }
  );
});

app.listen(5000, () => {
  console.log("Servidor rodando em http://localhost:5000");
});