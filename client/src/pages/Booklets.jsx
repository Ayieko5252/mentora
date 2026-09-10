import { useEffect, useState } from "react";
import { api, downloadFile } from "../api/client.js";
import { money } from "../api/format.js";
import BuyButton from "../components/BuyButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Booklets() {
  const { user } = useAuth();
  const [booklets, setBooklets] = useState([]);
  const [owned, setOwned] = useState(() => new Set());
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api.get("/catalog/booklets", { auth: false }).then((res) => setBooklets(res.booklets));
  }, []);

  // Learn which booklets the user already owns (to show Download).
  useEffect(() => {
    if (!user) return;
    api.get("/purchases/mine").then((res) => {
      const slugs = res.purchases.filter((p) => p.booklet).map((p) => p.booklet.slug);
      setOwned(new Set(slugs));
    });
  }, [user, msg]);

  const download = async (b) => {
    setBusy(b.id);
    setErr("");
    try {
      await downloadFile(`/learn/booklets/${b.slug}/booklet.pdf`, `${b.slug}.pdf`);
    } catch (e) {
      setErr(`${b.title}: ${e.message}`);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="container">
      <div className="page-head">
        <h1>Recipe Booklets</h1>
        <p className="muted">
          Each booklet bundles 100 recipes for {money(5000)} — a 90% saving vs. {money(50000)} bought
          individually. Buy once, then download the whole booklet as a designed PDF.
        </p>
      </div>

      {msg && <div className="result-banner pass">{msg}</div>}
      {err && <p className="form-error">{err}</p>}

      <div className="card-grid">
        {booklets.map((b) => {
          const isOwned = owned.has(b.slug);
          return (
            <div key={b.id} className="card static">
              <div className="card-badge">{b._count.recipes} recipes</div>
              <h3 className="card-title">{b.title}</h3>
              <p className="card-text">{b.description}</p>
              <div className="card-foot">
                <span className="price-tag">{money(b.priceCents)}</span>
                {isOwned ? (
                  <button className="btn btn-primary" disabled={busy === b.id} onClick={() => download(b)}>
                    {busy === b.id ? "Preparing…" : "⬇ Download PDF"}
                  </button>
                ) : (
                  <BuyButton
                    itemType="BOOKLET"
                    itemId={b.id}
                    priceCents={b.priceCents}
                    label="Buy booklet"
                    onOwned={() => setMsg(`Unlocked ${b.title}. You can now download it as a PDF.`)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
