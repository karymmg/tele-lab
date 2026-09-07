/**
 * Règle métier principale (cahier des charges §56, §69) :
 *  - Aucune confirmation → aucun prix définitif.
 *  - Une fois le prix confirmé par l'Admin : deposit = 30 %, remaining = 70 %.
 *  - deposit + remaining doit toujours reconstituer exactement le total (arrondi au millime).
 */
export interface RepairPricing {
  total: number;
  deposit: number;
  remaining: number;
}

export function computePricing(total: number): RepairPricing {
  const deposit = Math.round(total * 0.3 * 1000) / 1000; // arrondi au millime (3 décimales, DT)
  const remaining = Math.round((total - deposit) * 1000) / 1000;
  return { total, deposit, remaining };
}
