/** The `faqs` collection's `topic` select options, in registry-declared order (`packages/cms-schema/src/registry.ts`). */
export const FAQ_TOPICS = [
  { value: "general", label: "General" },
  { value: "orders", label: "Orders & payment" },
  { value: "shipping", label: "Shipping & delivery" },
  { value: "returns", label: "Returns & exchanges" },
  { value: "products", label: "Products & care" },
  { value: "account", label: "Account" }
] as const;

export function topicAnchor(topic: string): string {
  return `topic-${topic}`;
}
