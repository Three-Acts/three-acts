/** The `faqs` collection's `topic` select options, in registry-declared order (`packages/cms-schema/src/registry.ts`). */
export const FAQ_TOPICS = [
  { value: "general", label: "General" },
  { value: "orders", label: "Orders & payment" },
  { value: "shipping", label: "Delivery & access" },
  { value: "returns", label: "Refunds" },
  { value: "products", label: "Products & licensing" },
  { value: "account", label: "Account" }
] as const;

export function topicAnchor(topic: string): string {
  return `topic-${topic}`;
}
