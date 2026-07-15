import { access, readFile } from 'node:fs/promises';

const requiredFiles = ['index.html', 'src/main.js', 'src/styles.css'];
await Promise.all(requiredFiles.map((file) => access(file)));

const html = await readFile('index.html', 'utf8');
const script = await readFile('src/main.js', 'utf8');
const styles = await readFile('src/styles.css', 'utf8');

const checks = [
  ['Arabic document direction', html.includes('dir="rtl"')],
  ['Canvas scene exists', html.includes('id="molecule-scene"')],
  ['Animation loop exists', script.includes('requestAnimationFrame')],
  ['Responsive styles exist', styles.includes('@media')],
];

const failed = checks.filter(([, passed]) => !passed);
checks.forEach(([name, passed]) => console.log(`${passed ? '✓' : '✗'} ${name}`));
if (failed.length > 0) {
  process.exitCode = 1;
}
