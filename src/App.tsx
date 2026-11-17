import { BrowserRouter, Routes, Route } from "react-router-dom";

import StatsPage from "./pages/StatsPage";
import ShopPage from "./pages/ShopPage";
import CreatorCodePage from "./pages/CreatorCodePage";
import CosmeticsPage from "./pages/CosmeticsPage";
import IslandsPage from "./pages/IslandsPage";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
const TournamentsPage = lazy(() => import("./pages/TournamentsPage"));

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
      <SidebarProvider style={{ "--header-height": "4rem" } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
      <SiteHeader />
      <div className="flex-1 p-4 md:p-8">
      <Routes>
        <Route path="/" element={<StatsPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/creator-code" element={<CreatorCodePage />} />
        <Route path="/islands" element={<IslandsPage />} />
        <Route path="/cosmetics" element={<CosmeticsPage />} />
        <Route path="/tournaments" element={<Suspense fallback={<p role="status">Cargando torneos…</p>}><TournamentsPage /></Suspense>} />
      </Routes>
      </div>
      </SidebarInset>
      </SidebarProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
