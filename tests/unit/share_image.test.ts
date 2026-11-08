import { statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { pageMetadata } from "../../src/metadata";

describe("share images", () => {
  it("uses the site picture unless a page gives its own", () => {
    expect(pageMetadata("Cocktails", "Drinks").openGraph).toMatchObject({
      images: "/opengraph-image",
    });
  });

  it("uses a page's own picture when it gives one", () => {
    const image = { url: "/images/x.jpg", width: 1200, height: 630, alt: "X" };
    expect(pageMetadata("X", "Y", image).openGraph).toMatchObject({
      images: image,
    });
  });

  it("has an Uno challenge picture of the size it claims, small enough for WhatsApp", async () => {
    const file = join(process.cwd(), "public", "images", "uno-challenge.jpg");
    const { width, height, format } = await sharp(file).metadata();
    expect({ width, height, format }).toEqual({
      width: 1200,
      height: 630,
      format: "jpeg",
    });
    expect(statSync(file).size).toBeLessThan(300 * 1024);
  });
});
