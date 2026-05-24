/**
 * ocr-answers.cjs — Extract student answers from scanned quiz image
 * 
 * Uses GPT-4o vision via GitHub Models API to OCR handwritten chemistry answers.
 * 
 * Usage: node scripts/ocr-answers.cjs <image-path> <answer-key.json>
 * Output: JSON with extracted answers keyed by question ID
 * 
 * Requires: GITHUB_TOKEN env var (GitHub Models API access)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_URL = 'https://models.inference.ai.azure.com';
const MODEL = 'gpt-4o';

function buildPrompt(answerKey) {
  const questionIds = [];

  // Extract all question IDs from the answer key structure
  if (answerKey.answers) {
    // Legacy format (chem-42-answer-key.json style)
    for (const [qId, qData] of Object.entries(answerKey.answers)) {
      if (qData.type === 'formula-table' || qData.type === 'naming-table') {
        const rows = qData.rows || qData.formulaToName || qData.nameToFormula || [];
        for (const row of rows) {
          questionIds.push(`${qId}_row${row.row}`);
        }
        if (qData.formulaToName) {
          for (const row of qData.formulaToName) questionIds.push(`${qId}_f2n_row${row.row}`);
        }
        if (qData.nameToFormula) {
          for (const row of qData.nameToFormula) questionIds.push(`${qId}_n2f_row${row.row}`);
        }
      } else {
        questionIds.push(qId);
      }
    }
  } else if (answerKey.questions) {
    // Flat format
    for (const q of answerKey.questions) {
      questionIds.push(q.id);
    }
  }

  return `You are grading a handwritten chemistry quiz. Extract the student's answers from this scanned image.

Return a JSON object with this exact structure:
{
  "studentName": "<name if visible, otherwise 'unknown'>",
  "answers": {
    ${questionIds.map(id => `"${id}": "<student's written answer or null if blank>"`).join(',\n    ')}
  },
  "confidence": {
    ${questionIds.map(id => `"${id}": <0.0-1.0 confidence in OCR accuracy>`).join(',\n    ')}
  },
  "notes": "<any observations about handwriting quality, crossed-out answers, etc>"
}

Rules:
- For chemical formulas: preserve subscripts as digits (H2O not H₂O)
- For compound names: transcribe exactly as written including capitalization
- If an answer is crossed out and rewritten, use the final answer
- If you cannot read an answer at all, use null
- Include confidence scores: 1.0 = perfectly clear, 0.5 = partially legible, 0.0 = unreadable

Return ONLY valid JSON, no markdown fences.`;
}

async function callGPT4oVision(imagePath, prompt) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable required for GitHub Models API');
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const payload = JSON.stringify({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 2000
  });

  return new Promise((resolve, reject) => {
    const url = new URL('/chat/completions', API_URL);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API error ${res.statusCode}: ${data}`));
          return;
        }
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.message?.content;
          resolve(JSON.parse(content));
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${e.message}\nRaw: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// --- CLI ---

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node scripts/ocr-answers.cjs <image-path> <answer-key.json>');
    console.error('');
    console.error('  image-path:      JPEG/PNG scan of handwritten quiz');
    console.error('  answer-key.json: Answer key (used to know which questions to extract)');
    console.error('');
    console.error('Requires: GITHUB_TOKEN env var');
    process.exit(1);
  }

  const [imagePath, keyPath] = args;

  if (!fs.existsSync(imagePath)) {
    console.error(`Error: Image not found: ${imagePath}`);
    process.exit(1);
  }

  const answerKey = JSON.parse(fs.readFileSync(path.resolve(keyPath), 'utf8'));
  const prompt = buildPrompt(answerKey);

  callGPT4oVision(imagePath, prompt)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error(`OCR failed: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { buildPrompt, callGPT4oVision };
