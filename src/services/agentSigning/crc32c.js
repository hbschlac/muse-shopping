/**
 * CRC32C (Castagnoli), used for Cloud KMS end-to-end integrity checks.
 * KMS returns the checksum of what it signed and of the signature; if either
 * does not match, the request or response was altered in transit.
 */

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0x82f63b78 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32c(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) crc = TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

module.exports = { crc32c };
