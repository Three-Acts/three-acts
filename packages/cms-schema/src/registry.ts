import type { CmsCollection } from "./types";

export const collectionRegistry: CmsCollection[] = [
  {
    id: "posts",
    label: "Posts",
    tableName: "posts",
    group: "Editorial",
    titleField: "title",
    description: "Blog posts rendered on the public site at /blog/:slug. Only published records reach the site.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "Slug", type: "slug", required: true, urlPrefix: "www.threeacts.test/blog/" },
      { key: "excerpt", label: "Excerpt", type: "textarea", required: true, helpText: "Shown in listings and as the meta description." },
      { key: "body", label: "Body", type: "textarea", required: true },
      { key: "coverImage", label: "Cover image", type: "image", bucket: "cms-assets", accept: "image/*" },
      { key: "author", label: "Author", type: "text" },
      { key: "tags", label: "Tags", type: "text", helpText: "Comma-separated, e.g. performance, seo, workflow." },
      { key: "publishedAt", label: "Published at", type: "datetime", required: true, helpText: "Drives ordering and the sitemap lastmod." }
    ],
    listColumns: [
      { key: "title", label: "Name", width: "minmax(220px, 1.5fr)" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "author", label: "Author", width: "140px" },
      { key: "publishedAt", label: "Published", valueType: "datetime", width: "170px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "launch-pages",
    label: "Launch Pages",
    tableName: "launch_pages",
    group: "Editorial",
    titleField: "title",
    description: "Marketing pages with metadata, hero media, and publishing status.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "Slug", type: "slug", required: true, urlPrefix: "www.threeacts.test/pages/" },
      { key: "summary", label: "Summary", type: "textarea" },
      {
        key: "template",
        label: "Template",
        type: "select",
        required: true,
        options: [
          { label: "Campaign", value: "campaign" },
          { label: "Editorial", value: "editorial" },
          { label: "Conversion", value: "conversion" },
          { label: "Long-form", value: "long_form" },
          { label: "Product", value: "product" }
        ]
      },
      { key: "priority", label: "Priority", type: "number" },
      { key: "featured", label: "Featured", type: "boolean" },
      { key: "heroImage", label: "Hero image", type: "image", bucket: "cms-assets", accept: "image/*" },
      {
        key: "imageGallery",
        label: "Image gallery",
        type: "image-gallery",
        bucket: "cms-assets",
        accept: "image/*",
        minItems: 1,
        maxItems: 8
      },
      { key: "publishAt", label: "Publish at", type: "datetime" },
      { key: "recordId", label: "Item ID", type: "readonly" }
    ],
    listColumns: [
      { key: "title", label: "Name", width: "minmax(220px, 1.4fr)" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "template", label: "Template", width: "140px" },
      { key: "featured", label: "Featured", valueType: "boolean", width: "110px" },
      { key: "createdAt", label: "Created", valueType: "datetime", width: "170px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "content-blocks",
    label: "Content Blocks",
    tableName: "content_blocks",
    group: "Editorial",
    titleField: "blockName",
    description: "Reusable content modules with placement and ownership metadata.",
    fields: [
      { key: "blockName", label: "Block name", type: "text", required: true },
      { key: "slotKey", label: "Slot key", type: "slug", required: true },
      { key: "body", label: "Body", type: "textarea" },
      {
        key: "surface",
        label: "Surface",
        type: "select",
        options: [
          { label: "Homepage", value: "homepage" },
          { label: "Pricing", value: "pricing" },
          { label: "Article", value: "article" },
          { label: "Checkout", value: "checkout" },
          { label: "Email", value: "email" }
        ]
      },
      { key: "sortOrder", label: "Sort order", type: "number" },
      { key: "visible", label: "Visible", type: "boolean" },
      { key: "referenceImage", label: "Reference image", type: "asset", bucket: "cms-assets", accept: "image/*" },
      { key: "reviewAt", label: "Review at", type: "datetime" },
      { key: "blockId", label: "Block ID", type: "readonly" }
    ],
    listColumns: [
      { key: "blockName", label: "Name", width: "minmax(220px, 1.5fr)" },
      { key: "surface", label: "Surface", width: "120px" },
      { key: "visible", label: "Visible", valueType: "boolean", width: "100px" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "product-catalog",
    label: "Product Catalog",
    tableName: "product_catalog",
    group: "Commerce",
    titleField: "name",
    description: "Products with pricing, stock state, and downloadable spec sheets.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "sku", label: "SKU", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "price", label: "Price", type: "number", required: true },
      {
        key: "category",
        label: "Category",
        type: "select",
        required: true,
        options: [
          { label: "Books", value: "books" },
          { label: "Workshops", value: "workshops" },
          { label: "Templates", value: "templates" },
          { label: "Services", value: "services" },
          { label: "Bundles", value: "bundles" }
        ]
      },
      { key: "inStock", label: "In stock", type: "boolean" },
      { key: "specSheet", label: "Spec sheet", type: "file", bucket: "cms-documents", accept: ".pdf,.doc,.docx" },
      { key: "demoVideo", label: "Demo video", type: "video", bucket: "cms-assets", accept: "video/*" },
      { key: "updatedBy", label: "Updated by", type: "readonly" }
    ],
    listColumns: [
      { key: "name", label: "Name", width: "minmax(220px, 1.5fr)" },
      { key: "sku", label: "SKU", width: "120px" },
      { key: "price", label: "Price", width: "100px" },
      { key: "inStock", label: "Stock", valueType: "boolean", width: "90px" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "form-submissions",
    label: "Form Submissions",
    tableName: "form_submissions",
    // Submissions are created by the site, not editors — view, export, delete only.
    mode: "readonly",
    group: "Growth",
    titleField: "submittedBy",
    description: "High-volume inbound submissions with scoring, consent, and attachments.",
    fields: [
      { key: "submittedBy", label: "Submitted by", type: "text", required: true },
      { key: "email", label: "Email", type: "text", required: true },
      { key: "message", label: "Message", type: "textarea" },
      {
        key: "source",
        label: "Source",
        type: "select",
        options: [
          { label: "Homepage", value: "homepage" },
          { label: "Pricing", value: "pricing" },
          { label: "Webinar", value: "webinar" },
          { label: "Partner", value: "partner" },
          { label: "Referral", value: "referral" }
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
    id: "experiments",
    label: "Experiments",
    tableName: "experiments",
    // Operational config — editable, but no publish workflow.
    mode: "data",
    group: "Growth",
    titleField: "experimentName",
    description: "A/B tests with traffic split, owner, and launch scheduling.",
    fields: [
      { key: "experimentName", label: "Experiment name", type: "text", required: true },
      { key: "slug", label: "Slug", type: "slug", required: true, urlPrefix: "www.threeacts.test/experiments/" },
      { key: "hypothesis", label: "Hypothesis", type: "textarea" },
      {
        key: "channel",
        label: "Channel",
        type: "select",
        options: [
          { label: "Organic", value: "organic" },
          { label: "Paid search", value: "paid_search" },
          { label: "Email", value: "email" },
          { label: "Partner", value: "partner" },
          { label: "Direct", value: "direct" }
        ]
      },
      { key: "trafficSplit", label: "Traffic split", type: "number" },
      { key: "active", label: "Active", type: "boolean" },
      { key: "variantPreview", label: "Variant preview", type: "asset", bucket: "cms-assets", accept: "image/*" },
      { key: "launchAt", label: "Launch at", type: "datetime" },
      { key: "experimentId", label: "Experiment ID", type: "readonly" }
    ],
    listColumns: [
      { key: "experimentName", label: "Name", width: "minmax(220px, 1.5fr)" },
      { key: "channel", label: "Channel", width: "130px" },
      { key: "trafficSplit", label: "Split", width: "90px" },
      { key: "active", label: "Active", valueType: "boolean", width: "90px" },
      { key: "launchAt", label: "Launch at", valueType: "datetime", width: "170px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "locations",
    label: "Locations",
    tableName: "locations",
    group: "Operations",
    titleField: "locationName",
    description: "Physical locations with region data and search visibility.",
    fields: [
      { key: "locationName", label: "Location name", type: "text", required: true },
      { key: "slug", label: "Slug", type: "slug", required: true, urlPrefix: "www.threeacts.test/locations/" },
      {
        key: "region",
        label: "Region",
        type: "select",
        options: [
          { label: "Northern", value: "northern" },
          { label: "Eastern", value: "eastern" },
          { label: "Western", value: "western" },
          { label: "Central", value: "central" }
        ]
      },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "acceptsBookings", label: "Accepts bookings", type: "boolean" },
      { key: "openingDate", label: "Opening date", type: "datetime" },
      { key: "mapPreview", label: "Map preview", type: "asset", bucket: "cms-assets", accept: "image/*" },
      { key: "notes", label: "Internal notes", type: "textarea" }
    ],
    listColumns: [
      { key: "locationName", label: "Name", width: "minmax(220px, 1.4fr)" },
      { key: "region", label: "Region", width: "140px" },
      { key: "capacity", label: "Capacity", width: "110px" },
      { key: "acceptsBookings", label: "Bookings", valueType: "boolean", width: "110px" },
      { key: "publishStatus", label: "Status", valueType: "status", width: "160px" },
      { key: "createdAt", label: "Created", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "people-directory",
    label: "People Directory",
    tableName: "people_directory",
    group: "Operations",
    titleField: "fullName",
    description: "Team profiles with avatars, availability, and directory metadata.",
    fields: [
      { key: "fullName", label: "Full name", type: "text", required: true },
      { key: "email", label: "Email", type: "text", required: true },
      { key: "bio", label: "Bio", type: "textarea" },
      {
        key: "role",
        label: "Role",
        type: "select",
        options: [
          { label: "Editor", value: "editor" },
          { label: "Designer", value: "designer" },
          { label: "Developer", value: "developer" },
          { label: "Strategist", value: "strategist" },
          { label: "Producer", value: "producer" }
        ]
      },
      { key: "weeklyCapacity", label: "Weekly capacity", type: "number" },
      { key: "contractor", label: "Contractor", type: "boolean" },
      { key: "avatar", label: "Avatar", type: "asset", bucket: "cms-assets", accept: "image/*" },
      { key: "startDate", label: "Start date", type: "datetime" },
      { key: "personId", label: "Person ID", type: "readonly" }
    ],
    listColumns: [
      { key: "fullName", label: "Name", width: "minmax(190px, 1.2fr)" },
      { key: "role", label: "Role", width: "130px" },
      { key: "email", label: "Email", width: "minmax(220px, 1.3fr)" },
      { key: "weeklyCapacity", label: "Capacity", width: "100px" },
      { key: "contractor", label: "Contractor", valueType: "boolean", width: "110px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "feature-flags",
    label: "Feature Flags",
    tableName: "feature_flags",
    // Operational config — editable, but no publish workflow.
    mode: "data",
    group: "Platform",
    titleField: "flagName",
    description: "Operational feature flags with rollout percentages and expiry dates.",
    fields: [
      { key: "flagName", label: "Flag name", type: "text", required: true },
      { key: "key", label: "Key", type: "slug", required: true },
      { key: "description", label: "Description", type: "textarea" },
      {
        key: "environment",
        label: "Environment",
        type: "select",
        options: [
          { label: "Development", value: "development" },
          { label: "Staging", value: "staging" },
          { label: "Production", value: "production" },
          { label: "Preview", value: "preview" }
        ]
      },
      { key: "rollout", label: "Rollout", type: "number" },
      { key: "enabled", label: "Enabled", type: "boolean" },
      { key: "evidence", label: "Evidence", type: "asset", bucket: "cms-documents", accept: ".png,.jpg,.pdf" },
      { key: "expiresAt", label: "Expires at", type: "datetime" },
      { key: "flagId", label: "Flag ID", type: "readonly" }
    ],
    listColumns: [
      { key: "flagName", label: "Name", width: "minmax(220px, 1.5fr)" },
      { key: "environment", label: "Environment", width: "130px" },
      { key: "rollout", label: "Rollout", width: "100px" },
      { key: "enabled", label: "Enabled", valueType: "boolean", width: "100px" },
      { key: "expiresAt", label: "Expires", valueType: "datetime", width: "170px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  },
  {
    id: "media-library",
    label: "Media Library",
    tableName: "media_library",
    // Asset metadata — editable, but assets themselves have no publish workflow.
    mode: "data",
    group: "Media",
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
    group: "SEO",
    titleField: "sourcePath",
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
    id: "localization-strings",
    label: "Localization Strings",
    tableName: "localization_strings",
    // Approval is tracked on the record itself ("approved"), not via publish status.
    mode: "data",
    group: "SEO",
    titleField: "stringKey",
    description: "Localized UI and SEO copy with approvals and length constraints.",
    fields: [
      { key: "stringKey", label: "String key", type: "text", required: true },
      { key: "localizedText", label: "Localized text", type: "textarea", required: true },
      {
        key: "locale",
        label: "Locale",
        type: "select",
        options: [
          { label: "English", value: "en" },
          { label: "Afrikaans", value: "af" },
          { label: "isiXhosa", value: "xh" },
          { label: "French", value: "fr" },
          { label: "German", value: "de" }
        ]
      },
      {
        key: "namespace",
        label: "Namespace",
        type: "select",
        options: [
          { label: "Navigation", value: "navigation" },
          { label: "Forms", value: "forms" },
          { label: "Checkout", value: "checkout" },
          { label: "SEO", value: "seo" },
          { label: "Errors", value: "errors" }
        ]
      },
      { key: "characterLimit", label: "Character limit", type: "number" },
      { key: "approved", label: "Approved", type: "boolean" },
      { key: "screenshot", label: "Screenshot", type: "asset", bucket: "cms-assets", accept: "image/*" },
      // Explicit column: the default snake_case ("updated_at") would collide with the system modified-at column.
      { key: "updatedAt", label: "Updated at", type: "datetime", column: "source_updated_at" },
      { key: "stringId", label: "String ID", type: "readonly" }
    ],
    listColumns: [
      { key: "stringKey", label: "Key", width: "minmax(220px, 1.4fr)" },
      { key: "locale", label: "Locale", width: "90px" },
      { key: "namespace", label: "Namespace", width: "130px" },
      { key: "approved", label: "Approved", valueType: "boolean", width: "100px" },
      { key: "characterLimit", label: "Limit", width: "90px" },
      { key: "modifiedAt", label: "Modified", valueType: "datetime", width: "170px" }
    ]
  }
];
