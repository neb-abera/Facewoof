/*
 * Asking for a photo at the size it is shown.
 *
 * The demo roster's photos are placedog.net URLs of the form
 * /500/400?id=N, and an 80-112px avatar was downloading that 500x400
 * original - about 46 KB to paint a circle a 10 KB file fills. placedog
 * sizes by path (/W/H?id=N is the same dog at another size), so an avatar
 * asks for a square at twice its CSS size, which is what a retina screen
 * paints.
 *
 * Anything else comes back untouched. Cloudinary could do the same with a
 * transformation segment, but an account can be set to refuse transformations
 * it has not been told about, and a refused avatar is a broken image; an
 * uploaded photo is left as its owner's account serves it.
 */
const PLACEDOG = /^https:\/\/placedog\.net\/\d+(?:\/\d+)?\/?(\?.*)?$/;

export function avatarUrl(
  url: string | null | undefined,
  cssPixels: number,
): string | undefined {
  if (!url) return undefined;
  const match = PLACEDOG.exec(url);
  if (!match) return url;
  // Without an id placedog picks a dog at random per request, so a resized
  // URL would be a different dog from the one in the carousel.
  const query = match[1] ?? "";
  if (!/[?&]id=\d+/.test(query)) return url;
  const side = Math.round(cssPixels * 2);
  return `https://placedog.net/${side}/${side}${query}`;
}
