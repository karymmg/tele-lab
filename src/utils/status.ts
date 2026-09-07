/**
 * Statuts techniques stables de la demande de réparation.
 * Ne jamais traduire ces valeurs directement dans le code :
 * les labels affichés viennent du système i18n (clé "status.<value>").
 */
export const REPAIR_STATUSES = [
  "new",
  "price_confirmed",
  "confirmed",
  "driver_assigned_pickup",
  "pickup_in_delivery",
  "picked_up",
  "received_at_shop",
  "repair_in_progress",
  "repair_ready",
  "driver_assigned_return",
  "return_in_delivery",
  "delivered_to_customer",
  "cancelled",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];
export type RepairStatusKey = RepairStatus;

/** Catégorie sémantique utilisée pour la couleur du badge (voir tokens.css). */
export function getStatusTone(
  status: RepairStatus
): "neutral" | "warning" | "progress" | "success" | "error" {
  switch (status) {
    case "new":
    case "price_confirmed":
      return "neutral";
    case "confirmed":
    case "driver_assigned_pickup":
    case "driver_assigned_return":
      return "warning";
    case "pickup_in_delivery":
    case "picked_up":
    case "received_at_shop":
    case "repair_in_progress":
    case "return_in_delivery":
      return "progress";
    case "repair_ready":
    case "delivered_to_customer":
      return "success";
    case "cancelled":
      return "error";
    default:
      return "neutral";
  }
}
