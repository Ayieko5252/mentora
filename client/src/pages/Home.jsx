import { Link } from "react-router-dom";

const DEPARTMENTS = [
  {
    to: "/courses?dept=engineering-tools",
    name: "Engineering Tools",
    blurb: "400+ professional tools — CAD, FEA, CFD, electronics, process & piping, civil & geotechnical, transportation, BIM/MEP, manufacturing — including a full PVsyst course.",
    meta: "$20 / course",
  },
  {
    to: "/courses?dept=programming",
    name: "Programming",
    blurb: "Software-development courses across languages, frameworks, cloud and engineering practice.",
    meta: "$20 / course",
  },
  {
    to: "/recipes",
    name: "Recipes",
    blurb: "1,000 recipes with a brief history, ingredients and a step-by-step method — each a downloadable booklet.",
    meta: "$5 / recipe · $50 / booklet",
  },
];

export default function Home() {
  return (
    <div>
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">
            Learning &amp; guidance for <span className="accent">every discipline</span>
          </h1>
          <p className="hero-sub">
            Mentora is a discipline-agnostic learning platform, organised into departments.
            Study structured courses with hands-on labs and graded assessments, or cook from a
            library of illustrated recipe booklets — and download what you own as a PDF.
          </p>
          <div className="hero-cta">
            <Link to="/courses" className="btn btn-primary btn-lg">Browse courses</Link>
            <Link to="/recipes" className="btn btn-ghost btn-lg">Explore recipes</Link>
          </div>
        </div>
      </section>

      <section className="container">
        <h2 className="section-title">Departments</h2>
        <div className="feature-grid">
          {DEPARTMENTS.map((d) => (
            <Link key={d.name} to={d.to} className="feature-card feature-link">
              <h3>{d.name}</h3>
              <p>{d.blurb}</p>
              <p className="price-tag">{d.meta}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container">
        <h2 className="section-title">How it works</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>Structured courses</h3>
            <p>
              Every course has 10 topics — each with 15+ pages of notes, 3 hands-on labs,
              and a 10-question self-assessment (30 labs per course).
            </p>
          </div>
          <div className="feature-card">
            <h3>Clear pass criteria</h3>
            <p>
              Complete a course by reaching a 60% overall average <em>and</em> at least
              50% on your self-assessments. Progress and scores are tracked live.
            </p>
          </div>
          <div className="feature-card">
            <h3>Take it with you</h3>
            <p>
              Own a course, recipe or booklet and download it as a polished PDF — course
              study notes, or a fully designed recipe booklet with photos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
