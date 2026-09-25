import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { shopApiPaths, type ProductReview, type SubmitReviewRequest } from "@three-acts/ecommerce";
import { ApiRequestError } from "@three-acts/utils";
import { apiFetch } from "../../lib/api-client";
import { formatDate } from "../../lib/format";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";
import { Rating } from "../ui/rating";
import { Typography } from "../ui/typography";

type FetchStatus = "loading" | "loaded" | "error";

/** Shared runtime fetch: both the summary and full variants below call this independently (each is its own Astro island/root), so each keeps its own small state. */
function useProductReviews(slug: string) {
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [reviews, setReviews] = useState<ProductReview[]>([]);

  useEffect(() => {
    // `slug` is effectively constant for this island's lifetime (Astro does
    // full page navigations between products, not client-side routing), so
    // the `"loading"` initial state above is the only reset this ever needs
    // — matching `account-page.tsx`'s convention of only calling `setState`
    // from inside the fetch's `.then`/`.catch`, never synchronously in the
    // effect body.
    let cancelled = false;

    apiFetch<{ reviews: ProductReview[] }>(shopApiPaths.reviews(slug) as `/${string}`)
      .then((data) => {
        if (cancelled) return;
        const sorted = [...data.reviews].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
        setReviews(sorted);
        setStatus("loaded");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { status, reviews };
}

/** `Rating` + review count, linking down to the full `#reviews` section. Server-rendered (and pre-hydration) output is always "Loading reviews" — this is the "summary slot" the product page's static shell shows before the island's runtime fetch resolves. */
function ReviewsSummary({ slug }: { slug: string }) {
  const { status, reviews } = useProductReviews(slug);

  if (status === "loading") {
    return <p className="text-sm text-muted">Loading reviews</p>;
  }
  if (status === "error") {
    return null;
  }
  if (reviews.length === 0) {
    return (
      <a href="#reviews" className="focus-ring text-sm text-muted underline decoration-1 underline-offset-2 hover:text-ink">
        No reviews yet — be the first
      </a>
    );
  }

  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return (
    <a href="#reviews" className="focus-ring inline-flex items-center gap-2">
      <Rating.Root value={average} count={reviews.length} size="sm" />
    </a>
  );
}

const RATING_OPTIONS: Array<{ value: 1 | 2 | 3 | 4 | 5; label: string }> = [
  { value: 5, label: "5 — Excellent" },
  { value: 4, label: "4 — Good" },
  { value: 3, label: "3 — Average" },
  { value: 2, label: "2 — Poor" },
  { value: 1, label: "1 — Terrible" }
];

type ReviewFormValues = { title: string; customerName: string; customerEmail: string; rating: string; body: string };

const EMPTY_FORM: ReviewFormValues = { title: "", customerName: "", customerEmail: "", rating: "", body: "" };

/** The "Write a review" form: client-side required-field validation, then `POST /shop/products/:slug/reviews`. */
function ReviewForm({ slug, onSubmitted }: { slug: string; onSubmitted: (review: ProductReview) => void }) {
  const [values, setValues] = useState<ReviewFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  function set<K extends keyof ReviewFormValues>(key: K, value: ReviewFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const handleSubmit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();

      const nextErrors: Record<string, string> = {};
      if (!values.title.trim()) nextErrors.title = "Give your review a title.";
      if (!values.customerName.trim()) nextErrors.customerName = "Your name is required.";
      if (!values.rating) nextErrors.rating = "Choose a rating.";
      if (!values.body.trim()) nextErrors.body = "Tell us what you thought.";
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        return;
      }

      setErrors({});
      setFormError(null);
      setStatus("submitting");

      const payload: SubmitReviewRequest = {
        title: values.title.trim(),
        customerName: values.customerName.trim(),
        rating: Number(values.rating) as 1 | 2 | 3 | 4 | 5,
        body: values.body.trim()
      };
      if (values.customerEmail.trim()) {
        payload.customerEmail = values.customerEmail.trim();
      }

      try {
        const data = await apiFetch<{ review: ProductReview }>(shopApiPaths.reviews(slug) as `/${string}`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setStatus("success");
        setValues(EMPTY_FORM);
        onSubmitted(data.review);
      } catch (thrown) {
        setFormError(thrown instanceof ApiRequestError ? thrown.message : "Something went wrong. Try again.");
        setStatus("error");
      }
    },
    [slug, values, onSubmitted]
  );

  if (status === "success") {
    return (
      <Notice.Root tone="success" title="Thanks for the review">
        Thanks — your review will appear once approved.
      </Notice.Root>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 border border-line bg-surface-raised p-6">
      <Field.Root label="Review title" error={errors.title} required>
        <Field.Input
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="Sum it up in a few words"
        />
      </Field.Root>
      <div className="grid gap-5 landscape:grid-cols-2">
        <Field.Root label="Your name" error={errors.customerName} required>
          <Field.Input value={values.customerName} onChange={(event) => set("customerName", event.target.value)} autoComplete="name" />
        </Field.Root>
        <Field.Root label="Email" hint="Optional — never shown publicly.">
          <Field.Input type="email" value={values.customerEmail} onChange={(event) => set("customerEmail", event.target.value)} autoComplete="email" />
        </Field.Root>
      </div>
      <Field.Root label="Rating" error={errors.rating} required>
        <Field.Select value={values.rating} onChange={(event) => set("rating", event.target.value)}>
          <option value="" disabled>
            Select a rating
          </option>
          {RATING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Field.Select>
      </Field.Root>
      <Field.Root label="Your review" error={errors.body} required>
        <Field.Textarea value={values.body} onChange={(event) => set("body", event.target.value)} rows={5} />
      </Field.Root>
      {formError && <Notice.Root tone="error">{formError}</Notice.Root>}
      <Button.Root type="submit" loading={status === "submitting"} className="w-fit">
        Submit review
      </Button.Root>
    </form>
  );
}

function ReviewsList({ reviews }: { reviews: ProductReview[] }) {
  if (reviews.length === 0) {
    return <EmptyState.Root title="No reviews yet" description="Be the first to review this product." />;
  }
  return (
    <ul className="flex flex-col gap-6">
      {reviews.map((review) => (
        <li key={review.id} className="border-b border-line pb-6 last:border-none last:pb-0">
          <div className="flex flex-wrap items-center gap-3">
            <Rating.Root value={review.rating} size="sm" />
            {review.verifiedPurchase && <Badge.Root tone="success">Verified purchase</Badge.Root>}
          </div>
          <p className="mt-3 font-serif text-lg font-semibold tracking-tight text-ink">{review.title}</p>
          <p className="mt-2 text-sm leading-6 text-ink">{review.body}</p>
          <p className="mt-3 text-xs text-muted">
            {review.customerName} · {formatDate(review.submittedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** The full "Reviews" section: the review list plus a "Write a review" toggle + form. Anchored `#reviews` so `ReviewsSummary` (and any other in-page link) can jump straight to it. */
function ReviewsFull({ slug }: { slug: string }) {
  const { status, reviews: fetched } = useProductReviews(slug);
  const [extra, setExtra] = useState<ProductReview[]>([]);
  const [showForm, setShowForm] = useState(false);

  // A review the shopper just submitted isn't approved yet (so a re-fetch
  // wouldn't show it) — surface it locally instead so the form doesn't feel
  // like it vanished into a void.
  const reviews = [...extra, ...fetched];

  return (
    <div id="reviews" className="flex flex-col gap-8 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Typography.Title as="h2">Reviews</Typography.Title>
        <Button.Root type="button" variant="secondary" size="sm" onClick={() => setShowForm((current) => !current)} aria-expanded={showForm}>
          {showForm ? "Cancel" : "Write a review"}
        </Button.Root>
      </div>

      {showForm && (
        <ReviewForm
          slug={slug}
          onSubmitted={(review) => {
            setExtra((current) => [review, ...current]);
            setShowForm(false);
          }}
        />
      )}

      {status === "loading" && extra.length === 0 && <p className="text-sm text-muted">Loading reviews…</p>}
      {status === "error" && extra.length === 0 && <Notice.Root tone="error">Could not load reviews. Try refreshing the page.</Notice.Root>}
      {(status === "loaded" || extra.length > 0) && <ReviewsList reviews={reviews} />}
    </div>
  );
}

export type ProductReviewsProps = {
  slug: string;
  /** "summary" (Rating + count, used near the title) or "full" (the list + write-review form, used in the page's Reviews section). Each variant fetches independently — they're separate Astro islands. */
  variant?: "summary" | "full";
};

/**
 * Fetches a product's approved reviews at runtime (there's no build-time way
 * to read a `data`-mode collection like `product-reviews` — see
 * `@three-acts/content`'s docstring) and renders either the compact rating
 * summary or the full reviews section + write-review form.
 */
export function ProductReviews({ slug, variant = "full" }: ProductReviewsProps) {
  return variant === "summary" ? <ReviewsSummary slug={slug} /> : <ReviewsFull slug={slug} />;
}

export default ProductReviews;
