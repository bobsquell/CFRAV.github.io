import { BrowserRouter, Routes, Route } from "react-router-dom";
import Simulator from "./Simulator.jsx";
import OffrePage from "./Offre.jsx";
import HomePage from "./HomePage.jsx";
import PricesAdmin from "./PricesAdmin.jsx";
import { PricesProvider } from "./PricesContext.jsx";
import { ConfigProvider } from "./ConfigContext.jsx";

function App() {
  return (
    <ConfigProvider>
      <PricesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/offre" element={<OffrePage />} />
            <Route path="/simulateur" element={<Simulator />} />
            <Route path="/admin" element={<PricesAdmin />} />
          </Routes>
        </BrowserRouter>
      </PricesProvider>
    </ConfigProvider>
  );
}

export default App;
