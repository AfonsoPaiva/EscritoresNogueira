const fs = require('fs');
const path = require('path');

const outPath = path.join(process.cwd(), 'frontend', 'js', 'runtime-config.js');
const val = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080/api';
const content = `// generated at build time\nwindow.API_BASE = ${JSON.stringify(val)};\n`;
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content, 'utf8');
console.log('Wrote runtime config to', outPath);
