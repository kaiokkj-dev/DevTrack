const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

global.WebSocket = WebSocket;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;