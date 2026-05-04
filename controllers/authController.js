const db = require("../database/db");
const bcrypt = require("bcrypt");

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.redirect("/login?error=Preencha email e senha");
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) {
      console.error("Erro no login:", err.message);
      return res.redirect("/login?error=Erro interno no login");
    }

    if (!user) {
      return res.redirect("/login?error=Email ou senha inválidos");
    }

    const senhaCorreta = await bcrypt.compare(password, user.password);

    if (!senhaCorreta) {
      return res.redirect("/login?error=Email ou senha inválidos");
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;

    return res.redirect("/dashboard?success=Login realizado com sucesso");
  });
};

// REGISTER
exports.register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.redirect("/register?error=Preencha todos os campos");
  }

  if (password.length < 6) {
    return res.redirect("/register?error=A senha deve ter no mínimo 6 caracteres");
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, hash],
      function (err) {
        if (err) {
          console.error("Erro ao cadastrar:", err.message);
          return res.redirect("/register?error=Esse email já está em uso");
        }

        res.redirect("/login?success=Conta criada com sucesso");
      }
    );
  } catch (error) {
    console.error("Erro no bcrypt:", error.message);
    res.redirect("/register?error=Erro ao cadastrar");
  }
};
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};