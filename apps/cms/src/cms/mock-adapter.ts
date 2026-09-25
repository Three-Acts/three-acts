import { collectionRegistry } from "./registry";
import { CmsError, serializeFileValue, serializeImageGallery, serializeImageValue, serializeVideoValue } from "./types";
import type {
  AssetUploadResult,
  CmsBackend,
  CmsCollection,
  CmsField,
  CmsRecord,
  CmsRecordValue,
  FileValue,
  ImageValue,
  ListRecordsOptions,
  PublishStatus,
  SaveRecordOptions,
  SelectField,
  VideoValue
} from "./types";
import { normalizeDateTime } from "../lib/format";

const seedNow = new Date("2026-06-25T18:30:00.000Z");
const statuses: PublishStatus[] = ["published", "queued_to_publish", "not_published"];

function matchesAccept(file: File, accept?: string): boolean {
  const patterns = (accept ?? "")
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  const fileName = file.name.toLowerCase();
  const contentType = file.type.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return fileName.endsWith(pattern);
    if (pattern.endsWith("/*")) return contentType.startsWith(pattern.slice(0, -1));
    return contentType === pattern;
  });
}

const words = ["Signal", "Harbour", "Proof", "Atlas", "Northstar", "Foundry", "Pulse", "Beacon", "Orbit", "Vector", "Canvas", "Metric", "Archive", "Bridge", "Summit", "Launch", "Campaign", "Studio", "Field", "Ledger"];
const people = ["Craig Chihururu", "Amara Stone", "Nadia Jacobs", "Theo Brand", "Mika Chen", "Jonas Mokoena", "Priya Naidoo", "Leah Morgan", "Sipho Dlamini", "Elena Ward", "Max Roux", "Ayesha Khan"];
const cities = ["Cape Town", "Johannesburg", "Durban", "Gqeberha", "East London", "Mthatha", "Kariega", "Centane", "Qumbu", "Butterworth"];
const counts: Record<string, number> = {
  articles: 18,
  authors: 8,
  "article-categories": 6,
  faqs: 24,
  testimonials: 12,
  products: 58,
  "product-categories": 8,
  "product-reviews": 140,
  orders: 220,
  customers: 160,
  "discount-codes": 14,
  "cms-users": 10,
  "form-submissions": 180,
  "media-library": 96,
  "redirect-rules": 128,
  // Settings hold hand-written records only (see settingsRecords): no generated padding.
  "site-settings": 0,
  "page-settings": 0
};

const edgeCases: Record<string, CmsRecord[]> = {
  products: [
    buildRecord("prd-edge-long", 901, {
      title: "A Very Long Product Title That Should Stress Every Truncation Boundary In The Table And Editor Header",
      slug: "very-long-product-title-that-keeps-going-and-going",
      sku: "TA-EDGE-LONG-0001",
      category: "ceramics",
      price: 99999.99,
      compareAtPrice: 0,
      currency: "ZAR",
      inventory: 0,
      availability: "out_of_stock",
      shortDescription: "This record deliberately contains long values to test scroll behavior and dense form controls.",
      description: "",
      images: "[]",
      productVideo: "",
      specSheet: "",
      weightGrams: 0,
      tags: "",
      featured: true
    })
  ],
  "form-submissions": [
    buildRecord("fs-edge-empty", 911, {
      submittedBy: "Anonymous visitor",
      email: "anonymous+stress@example.test",
      message: "",
      source: "referral",
      score: 0,
      consent: false,
      attachment: "",
      submittedAt: isoFromSeed(-2, 14),
      submissionId: "fs-edge-empty"
    }),
    buildRecord("fs-edge-unicode", 912, {
      submittedBy: "Zoë François-Louw",
      email: "zoe.francois-louw@example.test",
      message: "Unicode stress: café, naïve, jalapeño, isiXhosa, résumé, São Paulo, München.",
      source: "partner",
      score: 100,
      consent: true,
      attachment: "/mock-storage/cms-documents/form_submissions/unicode-brief.pdf",
      submittedAt: isoFromSeed(-3, 22),
      submissionId: "fs-edge-unicode"
    })
  ],
  "redirect-rules": [
    buildRecord("rr-edge-loop-risk", 921, {
      sourcePath: "old/pricing/legacy/enterprise/2024/very/deep/path",
      targetUrl: "https://www.threeacts.test/pricing?utm_source=legacy&utm_medium=redirect&utm_campaign=stress-test",
      notes: "Deep path and long query string stress column truncation and CSV export.",
      statusCode: "308",
      hits: 124884,
      permanent: true,
      evidence: "/mock-storage/cms-documents/redirect_rules/redirect-audit.csv",
      lastHitAt: isoFromSeed(-1, 6),
      ruleId: "rr-edge-loop-risk"
    })
  ],
  "media-library": [
    buildRecord("ml-edge-missing-alt", 931, {
      assetName: "Huge transparent product render 12000px",
      altText: "",
      license: "unknown",
      width: 12000,
      height: 8000,
      sensitive: true,
      file: "/mock-storage/cms-assets/media_library/huge-transparent-product-render.png",
      uploadedAt: isoFromSeed(-30, 70),
      assetId: "ml-edge-missing-alt"
    })
  ]
};

/**
 * Site and page settings mirror the public site's current SEO copy
 * (apps/web/src/site.ts + page-meta.ts). Empty og/search fields exercise the
 * fallback chain (og/search -> meta -> site defaults). Images point at files
 * that really exist in apps/web/public so mock-backed builds resolve them.
 */
const settingsRecords: Record<string, CmsRecord[]> = {
  "site-settings": [
    settingsRecord("site-settings-main", 3, "published", {
      siteName: "Three Acts",
      titleTemplate: "%s | Three Acts",
      defaultMetaDescription:
        "A static-first marketing website starter built on Astro and React, backed by its own API and deployed on Vercel.",
      defaultOgImage: serializeImageValue({
        src: "/og-default.png",
        fileName: "og-default.png",
        size: 28606,
        width: 1200,
        height: 630,
        alt: "Three Acts"
      }),
      favicon: serializeImageValue({ src: "/favicon.svg", fileName: "favicon.svg", size: 261, alt: "" }),
      twitterHandle: "@threeacts",
      locale: "en_US",
      allowIndexing: true,
      schemaMarkup: JSON.stringify(
        { "@context": "https://schema.org", "@type": "Organization", name: "Three Acts", sameAs: ["https://twitter.com/threeacts"] },
        null,
        2
      )
    })
  ],
  "page-settings": [
    settingsRecord("page-settings-home", 2, "published", {
      pageName: "Home",
      pagePath: "/",
      metaTitle: "Static marketing website starter",
      metaDescription:
        "Three Acts is a marketing website starter for story-led launches, conversion pages, and static SEO performance.",
      canonicalUrl: "/",
      ogTitle: "Three Acts | Static marketing website starter",
      ogDescription: "",
      ogImage: "",
      searchTitle: "",
      searchDescription: "",
      searchImage: "",
      schemaMarkup: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "Three Acts" }, null, 2)
    }),
    settingsRecord("page-settings-about", 5, "published", {
      pageName: "About",
      pagePath: "/about",
      metaTitle: "About",
      metaDescription:
        "Meet the marketing strategy behind Three Acts: sharp positioning, static performance, and CMS-backed launch operations.",
      canonicalUrl: "/about",
      ogTitle: "About Three Acts",
      ogDescription: "",
      ogImage: "",
      searchTitle: "",
      searchDescription: "",
      searchImage: "",
      schemaMarkup: ""
    }),
    settingsRecord("page-settings-blog", 8, "queued_to_publish", {
      pageName: "Blog",
      pagePath: "/blog",
      metaTitle: "Blog",
      metaDescription: "Notes on static-first delivery, islands architecture, and CMS-driven publishing.",
      canonicalUrl: "/blog",
      ogTitle: "",
      ogDescription: "",
      ogImage: "",
      searchTitle: "",
      searchDescription: "",
      searchImage: "",
      schemaMarkup: ""
    })
  ]
};

const initialRecords = collectionRegistry.reduce<Record<string, CmsRecord[]>>((nextRecords, collection) => {
  nextRecords[collection.id] = [...(settingsRecords[collection.id] ?? []), ...(edgeCases[collection.id] ?? []), ...Array.from({ length: counts[collection.id] ?? 24 }, (_, index) => generateRecord(collection, index))];
  return nextRecords;
}, {});

const records = structuredClone(initialRecords);

function delay<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

export const mockCmsBackend: CmsBackend = {
  name: "mock",

  data: {
    async listCollections() {
      return delay(
        collectionRegistry.map((collection) => {
          const collectionRecords = records[collection.id] ?? [];
          // Only collections with a publish workflow can carry queued records —
          // mirrors the same check in publishQueued.
          const hasPublishWorkflow = (collection.mode ?? "editorial") === "editorial";

          return {
            ...collection,
            count: collectionRecords.length,
            queuedCount: hasPublishWorkflow
              ? collectionRecords.filter((record) => record.publishStatus === "queued_to_publish").length
              : 0
          };
        })
      );
    },

    async listRecords(collectionId: string, options?: ListRecordsOptions) {
      const collection = getCollection(collectionId);
      const all = (records[collectionId] ?? []).map(cloneRecord);
      const query = options?.search?.trim().toLowerCase();
      const matching = query ? all.filter((record) => matchesSearch(collection, record, query)) : all;
      const sorted = options?.sort ? sortRecords(matching, options.sort) : matching;
      const total = sorted.length;
      const offset = options?.offset ?? 0;
      const page = options?.limit !== undefined ? sorted.slice(offset, offset + options.limit) : sorted.slice(offset);

      return delay({ records: page, total });
    },

    async getRecord(collectionId: string, recordId: string) {
      getCollection(collectionId);
      const record = records[collectionId]?.find((item) => item.id === recordId);

      if (!record) {
        throw new CmsError("not_found", `Unknown record: ${recordId}`);
      }

      return delay(cloneRecord(record));
    },

    async saveRecord(collectionId: string, record: CmsRecord, options?: SaveRecordOptions) {
      const collection = assertWritable(getCollection(collectionId));
      const collectionRecords = records[collectionId] ?? [];
      const index = collectionRecords.findIndex((item) => item.id === record.id);

      if (index < 0) {
        // Unshifting an unknown id would resurrect a record deleted elsewhere.
        // createRecord and importRecords are the only creation paths.
        throw new CmsError("not_found", `Unknown record: ${record.id}`);
      }

      const stored = collectionRecords[index];

      if (options?.expectedModifiedAt !== undefined && options.expectedModifiedAt !== stored.modifiedAt) {
        throw new CmsError("conflict", `${collection.label} record ${record.id} was changed elsewhere.`);
      }

      const nextRecord = {
        ...cloneRecord(record),
        modifiedAt: new Date().toISOString()
      };

      collectionRecords[index] = nextRecord;
      records[collectionId] = collectionRecords;
      return delay(cloneRecord(nextRecord), 220);
    },

    async createRecord(collectionId: string, values?: Partial<Record<string, CmsRecordValue>>) {
      const collection = assertWritable(getCollection(collectionId));
      assertSingletonCapacity(collection, 1);
      const record = createEmptyRecord(collection);

      if (values) {
        record.values = { ...record.values, ...values };
      }

      records[collectionId] = [record, ...(records[collectionId] ?? [])];
      return delay(cloneRecord(record), 160);
    },

    async deleteRecord(collectionId: string, recordId: string) {
      getCollection(collectionId);
      // Intentionally does NOT call assertWritable: readonly collections still
      // allow delete ("view, export, delete only" — see CollectionMode in types.ts).
      records[collectionId] = (records[collectionId] ?? []).filter((item) => item.id !== recordId);
      return delay(undefined, 160);
    },

    async importRecords(collectionId: string, rows: Array<Record<string, CmsRecordValue>>) {
      const collection = assertWritable(getCollection(collectionId));
      assertSingletonCapacity(collection, rows.length);
      const imported = rows.map((row) => {
        const base = createEmptyRecord(collection, generateId(collection.id));
        const values = { ...base.values };

        for (const field of collection.fields) {
          // Readonly fields are system-generated ids: importing them would let a
          // re-imported export duplicate an existing record's id.
          if (field.type === "readonly") {
            continue;
          }

          if (field.key in row) {
            values[field.key] = coerceValue(field, row[field.key]);
          }
        }

        return { ...base, values };
      });

      records[collectionId] = [...imported, ...(records[collectionId] ?? [])];
      return delay(imported.map(cloneRecord), 260);
    },

    async publishQueued(collectionId?: string) {
      const targets = collectionId ? [getCollection(collectionId)] : collectionRegistry;
      let published = 0;

      for (const collection of targets) {
        // Only collections with a publish workflow have anything to flip —
        // "data"/"readonly" collections never carry queued_to_publish records.
        if ((collection.mode ?? "editorial") !== "editorial") {
          continue;
        }

        const collectionRecords = records[collection.id] ?? [];
        records[collection.id] = collectionRecords.map((record) => {
          if (record.publishStatus !== "queued_to_publish") {
            return record;
          }

          published += 1;
          return { ...record, publishStatus: "published" as PublishStatus, modifiedAt: new Date().toISOString() };
        });
      }

      return delay({ published }, 200);
    },

    async setPublishStatus(collectionId: string, recordIds: string[], status: Exclude<PublishStatus, "published">) {
      const collection = assertWritable(getCollection(collectionId));

      if ((collection.mode ?? "editorial") !== "editorial") {
        throw new CmsError("validation", `${collection.label} has no publish workflow.`);
      }

      const idSet = new Set(recordIds);
      const now = new Date().toISOString();
      const updatedById = new Map<string, CmsRecord>();

      records[collectionId] = (records[collectionId] ?? []).map((record) => {
        if (!idSet.has(record.id)) {
          return record;
        }

        const nextRecord = { ...record, publishStatus: status, modifiedAt: now };
        updatedById.set(record.id, nextRecord);
        return nextRecord;
      });

      const updated = recordIds.filter((id) => updatedById.has(id)).map((id) => cloneRecord(updatedById.get(id) as CmsRecord));

      return delay(updated, 200);
    }
  },

  storage: {
    async uploadAsset(collectionId: string, fieldKey: string, file: File) {
      const collection = assertWritable(getCollection(collectionId));
      const field = collection.fields.find((item) => item.key === fieldKey);

      if (!field || (field.type !== "asset" && field.type !== "image" && field.type !== "image-gallery" && field.type !== "video" && field.type !== "file")) {
        throw new CmsError("validation", `Field is not an asset field: ${fieldKey}`);
      }

      if ((field.type === "image" || field.type === "image-gallery") && file.type && !file.type.startsWith("image/")) {
        throw new CmsError("validation", `${field.label} only accepts images.`);
      }
      if (field.type === "video" && file.type && !file.type.startsWith("video/")) {
        throw new CmsError("validation", `${field.label} only accepts videos.`);
      }
      if ((field.type === "video" || field.type === "file") && !matchesAccept(file, field.accept)) {
        throw new CmsError("validation", `${field.label} does not accept this file type.`);
      }

      const bucket = (field as { bucket: string }).bucket;
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const result: AssetUploadResult = {
        path: `${bucket}/${collection.tableName}/${Date.now()}-${safeName}`,
        url: `/mock-storage/${bucket}/${collection.tableName}/${safeName}`,
        fileName: file.name,
        size: file.size
      };

      return delay(result, 260);
    }
  }
};

function cloneRecord(record: CmsRecord): CmsRecord {
  return { ...record, values: { ...record.values } };
}

function getCollection(collectionId: string): CmsCollection {
  const collection = collectionRegistry.find((item) => item.id === collectionId);

  if (!collection) {
    throw new CmsError("not_found", `Unknown collection: ${collectionId}`);
  }

  return collection;
}

/** Enforce the collection contract: read-only collections reject editor writes. */
function assertWritable(collection: CmsCollection) {
  if (collection.mode === "readonly") {
    throw new CmsError("readonly", `${collection.label} is read-only: records are created by the site, not editors.`);
  }

  return collection;
}

/** Mirrors the API: singleton collections (site settings) hold at most one record. */
function assertSingletonCapacity(collection: CmsCollection, incoming: number) {
  if (!collection.singleton || incoming === 0) {
    return;
  }

  const existing = (records[collection.id] ?? []).length;

  if (existing + incoming > 1) {
    throw new CmsError(
      "validation",
      existing > 0
        ? `${collection.label} already has a record. Edit the existing record instead of creating another.`
        : `${collection.label} holds a single record; import at most one row.`,
      { details: { singleton: true } }
    );
  }
}

/** Case-insensitive match over the record's display title and its string values. */
function matchesSearch(collection: CmsCollection, record: CmsRecord, query: string): boolean {
  const titleKey = collection.titleField ?? "name";
  const fallback = record.values.name || record.values.title || record.id;
  const title = String(record.values[titleKey] || fallback).toLowerCase();

  if (title.includes(query)) {
    return true;
  }

  return Object.values(record.values).some((value) => {
    if (typeof value === "boolean" || value === null || value === undefined) {
      return false;
    }

    return String(value).toLowerCase().includes(query);
  });
}

function fieldValue(record: CmsRecord, key: string): CmsRecordValue {
  if (key === "id" || key === "publishStatus" || key === "createdAt" || key === "modifiedAt") {
    return record[key];
  }

  return record.values[key];
}

function sortRecords(records: CmsRecord[], sort: { key: string; direction: "asc" | "desc" }): CmsRecord[] {
  const factor = sort.direction === "desc" ? -1 : 1;

  return [...records].sort((a, b) => {
    const aValue = fieldValue(a, sort.key);
    const bValue = fieldValue(b, sort.key);

    if ((aValue ?? null) === (bValue ?? null)) {
      return 0;
    }

    if (aValue === null || aValue === undefined) {
      return 1;
    }

    if (bValue === null || bValue === undefined) {
      return -1;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * factor;
    }

    return String(aValue).localeCompare(String(bValue)) * factor;
  });
}

function generateRecord(collection: CmsCollection, index: number): CmsRecord {
  const id = `${collection.id.slice(0, 3)}-${String(index + 1).padStart(4, "0")}`;

  return {
    id,
    publishStatus: statuses[index % statuses.length],
    createdAt: isoFromSeed(-index - 1, index * 7),
    modifiedAt: isoFromSeed(-Math.floor(index / 2), index * 11),
    values: valuesForCollection(collection, index, id)
  };
}

function buildRecord(id: string, offset: number, values: Record<string, CmsRecordValue>): CmsRecord {
  return {
    id,
    publishStatus: statuses[offset % statuses.length],
    createdAt: isoFromSeed(-offset, offset),
    modifiedAt: isoFromSeed(-Math.floor(offset / 2), offset * 2),
    values
  };
}

function settingsRecord(id: string, offset: number, publishStatus: PublishStatus, values: Record<string, CmsRecordValue>): CmsRecord {
  return { ...buildRecord(id, offset, values), publishStatus };
}

function valuesForCollection(collection: CmsCollection, index: number, id: string): Record<string, CmsRecordValue> {
  const name = makeName(index);

  switch (collection.id) {
    case "articles":
      return {
        title: `${name}: notes from the field`,
        slug: slugify(`${name} notes from the field`),
        excerpt: makeParagraph(index, "article"),
        body: `${makeParagraph(index, "article")}\n\n${makeParagraph(index + 1, "follow-up")}`,
        coverImage: imageOrEmpty(index, collection.tableName, "cover", "png"),
        author: slugify(people[index % people.length]),
        category: ["guides", "news", "behind-the-scenes"][index % 3],
        tags: ["performance", "seo", "workflow", "cms", "astro"].filter((_, tagIndex) => (index + tagIndex) % 3 !== 0).join(", "),
        publishedAt: isoFromSeed(-index * 2, index * 7),
        readingTime: 3 + (index % 9),
        featured: index % 6 === 0,
        seoTitle: "",
        seoDescription: ""
      };
    case "products":
      return {
        title: `${name} ${["Mug", "Vase", "Throw", "Candle", "Print"][index % 5]}`,
        slug: slugify(`${name} ${index + 1}`),
        sku: `${words[index % words.length].slice(0, 3).toUpperCase()}-${1000 + index}`,
        category: ["ceramics", "textiles", "candles", "prints"][index % 4],
        price: Number(((index % 17) * 19 + 29.99).toFixed(2)),
        compareAtPrice: index % 5 === 0 ? Number(((index % 17) * 19 + 49.99).toFixed(2)) : 0,
        currency: pickOption(collection, "currency", index % 2 === 0 ? 0 : index),
        inventory: index % 7 === 0 ? 0 : (index * 13) % 120,
        availability: index % 7 === 0 ? "out_of_stock" : pickOption(collection, "availability", index % 2),
        shortDescription: makeParagraph(index, "product"),
        description: `${makeParagraph(index, "product")}\n\n${makeParagraph(index + 2, "care")}`,
        images: galleryOrEmpty(index, collection.tableName),
        productVideo: videoOrEmpty(index, collection.tableName),
        specSheet: fileOrEmpty(index, collection.tableName, "spec-sheet", "pdf", "application/pdf"),
        weightGrams: 150 + ((index * 37) % 2400),
        tags: ["handmade", "gift", "bestseller", "new"].filter((_, tagIndex) => (index + tagIndex) % 2 === 0).join(", "),
        featured: index % 8 === 0
      };
    case "form-submissions":
      return {
        submittedBy: people[index % people.length],
        email: `${slugify(people[index % people.length])}.${index}@example.test`,
        message: makeParagraph(index, "submission"),
        source: pickOption(collection, "source", index),
        score: index % 101,
        consent: index % 3 !== 0,
        attachment: assetOrEmpty(index, collection.tableName, "attachment", "pdf"),
        submittedAt: isoFromSeed(-index, index),
        submissionId: id
      };
    case "media-library":
      return {
        assetName: `${name} Asset ${index + 1}`,
        altText: index % 5 === 0 ? "" : `Alt text for ${name} asset ${index + 1}`,
        license: pickOption(collection, "license", index),
        width: 640 + ((index * 137) % 3600),
        height: 360 + ((index * 89) % 2400),
        sensitive: index % 9 === 0,
        file: assetOrEmpty(index, collection.tableName, "asset", index % 4 === 0 ? "pdf" : "jpg"),
        uploadedAt: isoFromSeed(-index, index * 6),
        assetId: id
      };
    case "redirect-rules":
      return {
        sourcePath: slugify(`old ${name} ${index}`),
        targetUrl: `https://www.threeacts.test/${slugify(name)}/${index + 1}`,
        notes: makeParagraph(index, "redirect rule"),
        statusCode: pickOption(collection, "statusCode", index),
        hits: (index * 977) % 50000,
        permanent: index % 4 !== 1,
        evidence: assetOrEmpty(index, collection.tableName, "audit", "csv"),
        lastHitAt: isoFromSeed(-index, index * 2),
        ruleId: id
      };
    default:
      return genericValues(collection, index, id);
  }
}

/**
 * Type-driven placeholder values for collections without hand-written
 * fixtures, so every registry collection renders populated records.
 */
function genericValues(collection: CmsCollection, index: number, id: string): Record<string, CmsRecordValue> {
  const name = makeName(index);
  const person = people[index % people.length];

  return collection.fields.reduce<Record<string, CmsRecordValue>>((values, field) => {
    const key = field.key.toLowerCase();
    switch (field.type) {
      case "slug":
        values[field.key] = slugify(`${name} ${index + 1}`);
        break;
      case "select":
        values[field.key] = pickOption(collection, field.key, index);
        break;
      case "number":
        values[field.key] = (index * 17) % 500;
        break;
      case "boolean":
        values[field.key] = index % 3 !== 0;
        break;
      case "datetime":
        values[field.key] = isoFromSeed(-index, index * 5);
        break;
      case "textarea":
        values[field.key] = makeParagraph(index, collection.label.toLowerCase());
        break;
      case "image":
        values[field.key] = imageOrEmpty(index, collection.tableName, field.key, "jpg");
        break;
      case "image-gallery":
        values[field.key] = galleryOrEmpty(index, collection.tableName);
        break;
      case "video":
        values[field.key] = videoOrEmpty(index, collection.tableName);
        break;
      case "file":
        values[field.key] = fileOrEmpty(index, collection.tableName, field.key, "pdf", "application/pdf");
        break;
      case "asset":
        values[field.key] = assetOrEmpty(index, collection.tableName, field.key, "jpg");
        break;
      case "readonly":
        values[field.key] = id;
        break;
      default:
        values[field.key] = key.includes("email")
          ? `${slugify(person)}.${index}@example.test`
          : key.includes("city")
            ? cities[index % cities.length]
            : key === collection.titleField?.toLowerCase() || key.endsWith("name")
            ? key.includes("customer") || key === "name"
              ? person
              : name
            : `${name} ${field.label.toLowerCase()}`;
    }
    return values;
  }, {});
}

let idCounter = 0;

/** crypto.randomUUID() when available; otherwise a monotonic counter + timestamp fallback. */
function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function createEmptyRecord(collection: CmsCollection, id = generateId(collection.id)): CmsRecord {
  const values = collection.fields.reduce<Record<string, CmsRecordValue>>((nextValues, field) => {
    if (field.type === "boolean") {
      nextValues[field.key] = false;
    } else if (field.type === "number") {
      nextValues[field.key] = 0;
    } else if (field.type === "readonly" && field.key.toLowerCase().includes("id")) {
      nextValues[field.key] = id;
    } else {
      nextValues[field.key] = "";
    }

    return nextValues;
  }, {});

  const now = new Date().toISOString();

  return {
    id,
    publishStatus: "not_published",
    createdAt: now,
    modifiedAt: now,
    values
  };
}

function coerceValue(field: CmsField, value: CmsRecordValue): CmsRecordValue {
  if (value === null || value === undefined) {
    return value;
  }

  const text = String(value).trim();

  if (field.type === "boolean") {
    const normalized = text.toLowerCase();

    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }

    // Explicit falsy set: "no"/"false"/"0"/"" (and anything else unrecognized).
    return false;
  }

  if (field.type === "number") {
    // Strip thousands separators, currency symbols, and whitespace (e.g. "$1,234.50") before parsing.
    const cleaned = text.replace(/[^0-9.-]/g, "");
    const parsed = Number(cleaned);

    // Keep the original value so validation can catch it, rather than silently coercing to 0.
    return cleaned === "" || Number.isNaN(parsed) ? value : parsed;
  }

  if (field.type === "select") {
    const selectField = field as SelectField;
    const exactMatch = selectField.options.find((option) => option.value === text);

    if (exactMatch) {
      return exactMatch.value;
    }

    const lowered = text.toLowerCase();
    const looseMatch = selectField.options.find(
      (option) => option.value.toLowerCase() === lowered || option.label.toLowerCase() === lowered
    );

    return looseMatch ? looseMatch.value : value;
  }

  if (field.type === "datetime") {
    return normalizeDateTime(value);
  }

  return value;
}

function makeName(index: number) {
  return `${words[index % words.length]} ${words[(index * 7 + 3) % words.length]}`;
}

function makeParagraph(index: number, subject: string) {
  const first = words[index % words.length].toLowerCase();
  const second = words[(index * 5 + 2) % words.length].toLowerCase();
  const third = words[(index * 11 + 4) % words.length].toLowerCase();
  return `Mock ${subject} ${index + 1} combines ${first}, ${second}, and ${third} signals to test dense editing, search matching, import/export output, and long-form field rendering.`;
}

function pickOption(collection: CmsCollection, fieldKey: string, index: number) {
  const field = collection.fields.find((item) => item.key === fieldKey);

  if (!field || field.type !== "select") {
    return "";
  }

  const selectField = field as SelectField;
  return selectField.options[index % selectField.options.length]?.value ?? "";
}

function assetOrEmpty(index: number, tableName: string, prefix: string, extension: string) {
  if (index % 7 === 0) {
    return "";
  }

  return `/mock-storage/cms-assets/${tableName}/${prefix}-${String(index + 1).padStart(3, "0")}.${extension}`;
}

/** Typed single-image JSON for realistic editor fixtures (empty every 7th record). */
function imageOrEmpty(index: number, tableName: string, prefix: string, extension: string): string {
  const src = assetOrEmpty(index, tableName, prefix, extension);
  if (!src) {
    return "";
  }

  const fileName = `${prefix}-${String(index + 1).padStart(3, "0")}.${extension}`;
  return serializeImageValue({
    src,
    fileName,
    size: 180000 + index * 2500,
    width: 1600,
    height: 900,
    alt: index % 3 === 0 ? "" : `${makeName(index)} ${prefix} image`
  });
}

/** Typed gallery JSON for image-gallery fields such as product images (empty every 5th record). */
function galleryOrEmpty(index: number, tableName: string): string {
  if (index % 5 === 0) {
    return "[]";
  }

  const items: ImageValue[] = [1, 2].map((n) => ({
    src: `/mock-storage/cms-assets/${tableName}/gallery-${String(index + 1).padStart(3, "0")}-${n}.jpg`,
    fileName: `gallery-${String(index + 1).padStart(3, "0")}-${n}.jpg`,
    size: 120000 + index * 1000 + n,
    width: 1600,
    height: 900,
    alt: n === 1 ? `Gallery image ${index + 1}a` : ""
  }));

  return serializeImageGallery(items);
}

/** Typed single-file JSON for file fields such as the product spec sheet (empty every 7th record). */
function fileOrEmpty(index: number, tableName: string, prefix: string, extension: string, contentType: string): string {
  const src = assetOrEmpty(index, tableName, prefix, extension);
  if (!src) {
    return "";
  }

  const value: FileValue = {
    src,
    fileName: `${prefix}-${String(index + 1).padStart(3, "0")}.${extension}`,
    size: 64000 + index * 1200,
    contentType
  };

  return serializeFileValue(value);
}

/** Typed single-video JSON for video fields such as the product video (empty every 4th record). */
function videoOrEmpty(index: number, tableName: string): string {
  if (index % 4 === 0) {
    return "";
  }

  const fileName = `demo-${String(index + 1).padStart(3, "0")}.mp4`;
  const value: VideoValue = {
    src: `/mock-storage/cms-assets/${tableName}/${fileName}`,
    fileName,
    size: 2400000 + index * 48000,
    contentType: "video/mp4"
  };

  return serializeVideoValue(value);
}

function isoFromSeed(dayOffset: number, minuteOffset: number) {
  const date = new Date(seedNow);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCMinutes(date.getUTCMinutes() + minuteOffset);
  return date.toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
