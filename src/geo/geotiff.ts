import { lzwDecode } from "./lzw.js";

/**
 * A single-band DEM raster with geographic placement: pixel (0,0) is the
 * north-west corner, rows run south, columns run east.
 */
export interface GeoGrid {
  width: number;
  height: number;
  scaleLonDeg: number;
  scaleLatDeg: number;
  westDeg: number;
  northDeg: number;
  heights: Float32Array;
}

const WIDTH = 256;
const HEIGHT = 257;
const BITS = 258;
const COMPRESSION = 259;
const STRIPOFFSETS = 273;
const SAMPLES = 277;
const ROWSPERSTRIP = 278;
const STRIPBYTES = 279;
const TILEWIDTH = 322;
const TILEHEIGHT = 323;
const TILEOFFSETS = 324;
const TILEBYTES = 325;
const SAMPLEFORMAT = 339;
const PIXELSCALE = 33550;
const TIEPOINT = 33922;

/** Parse a single-band tiled-or-stripped GeoTIFF (none/LZW, 8/16/32-bit). */
export function parseGeotiff(buf: ArrayBuffer): GeoGrid {
  const dv = new DataView(buf);
  const bom = dv.getUint16(0, false);
  if (bom !== 0x4949 && bom !== 0x4d4d) throw new Error("not a TIFF");
  const le = bom === 0x4949;
  if (dv.getUint16(2, le) !== 42) throw new Error("not a baseline TIFF");
  const tags = readEntries(dv, le, dv.getUint32(4, le));

  const width = need(tags, WIDTH, "ImageWidth")[0];
  const height = need(tags, HEIGHT, "ImageLength")[0];
  const bits = need(tags, BITS, "BitsPerSample")[0];
  const compression = tags.get(COMPRESSION)?.[0] ?? 1;
  const samples = tags.get(SAMPLES)?.[0] ?? 1;
  const format = tags.get(SAMPLEFORMAT)?.[0] ?? 1;
  if (samples !== 1) throw new Error("multi-band DEM not supported");
  if (compression !== 1 && compression !== 5) throw new Error(`unsupported compression ${compression}`);

  const scale = need(tags, PIXELSCALE, "ModelPixelScale");
  const tie = need(tags, TIEPOINT, "ModelTiepoint");
  if (tie.length < 6) throw new Error("missing tiepoint");

  const heights = new Float32Array(width * height);
  const bytesPerSample = bits / 8;
  if (bytesPerSample !== 1 && bytesPerSample !== 2 && bytesPerSample !== 4) {
    throw new Error(`unsupported bit depth ${bits}`);
  }

  const decompress = (start: number, len: number): Uint8Array => {
    const raw = new Uint8Array(buf, start, len);
    if (compression === 1) return raw;
    return lzwDecode(raw);
  };
  const readSample = (data: Uint8Array, off: number): number => {
    const d = new DataView(data.buffer, data.byteOffset, data.byteLength);
    if (bits === 32 && format === 3) return d.getFloat32(off * 4, le);
    if (bits === 16 && format === 2) return d.getInt16(off * 2, le);
    if (bits === 16 && format === 1) return d.getUint16(off * 2, le);
    if (bits === 8 && format === 1) return d.getUint8(off);
    throw new Error(`unsupported sample: ${bits}-bit format ${format}`);
  };

  if (tags.has(TILEOFFSETS)) {
    const tw = need(tags, TILEWIDTH, "TileWidth")[0];
    const th = need(tags, TILEHEIGHT, "TileLength")[0];
    const offs = need(tags, TILEOFFSETS, "TileOffsets");
    const cnts = need(tags, TILEBYTES, "TileByteCounts");
    const across = Math.ceil(width / tw);
    for (let t = 0; t < offs.length; t++) {
      const data = decompress(offs[t], cnts[t]);
      const tx = (t % across) * tw;
      const ty = Math.floor(t / across) * th;
      for (let r = 0; r < th && ty + r < height; r++) {
        for (let c = 0; c < tw && tx + c < width; c++) {
          heights[(ty + r) * width + tx + c] = readSample(data, r * tw + c);
        }
      }
    }
  } else {
    const offs = need(tags, STRIPOFFSETS, "StripOffsets");
    const cnts = tags.get(STRIPBYTES) ?? [];
    const rowsPer = tags.get(ROWSPERSTRIP)?.[0] ?? height;
    let row = 0;
    for (let s = 0; s < offs.length && row < height; s++) {
      const rows = Math.min(rowsPer, height - row);
      const len = cnts[s] ?? rows * width * bytesPerSample;
      const data = decompress(offs[s], len);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < width; c++) {
          heights[(row + r) * width + c] = readSample(data, r * width + c);
        }
      }
      row += rows;
    }
  }

  return {
    width,
    height,
    scaleLonDeg: scale[0],
    scaleLatDeg: scale[1],
    westDeg: tie[3],
    northDeg: tie[4],
    heights,
  };
}

function typeSize(type: number): number {
  switch (type) {
    case 1:
    case 2:
      return 1;
    case 3:
      return 2;
    case 4:
      return 4;
    case 5:
    case 12:
      return 8;
    default:
      throw new Error(`unknown TIFF type ${type}`);
  }
}

function readEntries(dv: DataView, le: boolean, ifd: number): Map<number, number[]> {
  const n = dv.getUint16(ifd, le);
  const m = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const o = ifd + 2 + i * 12;
    const tag = dv.getUint16(o, le);
    const type = dv.getUint16(o + 2, le);
    const count = dv.getUint32(o + 4, le);
    const size = typeSize(type) * count;
    const p = size <= 4 ? o + 8 : dv.getUint32(o + 8, le);
    const vals: number[] = [];
    for (let j = 0; j < count; j++) {
      const q = p + j * typeSize(type);
      switch (type) {
        case 1:
          vals.push(dv.getUint8(q));
          break;
        case 2:
          vals.push(dv.getUint8(q));
          break;
        case 3:
          vals.push(dv.getUint16(q, le));
          break;
        case 4:
          vals.push(dv.getUint32(q, le));
          break;
        case 5:
          vals.push(dv.getUint32(q, le) / (dv.getUint32(q + 4, le) || 1));
          break;
        case 12:
          vals.push(dv.getFloat64(q, le));
          break;
        default:
          throw new Error(`unknown TIFF type ${type}`);
      }
    }
    m.set(tag, vals);
  }
  return m;
}

function need(tags: Map<number, number[]>, tag: number, name: string): number[] {
  const v = tags.get(tag);
  if (!v) throw new Error(`missing required TIFF tag ${name} (${tag})`);
  return v;
}
