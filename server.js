const express = require("express");
const path = require("path");
const db = require("./database/db");
const session = require("express-session");
const passport = require("./config/passport");

const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middlewares/authMiddleware");

const app = express();

// CONFIG
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));

// SESSION TEM QUE VIR PRIMEIRO
app.use(
  session({
    secret: "devtrack_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// PASSPORT VEM DEPOIS DA SESSION
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("public"));

// ROTAS DE AUTH
app.use("/", authRoutes);

// SAUDAÇÃO DINÂMICA
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

// PÁGINA INICIAL
app.get("/", (req, res) => {
  res.redirect("/login");
});

// DASHBOARD
app.get("/dashboard", authMiddleware, (req, res) => {
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
app.post("/activities", authMiddleware, (req, res) => {
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

// DELETAR ATIVIDADE
app.post("/activities/delete/:id", authMiddleware, (req, res) => {
  const activityId = req.params.id;

  db.run(
    "DELETE FROM activities WHERE id = ? AND user_id = ?",
    [activityId, req.session.userId],
    (err) => {
      if (err) {
        console.error("Erro ao deletar atividade:", err.message);
        return res.redirect("/dashboard?error=Erro ao excluir atividade");
      }

      return res.redirect("/dashboard?success=Atividade excluída com sucesso");
    }
  );
});

// EDITAR - CARREGAR TELA
app.get("/activities/edit/:id", authMiddleware, (req, res) => {
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
app.post("/activities/update/:id", authMiddleware, (req, res) => {
  const activityId = req.params.id;
  const { description, hours, date } = req.body;

  if (!description || !hours || !date) {
    return res.redirect("/dashboard?error=Preencha todos os campos");
  }

  db.run(
    "UPDATE activities SET description = ?, hours = ?, date = ? WHERE id = ? AND user_id = ?",
    [description, hours, date, activityId, req.session.userId],
    (err) => {
      if (err) {
        console.error("Erro ao atualizar atividade:", err.message);
        return res.redirect("/dashboard?error=Erro ao atualizar atividade");
      }

      return res.redirect("/dashboard?success=Atividade atualizada com sucesso");
    }
  );
});

// START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});