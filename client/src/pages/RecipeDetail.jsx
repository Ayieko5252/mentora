import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, downloadFile } from "../api/client.js";
import { money } from "../api/format.js";
import BuyButton from "../components/BuyButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function RecipeDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [teaser, setTeaser] = useState(null); // from public catalog
  const [full, setFull] = useState(null); // gated content if owned
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const [dl, setDl] = useState("");

  const loadFull = () =>
    api
      .get(`/learn/recipes/${slug}/content`)
      .then((res) => {
        setFull(res.recipe);
        setLocked(false);
      })
      .catch((e) => {
        if (e.status === 403) setLocked(true);
        else setError(e.message);
      });

  useEffect(() => {
    api
      .get(`/catalog/recipes?q=${encodeURIComponent(slug.replace(/-/g, " "))}&pageSize=100`, {
        auth: false,
      })
      .then((res) => setTeaser(res.recipes.find((r) => r.slug === slug) || null));
    if (user) loadFull();
    else setLocked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user]);

  const download = async () => {
    setDl("busy");
    setError("");
    try {
      await downloadFile(`/learn/recipes/${slug}/booklet.pdf`, `${slug}.pdf`);
    } catch (e) {
      setError(e.message);
    } finally {
      setDl("");
    }
  };

  if (error) return <div className="container"><p className="form-error">{error}</p></div>;

  const recipe = full || teaser;
  if (!recipe) return <div className="container">Loading…</div>;
  const steps = Array.isArray(full?.steps) ? full.steps : [];

  return (
    <div className="container narrow recipe-detail">
      <Link to="/recipes" className="back-link">← All recipes</Link>

      {recipe.imageUrl && (
        <div className="recipe-hero">
          <img src={recipe.imageUrl} alt={recipe.title} />
          <div className="recipe-hero-cap">
            <span className="card-badge">{recipe.cuisine}</span>
            <h1>{recipe.title}</h1>
            {full && (
              <p className="recipe-meta">
                by {full.author} · {full.servings} · {full.totalTime}
              </p>
            )}
          </div>
        </div>
      )}
      {!recipe.imageUrl && <h1>{recipe.title}</h1>}

      {full ? (
        <>
          <div className="recipe-toolbar">
            <button className="btn btn-primary" onClick={download} disabled={dl === "busy"}>
              {dl === "busy" ? "Preparing…" : "⬇ Download recipe booklet (PDF)"}
            </button>
          </div>

          <h2>A brief history</h2>
          <p>{full.history}</p>

          {full.ingredients?.length > 0 && (
            <>
              <h2>Ingredients</h2>
              <ul className="ingredient-list">
                {full.ingredients.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </>
          )}

          {steps.length > 0 && (
            <>
              <h2>Method</h2>
              <ol className="step-list">
                {steps.map((s, i) => (
                  <li key={i}>
                    <div className="step-num">{i + 1}</div>
                    <div>
                      <h3>{s.title}</h3>
                      <p>{s.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      ) : (
        <div className="locked-box">
          {!recipe.imageUrl && <div className="card-badge">{recipe.cuisine}</div>}
          <p className="muted">{teaser?.history}</p>
          <div className="lock-cta">
            <p>Unlock the full booklet — history, ingredients, step-by-step method, and a downloadable PDF.</p>
            {teaser && (
              <BuyButton
                itemType="RECIPE"
                itemId={teaser.id}
                priceCents={teaser.priceCents}
                label="Buy recipe"
                onOwned={loadFull}
              />
            )}
            <p className="hint">
              Tip: a <Link to="/booklets">100-recipe booklet</Link> is {money(5000)} — cheaper per recipe.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
