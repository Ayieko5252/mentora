import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { money } from "../api/format.js";

// Handles both mock mode (instant unlock) and real Stripe checkout redirect.
export default function BuyButton({ itemType, itemId, priceCents, label, onOwned }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const buy = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/purchases/checkout", { itemType, itemId });
      if (res.mode === "stripe" && res.checkoutUrl) {
        window.location.href = res.checkoutUrl; // redirect to Stripe test checkout
        return;
      }
      // Mock mode: content is unlocked immediately.
      if (onOwned) onOwned();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="buy">
      <button className="btn btn-primary" onClick={buy} disabled={busy}>
        {busy ? "Processing…" : `${label || "Buy"} · ${money(priceCents)}`}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
