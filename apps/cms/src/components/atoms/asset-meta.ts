export type AssetMeta = { fileName: string; size: number };

// The upload response is the only place a fresh file's real name/size live.
// Asset fields persist just a URL, so retain this ephemeral display metadata
// by URL for the current editor session.
const assetMetaByUrl = new Map<string, AssetMeta>();

export function rememberAssetMeta(url: string, meta: AssetMeta): void {
  assetMetaByUrl.set(url, meta);
}

export function getAssetMeta(url: string): AssetMeta | undefined {
  return assetMetaByUrl.get(url);
}
