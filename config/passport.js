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
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        const { data: existingUser, error: findError } = await db
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (existingUser) {
          return done(null, existingUser);
        }

        if (findError && findError.code !== "PGRST116") {
          return done(findError);
        }

        const { data: newUser, error: insertError } = await db
          .from("users")
          .insert([
            {
              email,
              password: "google",
            },
          ])
          .select()
          .single();

        if (insertError) {
          return done(insertError);
        }

        return done(null, newUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { data: user, error } = await db
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return done(error);
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
});

module.exports = passport;