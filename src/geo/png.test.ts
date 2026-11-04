import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { encodePngRgb } from "./png.js";

function chunks(png: Uint8Array): { type: string; data: Uint8Array }[] {
  const out: { type: string; data: Uint8Array }[] = [];
  let p = 8;
  while (p + 8 <= png.length) {
    const len = (png[p] << 24) | (png[p + 1] << 16) | (png[p + 2] << 8) | png[p + 3];
    const type = String.fromCharCode(png[p + 4], png[p + 5], png[p + 6], png[p + 7]);
    out.push({ type, data: png.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
    if (type === "IEND") break;
  }
  return out;
}

describe("encodePngRgb", () => {
  it("produces a structurally valid PNG that inflates back to the raw scanlines", () => {
    const w = 3;
    const h = 2;
    const rgb = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    const png = encodePngRgb(w, h, rgb);

    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const cs = chunks(png);
    expect(cs.map((c) => c.type)).toEqual(["IHDR", "IDAT", "IEND"]);

    const ihdr = cs[0].data;
    const width = (ihdr[0] << 24) | (ihdr[1] << 16) | (ihdr[2] << 8) | ihdr[3];
    const height = (ihdr[4] << 24) | (ihdr[5] << 16) | (ihdr[6] << 8) | ihdr[7];
    expect(width).toBe(w);
    expect(height).toBe(h);
    expect(ihdr[8]).toBe(8);
    expect(ihdr[9]).toBe(2);

    const inflated = inflateSync(Buffer.from(cs[1].data));
    expect(inflated.length).toBe(h * (1 + w * 3));
    expect(inflated[0]).toBe(0); // filter none
    expect([...inflated.subarray(1, 1 + 9)]).toEqual([255, 0, 0, 0, 255, 0, 0, 0, 255]);
    expect(inflated[4]).toBe(0); // row 2 filter byte
    expect([...inflated.subarray(5, 5 + 9)]).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
  });

  it("round-trips pixel data for a larger image across stored-block boundaries", () => {
    const w = 300;
    const h = 200;
    const rgb = new Uint8Array(w * h * 3);
    for (let i = 0; i < rgb.length; i++) rgb[i] = i % 251;
    const png = encodePngRgb(w, h, rgb);
    const cs = chunks(png);
    const inflated = inflateSync(Buffer.from(cs[1].data));
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w * 3; c++) {
        expect(inflated[r * (1 + w * 3) + 1 + c]).toBe(rgb[r * w * 3 + c]);
      }
    }
  });
});
