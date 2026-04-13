import express from "express";
import { createRequestHandler } from "@react-router/express";

const app = express();

// ❗ WICHTIG: Railway Port verwenden
const PORT = process.env.PORT || 8080;

const build = await import("./build/server/index.js");

app.use(express.static("build/client"));

app.all("*", createRequestHandler({ build }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft auf Port ${PORT}`);
});