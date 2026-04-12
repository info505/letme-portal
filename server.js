import express from "express";
import { createRequestHandler } from "@react-router/express";

const app = express();
const PORT = process.env.PORT || 3000;
const build = await import("./build/server/index.js");

app.use(express.static("build/client"));

app.all("*", createRequestHandler({ build }));

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});