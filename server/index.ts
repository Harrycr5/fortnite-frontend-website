
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3001;

app.use(express.json());

app.get("/api/stats", async (req, res) => {
  try {
    const { name, accountType = "epic", timeWindow = "lifetime" } = req.query;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        error: "Debes proporcionar un nombre de jugador",
      });
    }

    const params = new URLSearchParams({
      name,
      accountType: String(accountType),
      timeWindow: String(timeWindow),
    });


    const response = await fetch(
      `https://fortnite-api.com/v2/stats/br/v2?${params}`,
      {
        headers: {
          Authorization: process.env.FORTNITE_API_KEY ?? "",
        },
      }
    );

    const data = await response.json();

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
