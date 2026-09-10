export const money = (cents) => `$${(cents / 100).toFixed(2)}`;

export const pct = (n) => `${Math.round(n)}%`;
