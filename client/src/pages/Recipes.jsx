import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { money } from "../api/format.js";

export default function Recipes() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ recipes: [], total: 0, pageSize: 24 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    api
      .get(`/catalog/recipes?${params.toString()}`, { auth: false })
      .then((res) => active && setData(res))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [q, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="container">
      <div className="page-head">
        <h1>Recipes</h1>
        <p className="muted">{data.total} recipes · $5 each · or a 100-recipe booklet for $50</p>
      </div>

      <div className="filters">
        <input
          className="input"
          placeholder="Search recipes…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <Link to="/booklets" className="btn btn-ghost">See booklets →</Link>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="card-grid">
          {data.recipes.map((r) => (
            <Link key={r.id} to={`/recipes/${r.slug}`} className="card recipe-card">
              {r.imageUrl && (
                <div className="recipe-thumb">
                  <img src={r.imageUrl} alt={r.title} loading="lazy" />
                  <span className="recipe-thumb-badge">{r.cuisine}</span>
                </div>
              )}
              <h3 className="card-title">{r.title}</h3>
              <p className="card-text">{r.history}</p>
              <div className="card-foot">
                <span className="muted">Locked · buy to read</span>
                <span className="price-tag">{money(r.priceCents)}</span>
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
