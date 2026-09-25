import { createCartStore } from "@three-acts/ecommerce";

/**
 * The storefront's shared cart store (`localStorage` + `storage`-event sync
 * — see `@three-acts/ecommerce`'s `createCartStore`). Every island that reads
 * or mutates the cart shares this one instance, usually indirectly through
 * `CartProvider` in `./providers`.
 */
export const cartStore = createCartStore();
