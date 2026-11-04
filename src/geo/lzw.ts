/** TIFF LZW decoding (early code-width change, as written by libtiff/GDAL). */
export function lzwDecode(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let table: Uint8Array[] = [];
  const reset = (): void => {
    table = [];
    for (let i = 0; i < 256; i++) table.push(new Uint8Array([i]));
    table.push(new Uint8Array(0), new Uint8Array(0)); // 256 clear, 257 EOI
  };
  reset();
  let width = 9;
  let prev: Uint8Array | null = null;
  let buf = 0;
  let cnt = 0;
  let pos = 0;
  while (true) {
    while (cnt < width) {
      if (pos >= data.length) return Uint8Array.from(out);
      buf = (buf << 8) | data[pos++];
      cnt += 8;
    }
    const code = (buf >>> (cnt - width)) & ((1 << width) - 1);
    cnt -= width;
    if (code === 256) {
      reset();
      width = 9;
      prev = null;
      continue;
    }
    if (code === 257) break;
    let entry: Uint8Array;
    if (prev === null) {
      entry = table[code];
    } else {
      if (code < table.length) entry = table[code];
      else if (code === table.length) entry = append(prev, prev[0]);
      else throw new Error(`lzw: bad code ${code} at width ${width}`);
      table.push(append(prev, entry[0]));
      if (table.length >= (1 << width) - 1 && width < 12) width++;
    }
    for (let i = 0; i < entry.length; i++) out.push(entry[i]);
    prev = entry;
  }
  return Uint8Array.from(out);
}

function append(a: Uint8Array, b: number): Uint8Array {
  const o = new Uint8Array(a.length + 1);
  o.set(a);
  o[a.length] = b;
  return o;
}
