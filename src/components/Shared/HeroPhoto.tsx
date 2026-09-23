import avif600 from "../../assets/hero/hero-600.avif";
import jpg600 from "../../assets/hero/hero-600.jpg";
import webp600 from "../../assets/hero/hero-600.webp";
import avif1200 from "../../assets/hero/hero-1200.avif";
import jpg1200 from "../../assets/hero/hero-1200.jpg";
import webp1200 from "../../assets/hero/hero-1200.webp";

/*
 * The photo beside the landing and sign-in pages.
 *
 * It is the landing page's largest paint, and it was one 212 KB JPEG at
 * 1200x1797 for a box 600 CSS pixels wide - and on a phone, a 256px strip.
 * Now the browser picks: AVIF, then WebP, then JPEG, at 600 or 1200 wide
 * depending on the box and the screen's density (the 600px AVIF is 24 KB).
 *
 * width/height are the file's own 2:3, so the box is reserved before a byte
 * arrives; the CSS still decides the rendered size. `priority` is for the
 * landing page, where this is the LCP element and should not queue behind
 * the script; elsewhere it loads like any other image.
 */
// Matches the layouts: a 600px column from the lg breakpoint up, full width
// below it.
const SIZES = "(min-width: 1024px) 600px, 100vw";
const set = (small: string, large: string) => `${small} 600w, ${large} 1200w`;

interface HeroPhotoProps {
  priority?: boolean;
}

export default function HeroPhoto({ priority = false }: HeroPhotoProps) {
  return (
    // display: contents, so the img is laid out as the column's own child
    // and its h-full still means the column's height.
    <picture className="contents">
      <source type="image/avif" srcSet={set(avif600, avif1200)} sizes={SIZES} />
      <source type="image/webp" srcSet={set(webp600, webp1200)} sizes={SIZES} />
      {/* The JPEG is a source too, and the img carries no src of its own.
          React gives the img its attributes before it joins the picture,
          and WebKit fetches an img's src the moment it is set: with the
          JPEG on the img, Safari downloaded the JPEG candidates and then
          the AVIF the picture chose. Chromium and Firefox wait. Seen by the
          delivery test on WebKit, 2026-09-23. */}
      <source type="image/jpeg" srcSet={set(jpg600, jpg1200)} sizes={SIZES} />
      <img
        className="w-full h-full object-cover"
        width={600}
        height={899}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        alt="A dog in a park"
      />
    </picture>
  );
}
