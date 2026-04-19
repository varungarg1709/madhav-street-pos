const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const supabase = createClient(
  "https://nxxjqhaszlrtxcainlqo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54eGpxaGFzemxydHhjYWlubHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDI2ODgsImV4cCI6MjA4OTY3ODY4OH0.7Ci8E6aJWcLxQP63Z_lCDNemsEGpVklQVGvJnroOjpw"
);

app.get("/", (req, res) => {
  res.send("Madhav Street Kitchen API Running 🚀");
});

// Create Order API
app.post("/create-order", async (req, res) => {
  try {
    const { orderedBy, items } = req.body;

    if (!orderedBy || !items || items.length === 0) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const { data, error } = await supabase
      .from("kitchen_orders")
      .insert([
        {
          ordered_by: orderedBy,
          items: items
        }
      ]);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});