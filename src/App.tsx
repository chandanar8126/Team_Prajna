import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateShipment from "./pages/CreateShipment";
import Shipments from "./pages/Shipments";
import LiveMap from "./pages/LiveMap";
import Suppliers from "./pages/Suppliers";
import Alerts from "./pages/Alerts";
import HospitalOrders from "./pages/HospitalOrders";
import FactoryOrders from "./pages/FactoryOrders";
import CompareFactories from "./pages/CompareFactories";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-shipment" element={<CreateShipment />} />
          <Route path="/shipments" element={<Shipments />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/hospital-orders" element={<HospitalOrders />} />
          <Route path="/factory-orders" element={<FactoryOrders />} />
          <Route path="/compare-factories" element={<CompareFactories />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
