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

// SAUDAÇÃO DINÂMICA
function getGreeting() {
  const hour = new Date().getHours(); 
  if (hour >= 5 && hour < 12) {
    return "Bom dia";
  } else if (hour >= 12 && hour < 18) {
    return "Boa tarde";
  } else {
    return "Boa noite";
  }
}

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
    return res.redirect("/register?error=Preencha todos os campos");
  }
  if (password.length < 6) {
    return res.redirect("/register?error=A senha deve ter no mínimo 6 caracteres");
  }
  db.run(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, password],
    function (err) {
      if (err) {
        console.error("Erro ao cadastrar usuário:", err.message);
        return res.redirect("/register?error=Esse email já está em uso");
      }
      return res.redirect("/login?success=Conta criada com sucesso");
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
    return res.redirect("/login?error=Preencha email e senha");
  }
  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, user) => {
      if (err) {
        console.error("Erro no login:", err.message);
        return res.redirect("/login?error=Erro interno no login");
      }
      if (!user) {
        return res.redirect("/login?error=Email ou senha inválidos");
      }
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      return res.redirect("/dashboard?success=Login realizado com sucesso");
    }
  );
});

// DASHBOARD
app.get("/dashboard", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  const userEmail = req.session.userEmail;
  const greeting = getGreeting();
  db.all(
    "SELECT * FROM activities WHERE user_id = ? ORDER BY date DESC",
    [req.session.userId],
    (err, activities) => {
      if (err) {
        console.error("Erro ao buscar atividades:", err.message);
        return res.send("Erro ao buscar atividades.");
      }
      const totalActivities = activities.length;
      const totalHours = activities.reduce((sum, activity) => {
        return sum + Number(activity.hours);
      }, 0);
      const latestActivity = activities.length > 0 ? activities[0] : null;
      res.render("dashboard", {
        user: userEmail,
        activities,
        totalActivities,
        totalHours,
        latestActivity,
        greeting,
      });
    }
  );
});

// CRIAR ATIVIDADE
app.post("/activities", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  const { description, hours, date } = req.body;
  if (!description || !hours || !date) {
    return res.redirect("/dashboard?error=Preencha todos os campos");
  }
  db.run(
    "INSERT INTO activities (user_id, description, hours, date) VALUES (?, ?, ?, ?)",
    [req.session.userId, description, hours, date],
    (err) => {
      if (err) {
        console.error("Erro ao salvar atividade:", err.message);
        return res.redirect("/dashboard?error=Erro ao salvar atividade");
      }
      return res.redirect("/dashboard?success=Atividade criada com sucesso");
    }
  );
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
        return res.redirect("/dashboard?error=Erro ao excluir atividade");
      }
      return res.redirect("/dashboard?success=Atividade excluída com sucesso");
    }
  );
});

// EDITAR - CARREGAR TELA
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
        return res.redirect("/dashboard?error=Erro ao carregar atividade");
      }
      if (!activity) {
        return res.redirect("/dashboard?error=Atividade não encontrada");
      }
      res.render("edit", { activity });
    }
  );
});

// EDITAR - SALVAR ALTERAÇÕES
app.post("/activities/update/:id", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  const activityId = req.params.id;
  const { description, hours, date } = req.body;
  if (!description || !hours || !date) {
    return res.redirect("/dashboard?error=Preencha todos os campos");
  }

  db.run(
    "UPDATE activities SET description = ?, hours = ?, date = ? WHERE id = ? AND user_id = ?",
    [description, hours, date, activityId, req.session.userId],
    function (err) {
      if (err) {
        console.error("Erro ao atualizar atividade:", err.message);
        return res.redirect("/dashboard?error=Erro ao atualizar atividade");
      }
      return res.redirect("/dashboard?success=Atividade atualizada com sucesso");
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
    res.redirect("/login?success=Logout realizado com sucesso");
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});