import { ApiRequestError } from "@three-acts/utils";
import { CmsError, cmsApiPaths, listRecordsQuery, MAX_ASSET_UPLOAD_BYTES } from "./types";
import type {
  AssetUploadResult,
  CmsBackend,
  CmsCollectionSummary,
  CmsErrorCode,
  CmsRecord,
  CmsRecordValue,
  CreateRecordBody,
  ImportRecordsBody,
  ListRecordsOptions,
  ListRecordsResult,
  PublishBody,
  PublishStatus,
  SaveRecordBody,
  SaveRecordOptions,
  SetPublishStatusBody,
  UploadAssetBody
} from "./types";

export type RestCmsBackendOptions = {
  apiFetch: <TData>(path: `/${string}`, init?: RequestInit) => Promise<TData>;
};

const KNOWN_CODES = new Set<CmsErrorCode>([
  "not_found",
  "validation",
  "conflict",
  "forbidden",
  "unauthorized",
  "readonly",
  "unavailable",
  "unknown"
]);

function toCmsErrorCode(code: string): CmsErrorCode {
  return KNOWN_CODES.has(code as CmsErrorCode) ? (code as CmsErrorCode) : "unknown";
}

/** Maps a shared-client failure onto the typed error the rest of the CMS branches on. */
function toCmsError(error: unknown): CmsError {
  if (error instanceof CmsError) {
    return error;
  }

  if (error instanceof ApiRequestError) {
    if (error.kind === "api") {
      return new CmsError(toCmsErrorCode(error.code), error.message, { status: error.status });
    }

    // network / timeout / unreadable: the API never gave us a usable answer.
    return new CmsError("unavailable", error.message, { status: error.status });
  }

  return new CmsError("unknown", error instanceof Error ? error.message : "API request failed.");
}

function jsonInit(body: unknown, method: "POST" | "PUT" = "POST"): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

/** Strips the `data:<mime>;base64,` prefix FileReader adds, leaving raw base64. */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error ?? new Error(`Unable to read ${file.name}.`));
    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error(`Unable to read ${file.name}.`));
        return;
      }

      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Backend that talks to `apps/api/api/cms/*` (see `cmsApiPaths` in
 * `@three-acts/cms-schema`) through the injected `apiFetch`, which already
 * attaches the bearer token, the timeout and the envelope parsing. Failures
 * arrive as `ApiRequestError` and are mapped onto `CmsError` codes here so the
 * workspace logic stays backend-agnostic.
 */
export function createRestCmsBackend(options: RestCmsBackendOptions): CmsBackend {
  async function cmsRequest<TData>(path: `/${string}`, init?: RequestInit): Promise<TData> {
    try {
      return await options.apiFetch<TData>(path, init);
    } catch (error) {
      throw toCmsError(error);
    }
  }

  return {
    name: "rest",

    data: {
      listCollections() {
        return cmsRequest<CmsCollectionSummary[]>(cmsApiPaths.collections());
      },

      listRecords(collectionId: string, listOptions?: ListRecordsOptions) {
        const path = `${cmsApiPaths.records(collectionId)}${listRecordsQuery(listOptions)}` as `/${string}`;
        return cmsRequest<ListRecordsResult>(path);
      },

      getRecord(collectionId: string, recordId: string) {
        return cmsRequest<CmsRecord>(cmsApiPaths.record(collectionId, recordId));
      },

      createRecord(collectionId: string, values?: Partial<Record<string, CmsRecordValue>>) {
        const body: CreateRecordBody = { values };
        return cmsRequest<CmsRecord>(cmsApiPaths.records(collectionId), jsonInit(body));
      },

      saveRecord(collectionId: string, record: CmsRecord, saveOptions?: SaveRecordOptions) {
        const body: SaveRecordBody = { record, expectedModifiedAt: saveOptions?.expectedModifiedAt };
        return cmsRequest<CmsRecord>(cmsApiPaths.record(collectionId, record.id), jsonInit(body, "PUT"));
      },

      async deleteRecord(collectionId: string, recordId: string) {
        await cmsRequest<{ deleted: true }>(cmsApiPaths.record(collectionId, recordId), { method: "DELETE" });
      },

      importRecords(collectionId: string, rows: Array<Record<string, CmsRecordValue>>) {
        const body: ImportRecordsBody = { rows };
        return cmsRequest<CmsRecord[]>(cmsApiPaths.import(collectionId), jsonInit(body));
      },

      publishQueued(collectionId?: string) {
        const body: PublishBody = { collectionId };
        return cmsRequest<{ published: number }>(cmsApiPaths.publish(), jsonInit(body));
      },

      setPublishStatus(collectionId: string, recordIds: string[], status: Exclude<PublishStatus, "published">) {
        const body: SetPublishStatusBody = { recordIds, publishStatus: status };
        return cmsRequest<CmsRecord[]>(cmsApiPaths.status(collectionId), jsonInit(body));
      }
    },

    storage: {
      async uploadAsset(collectionId: string, fieldKey: string, file: File): Promise<AssetUploadResult> {
        if (file.size > MAX_ASSET_UPLOAD_BYTES) {
          const limitMb = (MAX_ASSET_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
          const fileMb = (file.size / (1024 * 1024)).toFixed(1);
          throw new CmsError("validation", `${file.name} is ${fileMb}MB, which is over the ${limitMb}MB upload limit.`);
        }

        const data = await readFileAsBase64(file);
        const body: UploadAssetBody = {
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          data
        };

        return cmsRequest<AssetUploadResult>(cmsApiPaths.asset(collectionId, fieldKey), jsonInit(body));
      }
    }
  };
}
