// server.js
const express = require("express");
const cors = require("cors");
const verifyToken = require("./middleware/authMiddleware");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();

// Configuración de CORS para múltiples orígenes (evita undefined)
const allowedOrigins = [
  "http://localhost:5173", // Desarrollo local Vite
  "http://localhost:3000", // Alternativo
].concat(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []);

const corsOptions = {
  origin: (origin, callback) => {
    // permitir requests sin origin (herramientas como curl / same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas API
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

app.get("/api/perfil", verifyToken, (req, res) => {
  res.json({
    mensaje: "Accediste a un endpoint protegido",
    usuario: req.user,
  });
});

const locationRoutes = require("./routes/locationRoutes");
app.use("/api/location", locationRoutes);

const flightRoutes = require("./routes/flightRoutes");
app.use("/api/flights", flightRoutes);

const cardRoutes = require("./routes/cardRoutes");
app.use("/api/cards", cardRoutes);

const searchFlightsRoutes = require("./routes/searchFlightRoutes");
app.use("/api/search-flights", searchFlightsRoutes);

const tiqueteRoutes = require("./routes/tiqueteRoutes");
app.use("/api/tiquetes", tiqueteRoutes);

const carritoRoutes = require("./routes/carritoRoutes");
app.use("/api/carrito", carritoRoutes);

const compraRoutes = require("./routes/compraRoutes");
app.use("/api/compra", compraRoutes);

// ==== Healthcheck / redirección al frontend ====
// Healthcheck simple en la raíz para evitar "Cannot GET /"
app.get("/", (req, res) => {
  return res.json({
    status: "ok",
    message: "Backend API running",
    frontend: process.env.FRONTEND_URL || null,
  });
});

// Redirigir opcionalmente al frontend desde /go-to-frontend
app.get("/go-to-frontend", (req, res) => {
  const frontend = process.env.FRONTEND_URL || "https://laboratorio-de-software.vercel.app";
  return res.redirect(frontend);
});

// ==== Servir build del frontend si existe (opcional) ====
// Busca en ../frontend/build y ../build (ajusta si tu build está en otra ruta)
const possibleBuildPaths = [
  path.join(__dirname, "..", "frontend", "build"),
  path.join(__dirname, "..", "build"),
];
const existingBuild = possibleBuildPaths.find((p) => fs.existsSync(p));

if (existingBuild) {
  app.use(express.static(existingBuild));
  app.get("*", (req, res) => {
    res.sendFile(path.join(existingBuild, "index.html"));
  });
}

// Puerto
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});