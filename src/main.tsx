import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import TrainingApp from "./pages/TrainingApp.tsx";
import ColdCallTree from "./pages/ColdCallTree.tsx";
import BasicScript from "./pages/BasicScript.tsx";
import Login from "./pages/Login.tsx";
import RequireAuth from "./lib/RequireAuth.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <TrainingApp />
            </RequireAuth>
          }
        />
        <Route
          path="/cold-call-tree"
          element={
            <RequireAuth>
              <ColdCallTree />
            </RequireAuth>
          }
        />
        <Route
          path="/cold-call-tree/script"
          element={
            <RequireAuth>
              <BasicScript />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
