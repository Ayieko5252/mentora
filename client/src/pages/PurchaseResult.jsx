import { useParams, Link, useSearchParams } from "react-router-dom";

// Landing page for the Stripe redirect (success / cancel). In mock mode this
// page is not used — purchases unlock inline.
export default function PurchaseResult() {
  const { result } = useParams();
  const [params] = useSearchParams();
  const success = result === "success";

  return (
    <div className="container narrow auth-card">
      {success ? (
        <>
          <h1>Payment successful 🎉</h1>
          <p>Your purchase is being confirmed and will appear in your dashboard shortly.</p>
          {params.get("session_id") && (
            <p className="hint">Session: {params.get("session_id")}</p>
          )}
        </>
      ) : (
        <>
          <h1>Checkout canceled</h1>
          <p>No charge was made. You can try again anytime.</p>
        </>
      )}
      <Link className="btn btn-primary" to="/dashboard">
        Go to dashboard →
      </Link>
    </div>
  );
}
