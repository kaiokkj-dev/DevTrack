require("dotenv").config();

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

app.use(
  session({
    secret: process.env.SESSION_SECRET || "devtrack_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, "public")));

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
app.get("/dashboard", authMiddleware, async (req, res) => {
  const userEmail = req.session.userEmail;
  const greeting = getGreeting();

  try {
    const { data: activities, error } = await db
      .from("activities")
      .select("*")
      .eq("user_id", req.session.userId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Erro ao buscar atividades:", error.message);
      return res.send("Erro ao buscar atividades.");
    }

    const totalActivities = activities.length;

    const totalHours = activities.reduce((sum, activity) => {
      return sum + Number(activity.hours);
    }, 0);

    const latestActivity =
      activities.length > 0 ? activities[0] : null;

    res.render("dashboard", {
      user: userEmail,
      activities,
      totalActivities,
      totalHours,
      latestActivity,
      greeting,
    });
  } catch (err) {
    console.error(err.message);
    return res.send("Erro interno.");
  }
});

// CRIAR ATIVIDADE
app.post("/activities", authMiddleware, async (req, res) => {
  const { description, hours, date } = req.body;

  if (!description || !hours || !date) {
    return res.redirect("/dashboard?error=Preencha todos os campos");
  }

  try {
    const { error } = await db
      .from("activities")
      .insert([
        {
          user_id: req.session.userId,
          description,
          hours,
          date,
        },
      ]);

    if (error) {
      console.error("Erro ao salvar atividade:", error.message);

      return res.redirect(
        "/dashboard?error=Erro ao salvar atividade"
      );
    }

    return res.redirect(
      "/dashboard?success=Atividade criada com sucesso"
    );
  } catch (err) {
    console.error(err.message);

    return res.redirect(
      "/dashboard?error=Erro interno"
    );
  }
});

// DELETAR ATIVIDADE
app.post("/activities/delete/:id", authMiddleware, async (req, res) => {
  const activityId = req.params.id;

  try {
    const { error } = await db
      .from("activities")
      .delete()
      .eq("id", activityId)
      .eq("user_id", req.session.userId);

    if (error) {
      console.error("Erro ao deletar atividade:", error.message);

      return res.redirect(
        "/dashboard?error=Erro ao excluir atividade"
      );
    }

    return res.redirect(
      "/dashboard?success=Atividade excluída com sucesso"
    );
  } catch (err) {
    console.error(err.message);

    return res.redirect(
      "/dashboard?error=Erro interno"
    );
  }
});

// EDITAR - CARREGAR TELA
app.get("/activities/edit/:id", authMiddleware, async (req, res) => {
  const activityId = req.params.id;

  try {
    const { data: activity, error } = await db
      .from("activities")
      .select("*")
      .eq("id", activityId)
      .eq("user_id", req.session.userId)
      .single();

    if (error || !activity) {
      return res.redirect(
        "/dashboard?error=Atividade não encontrada"
      );
    }

    res.render("edit", { activity });
  } catch (err) {
    console.error(err.message);

    return res.redirect(
      "/dashboard?error=Erro ao carregar atividade"
    );
  }
});

// EDITAR - SALVAR ALTERAÇÕES
app.post("/activities/update/:id", authMiddleware, async (req, res) => {
  const activityId = req.params.id;

  const { description, hours, date } = req.body;

  if (!description || !hours || !date) {
    return res.redirect(
      "/dashboard?error=Preencha todos os campos"
    );
  }

  try {
    const { error } = await db
      .from("activities")
      .update({
        description,
        hours,
        date,
      })
      .eq("id", activityId)
      .eq("user_id", req.session.userId);

    if (error) {
      console.error(
        "Erro ao atualizar atividade:",
        error.message
      );

      return res.redirect(
        "/dashboard?error=Erro ao atualizar atividade"
      );
    }

    return res.redirect(
      "/dashboard?success=Atividade atualizada com sucesso"
    );
  } catch (err) {
    console.error(err.message);

    return res.redirect(
      "/dashboard?error=Erro interno"
    );
  }
});
// FUNCIONA LOCALMENTE
if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

// EXPORTA PARA A VERCEL
module.exports = app;