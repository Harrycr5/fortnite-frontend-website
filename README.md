# Ejecutar el proyecto

En PowerShell, desde la carpeta del proyecto:

```powershell
npm.cmd install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Obtén tu clave en [Fortnite-API Dashboard](https://dash.fortnite-api.com/) y colócala en `.env`:

```dotenv
FORTNITE_API_KEY=tu_clave
```

Inicia el frontend y el backend juntos:

```powershell
npm.cmd run dev:full
```

Abre la URL local que muestra Vite.
