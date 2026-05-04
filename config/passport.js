const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("../database/db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
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