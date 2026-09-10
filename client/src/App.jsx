import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";
import Courses from "./pages/Courses.jsx";
import CourseDetail from "./pages/CourseDetail.jsx";
import CourseLearn from "./pages/CourseLearn.jsx";
import AssessmentPage from "./pages/AssessmentPage.jsx";
import Recipes from "./pages/Recipes.jsx";
import RecipeDetail from "./pages/RecipeDetail.jsx";
import Booklets from "./pages/Booklets.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Admin from "./pages/Admin.jsx";
import PurchaseResult from "./pages/PurchaseResult.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route
            path="/learn/courses/:slug"
            element={
              <ProtectedRoute>
                <CourseLearn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learn/assessments/:assessmentId"
            element={
              <ProtectedRoute>
                <AssessmentPage />
              </ProtectedRoute>
            }
          />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/:slug" element={<RecipeDetail />} />
          <Route path="/booklets" element={<Booklets />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["ADMIN", "INSTRUCTOR"]}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="/purchase/:result" element={<PurchaseResult />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <span>Mentora — learning &amp; guidance for every discipline</span>
          <span className="muted">Engineering Tools · Programming · Recipes</span>
        </div>
      </footer>
    </>
  );
}
