import express from "express";
import { createRequestHandler } from "@react-router/express";

const app = express();
const PORT = process.env.PORT || 3000;
const build = await import("./build/server/index.js");

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
});

app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

app.use(express.static("build/client"));

const rrHandler = createRequestHandler({ build });

app.all("*", async (req, res, next) => {
  try {
    return await rrHandler(req, res, next);
  } catch (error) {
    console.error("REQUEST HANDLER ERROR:", error);
    return res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});