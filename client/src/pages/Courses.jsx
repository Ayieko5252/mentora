import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import { money } from "../api/format.js";

const DEPARTMENTS = [
  { slug: "", label: "All departments" },
  { slug: "engineering-tools", label: "Engineering Tools" },
  { slug: "programming", label: "Programming" },
];

export default function Courses() {
  const [params] = useSearchParams();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [dept, setDept] = useState(params.get("dept") || "");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ courses: [], total: 0, pageSize: 24 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/catalog/course-categories", { auth: false }).then((r) => setCategories(r.categories || []));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    if (level) params.set("level", level);
    if (dept) params.set("disciplineSlug", dept);
    if (category) params.set("category", category);
    api
      .get(`/catalog/courses?${params.toString()}`, { auth: false })
      .then((res) => active && setData(res))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [q, level, dept, category, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const reset = (setter) => (e) => {
    setPage(1);
    setter(e.target.value);
  };

  return (
    <div className="container">
      <div className="page-head">
        <h1>Course Catalog</h1>
        <p className="muted">{data.total} courses · $20 each · Engineering Tools &amp; Programming departments</p>
      </div>

      <div className="filters">
        <input className="input" placeholder="Search courses…" value={q} onChange={reset(setQ)} />
        <select className="input" value={dept} onChange={reset(setDept)}>
          {DEPARTMENTS.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.label}
            </option>
          ))}
        </select>
        <select className="input" value={category} onChange={reset(setCategory)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="input" value={level} onChange={reset(setLevel)}>
          <option value="">All levels</option>
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
          <option>Professional</option>
        </select>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : data.courses.length === 0 ? (
        <p className="muted">No courses match those filters.</p>
      ) : (
        <div className="card-grid">
          {data.courses.map((c) => (
            <Link key={c.id} to={`/courses/${c.slug}`} className="card">
              <div className="card-badge">{c.category || c.discipline?.name || c.level}</div>
              <h3 className="card-title">{c.title}</h3>
              <p className="card-text">{c.summary}</p>
              <div className="card-foot">
                <span>{c._count.topics} topics · {c.level}</span>
                <span className="price-tag">{money(c.priceCents)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="pager">
        <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ← Prev
        </button>
        <span>
          Page {page} / {totalPages}
        </span>
        <button
          className="btn btn-ghost"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
