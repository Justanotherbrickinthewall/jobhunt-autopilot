// The home screen icons: a crescent moon on the page colour. Plain Node, no dependencies, same bytes on every run.
// The moon stays inside the middle 60% of the square, so the icons also work as maskable.
import { deflateSync } from 'node:zlib'

export const ICONS = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
] as const

const BG = [0x12, 0x15, 0x13]
const MOON = [0x7c, 0xc4, 0xac]

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc32 = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// Inside the big disc (radius 0.28, centred) and outside the bite taken from its upper right (radius 0.24).
const inMoon = (x: number, y: number): boolean => (x - 0.5) ** 2 + (y - 0.5) ** 2 <= 0.28 ** 2 && (x - 0.61) ** 2 + (y - 0.44) ** 2 > 0.24 ** 2

export function renderIcon(size: number): Buffer {
  const SS = 4
  const rows = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    const o = y * (size * 3 + 1)
    for (let x = 0; x < size; x++) {
      let hit = 0
      for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) if (inMoon((x + (i + 0.5) / SS) / size, (y + (j + 0.5) / SS) / size)) hit++
      const t = hit / (SS * SS)
      for (let c = 0; c < 3; c++) rows[o + 1 + x * 3 + c] = Math.round(BG[c] + (MOON[c] - BG[c]) * t)
    }
  }
  const head = Buffer.alloc(13)
  head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4)
  head[8] = 8; head[9] = 2   // 8 bits, RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}
