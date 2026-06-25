import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const RESPONSES_FILE = path.join(DATA_DIR, "responses.json");
const FORM_FILE = path.join(DATA_DIR, "form.json");

if (!fs.existsSync(RESPONSES_FILE)) fs.writeFileSync(RESPONSES_FILE, "[]");
if (!fs.existsSync(FORM_FILE)) fs.writeFileSync(FORM_FILE, "{}");

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

app.use(cors());
app.use(express.json());

// ── Responses ──────────────────────────────────────────────
app.get("/api/responses", (req, res) => {
  res.json(read(RESPONSES_FILE));
});

app.post("/api/responses", (req, res) => {
  const list = read(RESPONSES_FILE);
  list.push(req.body);
  write(RESPONSES_FILE, list);
  res.json({ ok: true });
});

app.delete("/api/responses/:id", (req, res) => {
  const list = read(RESPONSES_FILE).filter(r => r._id !== req.params.id);
  write(RESPONSES_FILE, list);
  res.json({ ok: true });
});

// ── Form config ────────────────────────────────────────────
app.get("/api/form", (req, res) => {
  try { res.json(read(FORM_FILE)); }
  catch { res.json({}); }
});

app.post("/api/form", (req, res) => {
  write(FORM_FILE, req.body);
  res.json({ ok: true });
});

app.listen(3001, () => {
  console.log("API server running → http://localhost:3001");
});
