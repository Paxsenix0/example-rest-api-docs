const express = require('express');
const cors = require("cors");
const helmet = require('helmet');
const path = require('path');
const axios = require('axios');

const testRouter = require("./routes/test.js");

const rateLimiter = require('./middleware/rateLimiter.js');

process.on("uncaughtException", (err) => console.error("Uncaught Exception:", err));
process.on("unhandledRejection", (reason, promise) => console.error("Unhandled Rejection at:", promise, "reason:", reason));

const app = express();
app.set('trust proxy', true);
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      'https://cdn.tailwindcss.com',
      'https://cdn.jsdelivr.net',
      'https://cdnjs.cloudflare.com',
      'https://challenges.cloudflare.com',
      'https://static.cloudflareinsights.com',
      "'unsafe-inline'"
    ],
    frameSrc: [
      "'self'",
      'https://challenges.cloudflare.com',
    ],
    imgSrc: [
      "'self'",
      'https://api.paxsenix.biz.id',
      'https://cdn.jsdelivr.net',
    ],
    connectSrc: [
      "'self'",
      'https://static.cloudflareinsights.com'
    ]
  }
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(express.json());
app.use(rateLimiter.middleware());

app.get('/', (req, res) => res.status(404).json({ message: "No, go to /docs instead." }));
app.get('/docs', (req, res) => res.sendFile(path.join(process.cwd(), "public", "docs", "index.html")));
app.get('/docs/styles.css', (req, res) => res.sendFile(path.join(process.cwd(), "public", "docs", "styles.css")));
app.get('/docs/app.js', (req, res) => res.sendFile(path.join(process.cwd(), "public", "docs", "app.js")));
app.get('/docs/docs/styles.css', (req, res) => res.sendFile(path.join(process.cwd(), "public", "docs", "styles.css")));
app.get('/docs/docs/app.js', (req, res) => res.sendFile(path.join(process.cwd(), "public", "docs", "app.js")));
app.get('/swagger.json', (req, res) => res.sendFile(path.join(process.cwd(), "public", "swagger.json")));

app.use("/test", testRouter);

app.get("*", (req, res) => {
  res.status(404).json({
    creator: "@PaxSenix",
    message: "Invalid endpoint, are you lost? :(",
    docs: "/docs",
    ok: false
  });
});

app.use((err, req, res, next) => {
  res.status(500).json({ 
    creator: "@PaxSenix",
    ok: false,
    message: 'Internal server error'
  });
});

app.listen(3000, () => {
  console.log('App Listening on port 3000');
});