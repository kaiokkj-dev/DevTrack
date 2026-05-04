const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const passport = require("passport");

// PÁGINAS
router.get("/login", (req, res) => {
  res.render("login", { query: req.query });
});
router.get("/register", (req, res) => {
  res.render("register", { query: req.query });
});
// LOGIN NORMAL
router.post("/login", authController.login);
// REGISTER
router.post("/register", authController.register);
// LOGOUT
router.get("/logout", authController.logout);
// ========================
// LOGIN COM GOOGLE
// ========================
// iniciar login google
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
// callback do google
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    req.session.userId = req.user.id;
    req.session.userEmail = req.user.email;
    res.redirect("/dashboard?success=Login com Google realizado");
  }
);

module.exports = router;