import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

// 16x16 PNG with a blue-indigo pixel rounded icon
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJESURBVHgB7VdLSwJRFD7jOKN51UqLUdESWvSDtq02/UFpEYG2bdsiWvQBtWqRLqRVRLSK2kW9C1Kq1cIsjcrHzHQ6r58z17mOH9B64XB57pxzvt/5njs4xH/Gf/g7bB01z1QhBfAFaXg3aQy3j4wVb1uP0oG2gX1jG1tq734pAKG9ZlV2tTf/i3rG0v60sU9Gv9o1qTf4fV1gA662p8FfI58A/sPfxP8VgF5g622U9wVp+EtoDFuT800+q5f5q6FjT+yZ8a6Vj24A8e2q5G6Uj14AcZ6sLp5f3l79A63tHqUqK4gPnwCe4x7Jg67jK0e7368qC57/wA0W9U3aH44jO4g244G8G4/G0eT7W5m4d0pXg2/bY213p8+4X99ZgXbI8fV7p4X61e1b1vOqZk0/F7oA6h1/2L6n0/v39vXf1h1o82V88bWf6P67L0B4a/r28Qp3t6e115q1O3b5rK91+zJ0AeQpve8+n5e/9h5r1o5/a63Xn9p2fegCqFfvfUvtzw/P3mPV6uX3vPau0y6kL0DXFw4P2r/v8V1t1o972+X7y4oA7/s6m68vQFdY3Dlo627j87GvN7x53l+t2s1hN6b7s5j79hD6fV/lC92+jX6+f+1t9j12e+0uK3b7p+p6vL8g704C876vskbOq/d41e7+Bv2Nrn31o425712eOQ67L0BX78+3D0/3k8eG2qU32tZt/mUeR70FpQ93a+Vz3Z2q549fJj/18oP+/A3/o1wPvwD4XwW8k4wQ8AAAAABJRU5ErkJggg==';

const pngBuffer = Buffer.from(base64Png, 'base64');

// Construct ICO header + directory entry pointing to PNG data
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // ICO type
icoHeader.writeUInt16LE(1, 4); // 1 image

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(32, 0); // Width
icoEntry.writeUInt8(32, 1); // Height
icoEntry.writeUInt8(0, 2);  // Colors
icoEntry.writeUInt8(0, 3);  // Reserved
icoEntry.writeUInt16LE(1, 4); // Color planes
icoEntry.writeUInt16LE(32, 6); // Bits per pixel
icoEntry.writeUInt32LE(pngBuffer.length, 8); // Image size
icoEntry.writeUInt32LE(22, 12); // Offset to image data (6 + 16 = 22)

const icoBuffer = Buffer.concat([icoHeader, icoEntry, pngBuffer]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
console.log('Successfully generated public/favicon.ico');
