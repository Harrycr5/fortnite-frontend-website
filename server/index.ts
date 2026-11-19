
import express from "express";
import dotenv from "dotenv";
import { z } from "zod";
import { analytics } from "./analytics.ts";
import { cosmetics } from "./cosmetics.ts";
import { cashShop } from "./shop-cash.ts";
import { tournaments } from "./tournaments.ts";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use("/api", analytics);
app.use("/api", cosmetics);
app.use("/api", cashShop);
app.use("/api", tournaments);

// The public shop endpoint needs no API key. Cache briefly to avoid fetching
// the entire catalog for every page visit; never serve beyond the UTC refresh.
let shopCache: { payload: unknown; expires: number } | undefined;

app.get("/api/shop", async (req, res) => {
  if (req.query.language !== undefined && req.query.language !== "es") {
    return res.status(400).json({ error: "La tienda está disponible en español (language=es)." });
  }
  if (shopCache && shopCache.expires > Date.now()) {
    return res.json(shopCache.payload);
  }
  try {
    const response = await fetch("https://fortnite-api.com/v2/shop?language=es", {
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      return res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 429
          ? "Se alcanzó el límite de consultas. Inténtalo de nuevo en unos momentos."
          : "Fortnite API no pudo cargar la tienda. Inténtalo de nuevo más tarde.",
      });
    }
    const payload = await response.json();
    if (!Array.isArray(payload?.data?.entries)) {
      return res.status(502).json({ error: "Fortnite API devolvió una tienda inválida." });
    }
    const now = Date.now();
    const nextDay = new Date(now);
    nextDay.setUTCHours(24, 0, 0, 0);
    shopCache = { payload, expires: Math.min(now + 60000, nextDay.getTime()) };
    return res.json(payload);
  } catch {
    return res.status(502).json({ error: "No se pudo conectar con Fortnite API. Inténtalo de nuevo en unos momentos." });
  }
});

const statsQuerySchema = z.object({
  name: z.string({ error: "Debes proporcionar un nombre de jugador." })
    .trim()
    .min(1, "Debes proporcionar un nombre de jugador.")
    .max(100, "El nombre del jugador debe tener como máximo 100 caracteres."),
  accountType: z.enum(["epic", "psn", "xbl"], {
    error: "accountType debe ser epic, psn o xbl.",
  }).default("epic"),
  timeWindow: z.enum(["lifetime", "season"], {
    error: "timeWindow debe ser lifetime o season.",
  }).default("lifetime"),
});

app.get("/api/stats", async (req, res) => {
  try {
    const query = statsQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: query.error.issues[0].message });
    }

    if (!process.env.FORTNITE_API_KEY?.trim()) {
      return res.status(503).json({
        error: "Falta configurar FORTNITE_API_KEY en el archivo .env del backend.",
      });
    }

    const params = new URLSearchParams(query.data);

    const response = await fetch(
      `https://fortnite-api.com/v2/stats/br/v2?${params}`,
      {
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: process.env.FORTNITE_API_KEY ?? "",
        },
      }
    );

    const body = await response.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return res.status(502).json({
        error: "Fortnite API devolvió una respuesta vacía o inválida. Inténtalo de nuevo más tarde.",
      });
    }

    if (!response.ok) {
      const messages: Record<number, string> = {
        401: "La clave de Fortnite API no es válida. Revisa FORTNITE_API_KEY en el backend.",
        403: "Este jugador no permite consultar sus estadísticas o la clave no tiene acceso.",
        404: "No se encontró el jugador. Comprueba el nombre y la plataforma seleccionada.",
        429: "Se alcanzó el límite de consultas. Espera un momento y vuelve a intentarlo.",
      };
      return res.status(response.status).json({
        error: messages[response.status] ?? "No se pudieron consultar las estadísticas en Fortnite API.",
      });
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Error consultando Fortnite API:", error);

    return res.status(500).json({
      error: "Error interno del servidor",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
