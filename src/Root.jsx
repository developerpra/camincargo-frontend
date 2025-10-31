import App from "./App";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MasterCategory from "./MasterCategory";

export default function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/products" element={<App />} />
        <Route path="/master-category" element={<MasterCategory />} />
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
