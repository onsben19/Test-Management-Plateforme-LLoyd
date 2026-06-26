/** Cadence affichée en tests/jour — toujours un entier arrondi. */
export const formatCadencePerDay = (value?: number | null): number =>
  Math.max(0, Math.round(Number(value) || 0));
