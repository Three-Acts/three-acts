import type { CmsCollection, SelectOption } from "./types";

/**
 * The CMS collection registry: the single source of truth for every table the
 * CMS, API and schema tooling know about (see apps/api/schema/README.md).
 *
 * The registry models a realistic small brand site: an editorial blog
 * (articles, authors, categories), marketing content (FAQs, testimonials), a
 * storefront (products, categories, reviews, orders, customers, discount
 * codes), CMS users, inbound form submissions and the site settings screens.
 *
 * There is no relation field type yet: cross-collection references are plain
 * text/slug fields whose helpText names the target (e.g. "matches
 * authors.slug"). Sidebar groups follow registry order: Content, Shop, People,
 * Site.
 */

const currencyOptions: SelectOption[] = [
  { label: "ZAR (R)", value: "ZAR" },
  { label: "USD ($)", value: "USD" },
  { label: "EUR (€)", value: "EUR" },
  { label: "GBP (£)", value: "GBP" }
];

const ratingOptions: SelectOption[] = [
  { label: "5 — Excellent", value: "5" },
  { label: "4 — Good", value: "4" },
  { label: "3 — Average", value: "3" },
  { label: "2 — Poor", value: "2" },
  { label: "1 — Terrible", value: "1" }
];

export const collectionRegistry: CmsCollection[] = [
  // --- Content ---------------------------------------------------------------
  {
    id: "articles",
    label: "Articles",
    tableName: "articles",
    group: "Content",
    titleField: "title",
    description: "Blog articles rendered on the public site at /blog/:slug. Only published records reach the site.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "Slug", type: "slug", required: true, urlPrefix: "www.threeacts.test/blog/" },
      { key: "excerpt", label: "Excerpt", type: "textarea", required: true, helpText: "One or two sentences shown in listings and as the fallback meta description." },
      { key: "body", label: "Body", type: "textarea", required: true, helpText: "Article body. Blank lines separate paragraphs." },
      { key: "coverImage", label: "Cover image", type: "image", bucket: "cms-assets", accept: "image/*" },
      { key: "author", label: "Author", type: "text", required: true, helpText: "Author slug — matches authors.slug, e.g. amara-stone." },
      { key: "category", label: "Category", type: "text", helpText: "Category slug — matches article-categories.slug, e.g. guides." },
      { key: "tags", label: "Tags", type: "text", helpText: "Comma-separated, e.g. styling, care, sustainability." },
      { key: "publishedAt", label: "Published at", type: "datetime", required: true, helpText: "Shown as the article date; drives ordering and the sitemap lastmod." },
      { key: "readingTime", label: "Reading time (min)", type: "number", helpText: "Estimated minutes to read, e.g. 6." },
      { key: "featured", label: "Featured", type: "boolean", helpText: "Pin to the top of the blog index and the homepage." },
      { key: "seoTitle", label: "SEO title", type: "text", helpText: "Inserted into the site title template. Empty falls back to the title." },
      { key: "seoDescription", label: "SEO description", type: "textarea", helpText: "Meta description. Empty falls back to the excerpt." }
    ],
    listColumns: [
      { key: "title", label: "Name", width: "minmax(240px, 1.6fr)" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "author", label: "Author", width: "140px" },
      { key: "category", label: "Category", width: "130px" },
      { key: "featured", label: "Featured", valueType: "boolean", width: "100px" },
      { key: "publishedAt", label: "Published", valueType: "datetime", width: "170px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "authors",
    label: "Authors",
    tableName: "authors",
    group: "Content",
    titleField: "name",
    description: "Article bylines and author profile pages at /authors/:slug. Articles reference authors by slug.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "slug", label: "Slug", type: "slug", required: true, urlPrefix: "www.threeacts.test/authors/" },
      { key: "role", label: "Role", type: "text", helpText: "Job title shown under the byline, e.g. Senior Editor." },
      { key: "bio", label: "Bio", type: "textarea", required: true, helpText: "Short biography for the author page and article footers." },
      { key: "avatar", label: "Avatar", type: "image", bucket: "cms-assets", accept: "image/*" },
      { key: "email", label: "Email", type: "text", unique: true, helpText: "Contact address; not shown on the site." },
      { key: "websiteUrl", label: "Website", type: "text", helpText: "Absolute URL, e.g. https://amarastone.com." },
      { key: "xHandle", label: "X (Twitter) handle", type: "text", helpText: "Without the URL, e.g. @amarastone." },
      { key: "instagramHandle", label: "Instagram handle", type: "text", helpText: "Without the URL, e.g. @amarastone." },
      { key: "linkedinUrl", label: "LinkedIn URL", type: "text", helpText: "Absolute profile URL." }
    ],
    listColumns: [
      { key: "name", label: "Name", width: "minmax(200px, 1.3fr)" },
      { key: "role", label: "Role", width: "minmax(160px, 1fr)" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "article-categories",
    label: "Article categories",
    tableName: "article_categories",
    group: "Content",
    titleField: "name",
    description: "Blog categories with listing pages at /blog/category/:slug. Articles reference them by slug.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "slug", label: "Slug", type: "slug", required: true, urlPrefix: "www.threeacts.test/blog/category/" },
      { key: "description", label: "Description", type: "textarea", helpText: "Intro copy for the category page and its meta description." },
      { key: "sortOrder", label: "Sort order", type: "number", helpText: "Lower numbers appear first in the blog navigation." }
    ],
    listColumns: [
      { key: "name", label: "Name", width: "minmax(200px, 1.4fr)" },
      { key: "slug", label: "Slug", width: "minmax(160px, 1fr)" },
      { key: "sortOrder", label: "Order", width: "90px" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "faqs",
    label: "FAQs",
    tableName: "faqs",
    group: "Content",
    titleField: "question",
    description: "Frequently asked questions shown on /faq and product pages, grouped by topic.",
    fields: [
      { key: "question", label: "Question", type: "text", required: true },
      { key: "answer", label: "Answer", type: "textarea", required: true },
      {
        key: "topic",
        label: "Topic",
        type: "select",
        required: true,
        options: [
          { label: "General", value: "general" },
          { label: "Orders & payment", value: "orders" },
          { label: "Shipping & delivery", value: "shipping" },
          { label: "Returns & exchanges", value: "returns" },
          { label: "Products & care", value: "products" },
          { label: "Account", value: "account" }
        ]
      },
      { key: "sortOrder", label: "Sort order", type: "number", helpText: "Order within the topic; lower numbers appear first." }
    ],
    listColumns: [
      { key: "question", label: "Question", width: "minmax(280px, 2fr)" },
      { key: "topic", label: "Topic", width: "150px" },
      { key: "sortOrder", label: "Order", width: "90px" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "testimonials",
    label: "Testimonials",
    tableName: "testimonials",
    group: "Content",
    titleField: "customerName",
    description: "Customer quotes for the homepage and landing pages. Featured testimonials rotate in the hero.",
    fields: [
      { key: "customerName", label: "Customer name", type: "text", required: true },
      { key: "quote", label: "Quote", type: "textarea", required: true },
      { key: "customerTitle", label: "Title / location", type: "text", helpText: "Shown under the name, e.g. Interior designer, Cape Town." },
      { key: "company", label: "Company", type: "text" },
      { key: "avatar", label: "Photo", type: "image", bucket: "cms-assets", accept: "image/*" },
      { key: "rating", label: "Rating", type: "select", options: ratingOptions },
      { key: "product", label: "Product", type: "text", helpText: "Optional product slug — matches products.slug — to show the quote on that product page." },
      { key: "featured", label: "Featured", type: "boolean" },
      { key: "sortOrder", label: "Sort order", type: "number" }
    ],
    listColumns: [
      { key: "customerName", label: "Name", width: "minmax(180px, 1.1fr)" },
      { key: "quote", label: "Quote", width: "minmax(260px, 2fr)" },
      { key: "rating", label: "Rating", width: "90px" },
      { key: "featured", label: "Featured", valueType: "boolean", width: "100px" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" }
    ]
  },

  // --- Shop ------------------------------------------------------------------
  {
    id: "products",
    label: "Products",
    tableName: "products",
    group: "Shop",
    titleField: "title",
    description: "Storefront products at /shop/:slug with pricing, stock and media. Only published products are listed in the shop.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "Slug", type: "slug", required: true, urlPrefix: "www.threeacts.test/shop/" },
      { key: "sku", label: "SKU", type: "text", required: true, unique: true, helpText: "Stock-keeping unit, unique across the catalogue, e.g. TA-MUG-001." },
      { key: "category", label: "Category", type: "text", required: true, helpText: "Category slug — matches product-categories.slug, e.g. ceramics." },
      { key: "price", label: "Price", type: "number", required: true, helpText: "Selling price in the product currency, tax inclusive, e.g. 349.00." },
      { key: "compareAtPrice", label: "Compare-at price", type: "number", helpText: "Original price shown struck through when on sale. Leave 0 or empty when not on sale." },
      { key: "currency", label: "Currency", type: "select", required: true, options: currencyOptions },
      { key: "inventory", label: "Inventory", type: "number", helpText: "Units on hand." },
      {
        key: "availability",
        label: "Availability",
        type: "select",
        required: true,
        options: [
          { label: "In stock", value: "in_stock" },
          { label: "Low stock", value: "low_stock" },
          { label: "Out of stock", value: "out_of_stock" },
          { label: "Pre-order", value: "preorder" },
          { label: "Discontinued", value: "discontinued" }
        ]
      },
      { key: "shortDescription", label: "Short description", type: "textarea", required: true, helpText: "One or two sentences for product cards and the meta description." },
      { key: "description", label: "Description", type: "textarea", helpText: "Full product description: materials, dimensions, care. Blank lines separate paragraphs." },
      {
        key: "images",
        label: "Images",
        type: "image-gallery",
        bucket: "cms-assets",
        accept: "image/*",
        minItems: 1,
        maxItems: 8,
        helpText: "The first image is the product thumbnail."
      },
      { key: "productVideo", label: "Product video", type: "video", bucket: "cms-assets", accept: "video/*" },
      { key: "specSheet", label: "Spec sheet", type: "file", bucket: "cms-documents", accept: ".pdf,.doc,.docx", helpText: "Downloadable care guide or specification (PDF)." },
      { key: "weightGrams", label: "Weight (g)", type: "number", helpText: "Shipping weight in grams." },
      { key: "tags", label: "Tags", type: "text", helpText: "Comma-separated, e.g. handmade, gift, bestseller." },
      { key: "featured", label: "Featured", type: "boolean", helpText: "Show in the homepage and shop highlights." }
    ],
    listColumns: [
      { key: "title", label: "Name", width: "minmax(220px, 1.5fr)" },
      { key: "sku", label: "SKU", width: "130px" },
      { key: "price", label: "Price", width: "100px" },
      { key: "inventory", label: "Stock", width: "90px" },
      { key: "availability", label: "Availability", width: "130px" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "product-categories",
    label: "Product categories",
    tableName: "product_categories",
    group: "Shop",
    titleField: "name",
    description: "Shop categories with listing pages at /shop/category/:slug. Products reference them by slug.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "slug", label: "Slug", type: "slug", required: true, urlPrefix: "www.threeacts.test/shop/category/" },
      { key: "description", label: "Description", type: "textarea", helpText: "Intro copy for the category page and its meta description." },
      { key: "image", label: "Image", type: "image", bucket: "cms-assets", accept: "image/*" },
      { key: "sortOrder", label: "Sort order", type: "number", helpText: "Lower numbers appear first in the shop navigation." }
    ],
    listColumns: [
      { key: "name", label: "Name", width: "minmax(200px, 1.4fr)" },
      { key: "slug", label: "Slug", width: "minmax(160px, 1fr)" },
      { key: "sortOrder", label: "Order", width: "90px" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" }
    ]
  },
  {
    id: "product-reviews",
    label: "Product reviews",
    tableName: "product_reviews",
    // Customer-submitted; moderated with the "approved" flag rather than a publish workflow.
    mode: "data",
    group: "Shop",
    titleField: "title",
    description: "Customer reviews of products. Only approved reviews are shown on product pages.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "product", label: "Product", type: "text", required: true, helpText: "Product slug — matches products.slug." },
      { key: "customerName", label: "Customer name", type: "text", required: true, helpText: "Display name, e.g. Nadia J." },
      { key: "customerEmail", label: "Customer email", type: "text", helpText: "Matches customers.email when the reviewer has an order. Not shown on the site." },
      { key: "rating", label: "Rating", type: "select", required: true, options: ratingOptions },
      { key: "body", label: "Review", type: "textarea" },
      { key: "verifiedPurchase", label: "Verified purchase", type: "boolean" },
      { key: "approved", label: "Approved", type: "boolean", helpText: "Only approved reviews appear on the product page." },
      { key: "submittedAt", label: "Submitted at", type: "datetime" }
    ],
    listColumns: [
      { key: "title", label: "Title", width: "minmax(200px, 1.4fr)" },
      { key: "product", label: "Product", width: "minmax(160px, 1fr)" },
      { key: "customerName", label: "Customer", width: "140px" },
      { key: "rating", label: "Rating", width: "90px" },
      { key: "approved", label: "Approved", valueType: "boolean", width: "100px" },
      { key: "submittedAt", label: "Submitted", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "orders",
    label: "Orders",
    tableName: "orders",
    // Created by checkout; staff update status, tracking and notes — no publish workflow.
    mode: "data",
    group: "Shop",
    titleField: "orderNumber",
    description: "Storefront orders with fulfilment and payment status, totals and shipping destination.",
    fields: [
      { key: "orderNumber", label: "Order number", type: "text", required: true, unique: true, helpText: "e.g. TA-10421." },
      { key: "customerEmail", label: "Customer email", type: "text", required: true, helpText: "Matches customers.email." },
      { key: "customerName", label: "Customer name", type: "text" },
      {
        key: "status",
        label: "Order status",
        type: "select",
        required: true,
        options: [
          { label: "Pending", value: "pending" },
          { label: "Paid", value: "paid" },
          { label: "Fulfilled", value: "fulfilled" },
          { label: "Shipped", value: "shipped" },
          { label: "Refunded", value: "refunded" },
          { label: "Cancelled", value: "cancelled" }
        ]
      },
      {
        key: "paymentStatus",
        label: "Payment status",
        type: "select",
        required: true,
        options: [
          { label: "Awaiting payment", value: "awaiting" },
          { label: "Authorized", value: "authorized" },
          { label: "Paid", value: "paid" },
          { label: "Partially refunded", value: "partially_refunded" },
          { label: "Refunded", value: "refunded" },
          { label: "Failed", value: "failed" }
        ]
      },
      {
        key: "paymentMethod",
        label: "Payment method",
        type: "select",
        options: [
          { label: "Card", value: "card" },
          { label: "Instant EFT", value: "eft" },
          { label: "PayPal", value: "paypal" },
          { label: "Apple Pay", value: "apple_pay" },
          { label: "Gift card", value: "gift_card" }
        ]
      },
      { key: "itemCount", label: "Items", type: "number", helpText: "Total units across all line items." },
      { key: "subtotal", label: "Subtotal", type: "number", required: true },
      { key: "discountTotal", label: "Discount", type: "number" },
      { key: "discountCode", label: "Discount code", type: "text", helpText: "Matches discount-codes.code when one was applied." },
      { key: "taxTotal", label: "Tax", type: "number" },
      { key: "shippingTotal", label: "Shipping", type: "number" },
      { key: "total", label: "Total", type: "number", required: true, helpText: "subtotal − discount + tax + shipping." },
      { key: "currency", label: "Currency", type: "select", required: true, options: currencyOptions },
      { key: "placedAt", label: "Placed at", type: "datetime", required: true },
      { key: "shippingCity", label: "Shipping city", type: "text" },
      { key: "shippingCountry", label: "Shipping country", type: "text", helpText: "ISO country code, e.g. ZA." },
      { key: "trackingNumber", label: "Tracking number", type: "text" },
      { key: "notes", label: "Internal notes", type: "textarea" }
    ],
    listColumns: [
      { key: "orderNumber", label: "Order", width: "120px" },
      { key: "customerEmail", label: "Customer", width: "minmax(220px, 1.4fr)" },
      { key: "status", label: "Status", width: "120px" },
      { key: "paymentStatus", label: "Payment", width: "140px" },
      { key: "total", label: "Total", width: "100px" },
      { key: "currency", label: "Cur.", width: "70px" },
      { key: "placedAt", label: "Placed", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "customers",
    label: "Customers",
    tableName: "customers",
    // Shopper accounts synced from checkout — editable, no publish workflow.
    mode: "data",
    group: "Shop",
    titleField: "name",
    description: "Shopper accounts with contact details, marketing consent and order totals.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "text", required: true, unique: true },
      { key: "phone", label: "Phone", type: "text", helpText: "International format, e.g. +27 82 555 0142." },
      { key: "city", label: "City", type: "text" },
      { key: "country", label: "Country", type: "text", helpText: "ISO country code, e.g. ZA." },
      { key: "marketingOptIn", label: "Marketing opt-in", type: "boolean", helpText: "Consented to marketing email." },
      { key: "totalOrders", label: "Total orders", type: "number" },
      { key: "lifetimeValue", label: "Lifetime value", type: "number", helpText: "Sum of paid order totals, in ZAR." },
      { key: "firstOrderAt", label: "First order at", type: "datetime" },
      { key: "lastOrderAt", label: "Last order at", type: "datetime" },
      { key: "notes", label: "Internal notes", type: "textarea" }
    ],
    listColumns: [
      { key: "name", label: "Name", width: "minmax(180px, 1.1fr)" },
      { key: "email", label: "Email", width: "minmax(220px, 1.4fr)" },
      { key: "country", label: "Country", width: "90px" },
      { key: "totalOrders", label: "Orders", width: "90px" },
      { key: "lifetimeValue", label: "LTV", width: "110px" },
      { key: "marketingOptIn", label: "Opt-in", valueType: "boolean", width: "90px" },
      { key: "lastOrderAt", label: "Last order", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "discount-codes",
    label: "Discount codes",
    tableName: "discount_codes",
    // Operational config — editable, but no publish workflow.
    mode: "data",
    group: "Shop",
    titleField: "code",
    description: "Checkout discount codes with value, limits and an active window.",
    fields: [
      { key: "code", label: "Code", type: "text", required: true, unique: true, helpText: "What shoppers type at checkout, e.g. WELCOME10." },
      { key: "description", label: "Description", type: "text", helpText: "Internal note on the campaign this code belongs to." },
      {
        key: "discountType",
        label: "Discount type",
        type: "select",
        required: true,
        options: [
          { label: "Percentage", value: "percentage" },
          { label: "Fixed amount", value: "fixed_amount" },
          { label: "Free shipping", value: "free_shipping" }
        ]
      },
      { key: "amount", label: "Amount", type: "number", helpText: "Percent off for percentage codes, currency amount for fixed codes, 0 for free shipping." },
      { key: "minimumSubtotal", label: "Minimum subtotal", type: "number", helpText: "Cart subtotal required before the code applies. 0 for none." },
      { key: "usageLimit", label: "Usage limit", type: "number", helpText: "Total redemptions allowed. 0 for unlimited." },
      { key: "timesUsed", label: "Times used", type: "number" },
      { key: "startsAt", label: "Starts at", type: "datetime" },
      { key: "endsAt", label: "Ends at", type: "datetime", helpText: "Empty means the code never expires." },
      { key: "active", label: "Active", type: "boolean" }
    ],
    listColumns: [
      { key: "code", label: "Code", width: "minmax(160px, 1fr)" },
      { key: "discountType", label: "Type", width: "130px" },
      { key: "amount", label: "Amount", width: "90px" },
      { key: "timesUsed", label: "Used", width: "80px" },
      { key: "active", label: "Active", valueType: "boolean", width: "90px" },
      { key: "endsAt", label: "Ends", valueType: "datetime", width: "170px" }
    ]
  },

  // --- People ----------------------------------------------------------------
  {
    id: "cms-users",
    label: "CMS users",
    tableName: "cms_users",
    // Team accounts for this CMS — editable, no publish workflow.
    mode: "data",
    group: "People",
    titleField: "name",
    description: "People who can sign in to this CMS, with their role and account status.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "text", required: true, unique: true },
      {
        key: "role",
        label: "Role",
        type: "select",
        required: true,
        options: [
          { label: "Admin", value: "admin" },
          { label: "Editor", value: "editor" },
          { label: "Author", value: "author" },
          { label: "Viewer", value: "viewer" }
        ]
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { label: "Active", value: "active" },
          { label: "Invited", value: "invited" },
          { label: "Suspended", value: "suspended" }
        ]
      },
      { key: "authorSlug", label: "Author profile", type: "text", helpText: "Optional author slug — matches authors.slug — for users who write articles." },
      { key: "avatar", label: "Avatar", type: "image", bucket: "cms-assets", accept: "image/*", altText: false },
      { key: "lastActiveAt", label: "Last active at", type: "datetime" }
    ],
    listColumns: [
      { key: "name", label: "Name", width: "minmax(180px, 1.1fr)" },
      { key: "email", label: "Email", width: "minmax(220px, 1.4fr)" },
      { key: "role", label: "Role", width: "110px" },
      { key: "status", label: "Status", width: "110px" },
      { key: "lastActiveAt", label: "Last active", valueType: "datetime", width: "170px" }
    ]
  },

  // --- Site ------------------------------------------------------------------
  {
    id: "form-submissions",
    label: "Form Submissions",
    tableName: "form_submissions",
    // Submissions are created by the site, not editors — view, export, delete only.
    mode: "readonly",
    group: "Site",
    titleField: "submittedBy",
    description: "Inbound contact, newsletter, wholesale and support form submissions from the site, with lead score, consent and attachments.",
    fields: [
      { key: "submittedBy", label: "Submitted by", type: "text", required: true },
      { key: "email", label: "Email", type: "text", required: true },
      { key: "message", label: "Message", type: "textarea" },
      {
        key: "source",
        label: "Source",
        type: "select",
        options: [
          { label: "Contact page", value: "contact" },
          { label: "Newsletter", value: "newsletter" },
          { label: "Product enquiry", value: "product_enquiry" },
          { label: "Wholesale", value: "wholesale" },
          { label: "Support", value: "support" }
        ]
      },
      { key: "score", label: "Score", type: "number" },
      { key: "consent", label: "Consent", type: "boolean" },
      { key: "attachment", label: "Attachment", type: "asset", bucket: "cms-documents", accept: ".pdf,.png,.jpg,.jpeg" },
      { key: "submittedAt", label: "Submitted at", type: "datetime" },
      { key: "submissionId", label: "Submission ID", type: "readonly" }
    ],
    listColumns: [
      { key: "submittedBy", label: "Name", width: "minmax(180px, 1.2fr)" },
      { key: "email", label: "Email", width: "minmax(220px, 1.3fr)" },
      { key: "source", label: "Source", width: "120px" },
      { key: "score", label: "Score", width: "80px" },
      { key: "consent", label: "Consent", valueType: "boolean", width: "100px" },
      { key: "createdAt", label: "Created", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "media-library",
    label: "Media Library",
    tableName: "media_library",
    // Asset metadata — editable, but assets themselves have no publish workflow.
    mode: "data",
    group: "Site",
    settingsView: "media",
    titleField: "assetName",
    description: "Asset metadata for images, documents, licenses, and sensitive media.",
    fields: [
      { key: "assetName", label: "Asset name", type: "text", required: true },
      { key: "altText", label: "Alt text", type: "textarea" },
      {
        key: "license",
        label: "License",
        type: "select",
        options: [
          { label: "Owned", value: "owned" },
          { label: "Licensed", value: "licensed" },
          { label: "Creative Commons", value: "creative_commons" },
          { label: "Unknown", value: "unknown" }
        ]
      },
      { key: "width", label: "Width", type: "number" },
      { key: "height", label: "Height", type: "number" },
      { key: "sensitive", label: "Sensitive", type: "boolean" },
      { key: "file", label: "File", type: "asset", bucket: "cms-assets", accept: "image/*,.pdf" },
      { key: "uploadedAt", label: "Uploaded at", type: "datetime" },
      { key: "assetId", label: "Asset ID", type: "readonly" }
    ],
    listColumns: [
      { key: "assetName", label: "Name", width: "minmax(220px, 1.5fr)" },
      { key: "license", label: "License", width: "150px" },
      { key: "width", label: "Width", width: "90px" },
      { key: "height", label: "Height", width: "90px" },
      { key: "sensitive", label: "Sensitive", valueType: "boolean", width: "100px" },
      { key: "uploadedAt", label: "Uploaded", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "redirect-rules",
    label: "Redirect Rules",
    tableName: "redirect_rules",
    // Operational config — editable, but no publish workflow.
    mode: "data",
    group: "Site",
    titleField: "sourcePath",
    settingsView: "redirects",
    description: "Redirects with status codes, hit counts, and review notes.",
    fields: [
      { key: "sourcePath", label: "Source path", type: "slug", required: true, urlPrefix: "www.threeacts.test/" },
      { key: "targetUrl", label: "Target URL", type: "text", required: true },
      { key: "notes", label: "Notes", type: "textarea" },
      {
        key: "statusCode",
        label: "Status code",
        type: "select",
        options: [
          { label: "301 Permanent", value: "301" },
          { label: "302 Temporary", value: "302" },
          { label: "307 Temporary", value: "307" },
          { label: "308 Permanent", value: "308" }
        ]
      },
      { key: "hits", label: "Hits", type: "number" },
      { key: "permanent", label: "Permanent", type: "boolean" },
      { key: "evidence", label: "Evidence", type: "asset", bucket: "cms-documents", accept: ".csv,.pdf,.png" },
      { key: "lastHitAt", label: "Last hit at", type: "datetime" },
      { key: "ruleId", label: "Rule ID", type: "readonly" }
    ],
    listColumns: [
      { key: "sourcePath", label: "Source", width: "minmax(210px, 1.2fr)" },
      { key: "targetUrl", label: "Target", width: "minmax(260px, 1.6fr)" },
      { key: "statusCode", label: "Code", width: "90px" },
      { key: "hits", label: "Hits", width: "100px" },
      { key: "permanent", label: "Permanent", valueType: "boolean", width: "110px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "site-settings",
    label: "Site settings",
    tableName: "site_settings",
    group: "Site",
    titleField: "siteName",
    // Exactly one record: sitewide defaults every page falls back to.
    singleton: true,
    settingsView: "site",
    description: "Sitewide SEO defaults, social metadata, and indexing. Only the published record reaches the site.",
    fields: [
      { key: "siteName", label: "Site name", type: "text", required: true },
      { key: "titleTemplate", label: "Title template", type: "text", helpText: "Use %s for the page title, e.g. %s | Three Acts." },
      {
        key: "defaultMetaDescription",
        label: "Default meta description",
        type: "textarea",
        helpText: "Used when a page has no meta description of its own."
      },
      {
        key: "defaultOgImage",
        label: "Default open graph image",
        type: "image",
        bucket: "cms-assets",
        accept: "image/*",
        altText: false,
        helpText: "Shared-link preview used when a page has no open graph image of its own."
      },
      { key: "favicon", label: "Favicon", type: "image", bucket: "cms-assets", accept: "image/png,image/svg+xml,image/x-icon", altText: false },
      { key: "twitterHandle", label: "Twitter handle", type: "text", helpText: "e.g. @threeacts" },
      { key: "locale", label: "Locale", type: "text", helpText: "e.g. en_US" },
      {
        key: "allowIndexing",
        label: "Allow search engine indexing",
        type: "boolean",
        helpText: "Off adds noindex to every page and disallows crawling in robots.txt."
      },
      {
        key: "schemaMarkup",
        label: "Sitewide schema markup",
        type: "textarea",
        format: "json-ld",
        helpText: "JSON-LD object or array of objects (e.g. Organization, WebSite) merged into every page's structured data."
      }
    ],
    listColumns: [
      { key: "siteName", label: "Name", width: "minmax(220px, 1.5fr)" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "page-settings",
    label: "Page settings",
    tableName: "page_settings",
    group: "Site",
    titleField: "pageName",
    settingsView: "pages",
    description: "Per-page SEO for static routes. Empty fields fall back: open graph/search → meta → site defaults.",
    fields: [
      { key: "pageName", label: "Page name", type: "text", required: true },
      {
        key: "pagePath",
        label: "Page path",
        type: "text",
        required: true,
        unique: true,
        helpText: "Route path of the static page, e.g. /about."
      },
      {
        key: "metaTitle",
        label: "Meta title",
        type: "text",
        helpText: "Inserted into the site title template. Empty falls back to the page name."
      },
      {
        key: "metaDescription",
        label: "Meta description",
        type: "textarea",
        helpText: "Empty falls back to the site's default meta description."
      },
      {
        key: "canonicalUrl",
        label: "Canonical URL",
        type: "text",
        helpText: "Absolute URL or path. Empty uses the page path."
      },
      { key: "ogTitle", label: "Open graph title", type: "text", helpText: "Empty falls back to the meta title." },
      {
        key: "ogDescription",
        label: "Open graph description",
        type: "textarea",
        helpText: "Empty falls back to the meta description."
      },
      {
        key: "ogImage",
        label: "Open graph image",
        type: "image",
        bucket: "cms-assets",
        accept: "image/*",
        altText: false,
        helpText: "Empty falls back to the site's default open graph image."
      },
      { key: "searchTitle", label: "Search title", type: "text", helpText: "Title shown in search results. Empty falls back to the meta title." },
      {
        key: "searchDescription",
        label: "Search description",
        type: "textarea",
        helpText: "Description shown in search results. Empty falls back to the meta description."
      },
      {
        key: "searchImage",
        label: "Search image",
        type: "image",
        bucket: "cms-assets",
        accept: "image/*",
        altText: false,
        helpText: "Image for search features. Empty falls back to the open graph image."
      },
      {
        key: "schemaMarkup",
        label: "Schema markup",
        type: "textarea",
        format: "json-ld",
        helpText: "JSON-LD object or array of objects merged with the sitewide schema markup on this page."
      }
    ],
    listColumns: [
      { key: "pageName", label: "Name", width: "minmax(200px, 1.3fr)" },
      { key: "pagePath", label: "Path", width: "minmax(160px, 1fr)" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  }
];
