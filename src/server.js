require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const itemRoutes = require("./routes/itemRoutes");
const { verifyDatabaseConnection } = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errors");

const app = express();
const port = Number(process.env.PORT || 3000);
const CANONICAL_LOCAL_HOST = (process.env.CANONICAL_LOCAL_HOST || "localhost").trim();
const LOCAL_HOST_ALIASES = new Set(["localhost", "127.0.0.1"]);

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
      },
    },
  })
);
app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// ── Canonical host redirect ──────────────────────────────────────
// Ensures both localhost and 127.0.0.1 resolve to the same origin
// so sessionStorage, caching, and CSP behave identically.
app.use((req, res, next) => {
  if (!LOCAL_HOST_ALIASES.has(req.hostname)) {
    next();
    return;
  }

  if (req.hostname === CANONICAL_LOCAL_HOST) {
    next();
    return;
  }

  const hostHeader = req.get("host") || "";
  const portMatch = hostHeader.match(/:(\d+)$/);
  const portSuffix = portMatch ? `:${portMatch[1]}` : "";
  res.redirect(308, `${req.protocol}://${CANONICAL_LOCAL_HOST}${portSuffix}${req.originalUrl}`);
});

// ── Static files ─────────────────────────────────────────────────
// Use no-cache so the browser always revalidates with the server
// (etag ensures it still returns 304 when files haven't changed).
app.use(
  express.static(path.join(__dirname, "../public"), {
    etag: true,
    maxAge: 0,
    setHeaders(res) {
      res.setHeader("Cache-Control", "no-cache");
    },
  })
);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/items", itemRoutes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    await verifyDatabaseConnection();
    app.listen(port, () => {
      console.log(`Server is running on http://${CANONICAL_LOCAL_HOST}:${port}/index.html`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
