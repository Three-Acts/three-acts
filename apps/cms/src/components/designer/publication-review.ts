import { cmsValuesHash, hasPublishWorkflow, publicationLimits, readReviewedCmsRecords, type CmsDataAdapter, type ReviewedCmsRecord } from "@three-acts/cms-schema";
import { getRecordTitle } from "../../lib/records";

export type CmsPublicationReviewItem = { record: ReviewedCmsRecord; label: string; collectionLabel: string };

/** A complete bounded queue snapshot. Never quietly publish the first page
 * or include operational/readonly collections. Promotion rechecks versions. */
export async function loadCmsPublicationReview(data: Pick<CmsDataAdapter, "listCollections" | "listRecords">, signal?: AbortSignal): Promise<CmsPublicationReviewItem[]> {
  signal?.throwIfAborted();
  const publishable = (await data.listCollections()).filter(hasPublishWorkflow);
  if (publishable.some(collection => !Number.isInteger(collection.queuedCount) || collection.queuedCount < 0)) throw new Error("The CMS queue summary is invalid. Reload the review.");
  const collections = publishable.filter(collection => collection.queuedCount > 0);
  const count = collections.reduce((total, collection) => total + collection.queuedCount, 0);
  if (!Number.isInteger(count) || count > publicationLimits.records) throw new Error(`Review at most ${publicationLimits.records} queued CMS records in one release.`);
  const result: CmsPublicationReviewItem[] = [];
  for (const collection of collections) {
    const seen = new Set<string>();
    for (let offset = 0; offset < collection.queuedCount; offset += 100) {
      signal?.throwIfAborted();
      const page = await data.listRecords(collection.id, { publishStatus: "queued_to_publish", sort: { key: "modifiedAt", direction: "asc" }, limit: 100, offset });
      if (page.total !== collection.queuedCount || !page.records.length || page.records.length > 100 || offset + page.records.length > collection.queuedCount) throw new Error("The CMS queue changed while review was loading. Reload the review.");
      for (const record of page.records) {
        if (seen.has(record.id) || record.publishStatus !== "queued_to_publish") throw new Error("The CMS queue changed while review was loading. Reload the review.");
        seen.add(record.id);
        const reviewed = { collectionId: collection.id, id: record.id, modifiedAt: record.modifiedAt, valuesHash: await cmsValuesHash(record.values) };
        readReviewedCmsRecords([reviewed]);
        result.push({ record: reviewed, label: getRecordTitle(collection, record).slice(0, 200), collectionLabel: collection.label });
      }
      if (page.records.length < 100 && offset + page.records.length !== collection.queuedCount) throw new Error("The CMS queue is incomplete. Reload the review before publishing.");
    }
    if (seen.size !== collection.queuedCount) throw new Error("The CMS queue is incomplete. Reload the review before publishing.");
  }
  signal?.throwIfAborted();
  readReviewedCmsRecords(result.map(item => item.record));
  return result;
}
