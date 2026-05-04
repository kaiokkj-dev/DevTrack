const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("../database/db");

passport.use(
  new GoogleStrategy(
    {
clientID: "675596211966-cq2m6sfjp0ihe6jus9r9h4cat1710rvl.apps.googleusercontent.com",
clientSecret: "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",
callbackURL: "http://localhost:3000/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err) return done(err);
        if (user) {
          return done(null, user);
        }
        db.run(
          "INSERT INTO users (email, password) VALUES (?, ?)",
          [email, "google"],
          function (err) {
            if (err) return done(err);
            db.get(
              "SELECT * FROM users WHERE id = ?",
              [this.lastID],
              (err, newUser) => {
                return done(err, newUser);
              }
            );
          }
        );
      });
    }
  )
);
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
    done(err, user);
  });
});
module.exports = passport;