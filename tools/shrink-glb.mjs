// Shrinks a GLB's embedded textures and rewrites the container. Build-time only: the game itself
// has no build step and never runs this.
//
//   npm i sharp
//   node tools/shrink-glb.mjs assets/models/gundam-rigged.glb assets/models/mech-gundam.glb
//
// The Gundam went 10.16 MB -> 1.74 MB this way: 4k normal/colour/ORM maps down to 1k/1k/512 JPEG.
// Mesh compression is deliberately skipped — no Draco or meshopt decoder is vendored.
import fs from 'node:fs';
import sharp from 'sharp';

const [, , IN, OUT] = process.argv;
const buf = fs.readFileSync(IN);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
const binHeader = 20 + jsonLen;
const binLen = buf.readUInt32LE(binHeader);
const bin = buf.slice(binHeader + 8, binHeader + 8 + binLen);

// name fragment -> { size, quality }; normal maps stay a touch sharper than the ORM mask.
const PLAN = { Color: { size: 1024, q: 86 }, NormalGL: { size: 1024, q: 90 }, ORM: { size: 512, q: 82 } };

const slice = (i) => {
  const v = json.bufferViews[i];
  return bin.slice(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
};

const plans = json.images.map((im) => PLAN[Object.keys(PLAN).find((k) => im.name?.startsWith(k))] ?? { size: 512, q: 82 });
const encoded = await Promise.all(json.images.map(async (im, i) => {
  const src = slice(im.bufferView);
  const p = plans[i];
  const out = await sharp(src).resize(p.size, p.size, { fit: 'inside' }).jpeg({ quality: p.q, mozjpeg: true }).toBuffer();
  console.log(`${im.name}: ${(src.length / 1048576).toFixed(2)}MB -> ${(out.length / 1024).toFixed(0)}KB @${p.size}`);
  return out;
}));

// Rebuild the binary chunk: every non-image view first (offsets preserved), then the new images.
const imageViews = new Set(json.images.map((im) => im.bufferView));
const keep = json.bufferViews.map((v, i) => (imageViews.has(i) ? null : v));
const parts = [];
let off = 0;
const pad4 = (n) => (4 - (n % 4)) % 4;
json.bufferViews.forEach((v, i) => {
  if (!keep[i]) return;
  parts.push(bin.slice(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength));
  v.byteOffset = off;
  off += v.byteLength;
  const pad = pad4(off);
  if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
});
json.images.forEach((im, i) => {
  const v = json.bufferViews[im.bufferView];
  const data = encoded[i];
  delete v.byteStride;
  v.byteOffset = off;
  v.byteLength = data.length;
  parts.push(data);
  off += data.length;
  const pad = pad4(off);
  if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
  im.mimeType = 'image/jpeg';
});
json.buffers[0].byteLength = off;
delete json.buffers[0].uri;

const newBin = Buffer.concat(parts, off);
let jsonStr = JSON.stringify(json);
jsonStr += ' '.repeat(pad4(Buffer.byteLength(jsonStr)));
const jsonBuf = Buffer.from(jsonStr, 'utf8');
const head = Buffer.alloc(12);
head.write('glTF', 0, 'ascii');
head.writeUInt32LE(2, 4);
head.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + newBin.length, 8);
const jc = Buffer.alloc(8);
jc.writeUInt32LE(jsonBuf.length, 0);
jc.writeUInt32LE(0x4e4f534a, 4);
const bc = Buffer.alloc(8);
bc.writeUInt32LE(newBin.length, 0);
bc.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(OUT, Buffer.concat([head, jc, jsonBuf, bc, newBin]));
console.log(`${OUT}: ${(fs.statSync(OUT).size / 1048576).toFixed(2)}MB (was ${(buf.length / 1048576).toFixed(2)}MB)`);
