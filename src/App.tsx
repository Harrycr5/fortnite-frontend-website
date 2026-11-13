import { BrowserRouter, Routes, Route } from "react-router-dom";

import StatsPage from "./pages/StatsPage";
import ShopPage from "./pages/ShopPage";
import CreatorCodePage from "./pages/CreatorCodePage";
import CosmeticsPage from "./pages/CosmeticsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StatsPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/creator-code" element={<CreatorCodePage />} />
        <Route path="/cosmetics" element={<CosmeticsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;