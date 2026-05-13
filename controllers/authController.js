const db = require("../database/db");
const bcrypt = require("bcrypt");

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.redirect("/login?error=Preencha email e senha");
  }

  try {
    const { data: user, error } = await db
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.redirect("/login?error=Email ou senha inválidos");
    }

    const senhaCorreta = await bcrypt.compare(password, user.password);

    if (!senhaCorreta) {
      return res.redirect("/login?error=Email ou senha inválidos");
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;

    return res.redirect("/dashboard?success=Login realizado com sucesso");
  } catch (err) {
    console.error("Erro no login:", err.message);
    return res.redirect("/login?error=Erro interno no login");
  }
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

    const { error } = await db
      .from("users")
      .insert([
        {
          email,
          password: hash,
        },
      ]);

    if (error) {
      console.error("Erro ao cadastrar:", error.message);
      return res.redirect("/register?error=Esse email já está em uso");
    }

    return res.redirect("/login?success=Conta criada com sucesso");
  } catch (err) {
    console.error("Erro no cadastro:", err.message);
    return res.redirect("/register?error=Erro ao cadastrar");
  }
};

// LOGOUT
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};