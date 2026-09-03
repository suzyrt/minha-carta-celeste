import { mkdir, writeFile } from 'node:fs/promises';

const commit = '7e720a3de062059d4c5400a379146a601d9010e0';
const files = ['stars.6.json', 'constellations.lines.json'];
const base = `https://raw.githubusercontent.com/ofrohn/d3-celestial/${commit}/data`;

await mkdir('data', { recursive: true });

for (const file of files) {
  const response = await fetch(`${base}/${file}`);
  if (!response.ok) throw new Error(`Falha ao obter ${file}: ${response.status}`);
  const text = await response.text();
  JSON.parse(text);
  await writeFile(`data/${file}`, text, 'utf8');
  console.log(`Dados celestes preparados: data/${file}`);
}
