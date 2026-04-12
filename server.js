import express from "express";
import { createRequestHandler } from "@react-router/node";

const app = express();
const PORT = process.env.PORT || 3000;

app.all("*", createRequestHandler({
  build: await import("./build/server/index.js")
}));

app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});