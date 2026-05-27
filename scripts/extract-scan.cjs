/**
 * extract-scan.cjs — Extract JPEG pages from a scanned PDF
 *
 * Walks the raw bytes of a PDF and extracts every embedded JPEG image,
 * writing one JPEG per detected stream. Output is directly consumable
 * by ocr-answers.cjs.
 *
 * This zero-dependency byte-marker approach works because Microsoft Lens,
 * flatbed scanners, and most "Scan to PDF" tools embed each page as a
 * DCTDecode (JPEG) XObject stream. We locate JPEG SOI (0xFFD8) and EOI
 * (0xFFD9) markers in the raw PDF bytes and write each pair out.
 *
 * Usage:   node scripts/extract-scan.cjs <input.pdf> [output-dir]
 * Output:  <output-dir>/page-001.jpg, page-002.jpg, ...
 *          (defaults to ./scans/<pdf-basename>/)
 *
 * If the PDF does NOT contain embedded JPEGs (e.g. PDFs built from vector
 * pages or other image codecs like CCITTFax/JBIG2/Flate), the script
 * exits 2 with a clear message — fall back to a rasterizer tool.
 *
 * See: docs/products/motor-city-chemistry/prd.md §8 (open question #4)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const JPEG_SOI = Buffer.from([0xFF, 0xD8, 0xFF]);
const JPEG_EOI = Buffer.from([0xFF, 0xD9]);

function extractJpegs(pdfBuffer) {
  const jpegs = [];
  let cursor = 0;

  while (cursor < pdfBuffer.length) {
    const soi = pdfBuffer.indexOf(JPEG_SOI, cursor);
    if (soi === -1) break;

    const eoi = pdfBuffer.indexOf(JPEG_EOI, soi + JPEG_SOI.length);
    if (eoi === -1) break;

    const end = eoi + JPEG_EOI.length;
    const jpeg = pdfBuffer.subarray(soi, end);

    // Sanity check: real scanned-page JPEGs are at least ~4 KB.
    // Thumbnails and inline icons are usually much smaller.
    if (jpeg.length >= 4 * 1024) {
      jpegs.push(jpeg);
    }

    cursor = end;
  }

  return jpegs;
}

function pad3(n) {
  return String(n).padStart(3, '0');
}

// --- CLI ---

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node scripts/extract-scan.cjs <input.pdf> [output-dir]');
    console.error('');
    console.error('  input.pdf:  Scanned PDF (Microsoft Lens or flatbed scanner output)');
    console.error('  output-dir: Optional, defaults to ./scans/<pdf-basename>/');
    console.error('');
    console.error('Output: page-001.jpg, page-002.jpg, ... consumable by ocr-answers.cjs');
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: PDF not found: ${inputPath}`);
    process.exit(1);
  }

  if (path.extname(inputPath).toLowerCase() !== '.pdf') {
    console.error(`Error: Input must be a .pdf file (got ${path.extname(inputPath)})`);
    process.exit(1);
  }

  const pdfBuffer = fs.readFileSync(inputPath);

  if (pdfBuffer.length < 5 || pdfBuffer.subarray(0, 5).toString('utf8') !== '%PDF-') {
    console.error(`Error: File does not appear to be a valid PDF (missing %PDF- header): ${inputPath}`);
    process.exit(1);
  }

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputDir = args[1]
    ? path.resolve(args[1])
    : path.resolve(process.cwd(), 'scans', baseName);

  fs.mkdirSync(outputDir, { recursive: true });

  const jpegs = extractJpegs(pdfBuffer);

  if (jpegs.length === 0) {
    console.error(`No JPEG streams found in ${inputPath}.`);
    console.error('PDF may use a non-JPEG image codec (CCITTFax / JBIG2 / Flate) or vector pages.');
    console.error('Use a rasterizer (e.g. pdf-poppler) for this input.');
    process.exit(2);
  }

  jpegs.forEach((jpeg, i) => {
    const outPath = path.join(outputDir, `page-${pad3(i + 1)}.jpg`);
    fs.writeFileSync(outPath, jpeg);
    console.log(`wrote ${outPath} (${jpeg.length} bytes)`);
  });

  console.log(`\nExtracted ${jpegs.length} page(s) to ${outputDir}`);
}

module.exports = { extractJpegs };
