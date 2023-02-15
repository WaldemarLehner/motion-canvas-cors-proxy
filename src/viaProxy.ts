/**
 * Converts a source, for example and image,
 * into a call to the locally running proxy.
 *
 * Only use this for remote images. Do not use this
 * for images imported via vite as they are already served locally.
 *
 */
export function viaProxy(srcIdentifier: string) {
  return `/cors-proxy/${encodeURIComponent(srcIdentifier)}`;
}
