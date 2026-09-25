import { toOrder, type Order } from "@three-acts/ecommerce";
import { findRecords } from "../cms/service";

function sameEmail(a: unknown, b: string): boolean {
  return String(a ?? "").trim().toLowerCase() === b.trim().toLowerCase();
}

/** A customer's own orders, newest first (by `placedAt`). */
export async function listOrdersForEmail(email: string): Promise<Order[]> {
  const records = await findRecords("orders", (record) => sameEmail(record.values.customerEmail, email));
  return records.map(toOrder).sort((a, b) => (a.placedAt < b.placedAt ? 1 : a.placedAt > b.placedAt ? -1 : 0));
}

/** A single order by number, scoped to `email` — `null` both when the order doesn't exist and when it belongs to someone else, so callers can't tell the two apart. */
export async function getOrderForEmail(orderNumber: string, email: string): Promise<Order | null> {
  const records = await findRecords("orders", (record) => String(record.values.orderNumber ?? "") === orderNumber);
  const record = records[0];
  if (!record || !sameEmail(record.values.customerEmail, email)) {
    return null;
  }
  return toOrder(record);
}
