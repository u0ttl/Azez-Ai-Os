import './styles.css';

const canvas = document.querySelector('#molecule-scene');
const context = canvas.getContext('2d');
const atoms = [
  { x: 0.48, y: 0.42, r: 28, color: '#38d5ff', phase: 0 },
  { x: 0.34, y: 0.29, r: 18, color: '#f7fbff', phase: 1.8 },
  { x: 0.64, y: 0.28, r: 16, color: '#8ef6d3', phase: 3.1 },
  { x: 0.61, y: 0.58, r: 22, color: '#b68cff', phase: 4.2 },
  { x: 0.28, y: 0.61, r: 14, color: '#ffe08a', phase: 5.4 },
];

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * pixelRatio;
  canvas.height = window.innerHeight * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function atomPosition(atom, time) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const orbit = Math.sin(time + atom.phase) * 24;
  return {
    x: atom.x * width + Math.cos(time * 0.7 + atom.phase) * orbit,
    y: atom.y * height + Math.sin(time * 0.9 + atom.phase) * orbit,
  };
}

function drawGlow(x, y, radius, color) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 3.4);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.35, `${color}99`);
  gradient.addColorStop(1, 'transparent');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius * 3.4, 0, Math.PI * 2);
  context.fill();
}

function animate(timestamp) {
  const time = timestamp * 0.001;
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const positions = atoms.map((atom) => ({ ...atomPosition(atom, time), atom }));

  context.lineWidth = 2;
  positions.forEach((start, index) => {
    positions.slice(index + 1).forEach((end) => {
      const distance = Math.hypot(start.x - end.x, start.y - end.y);
      if (distance < 360) {
        context.strokeStyle = `rgba(121, 225, 255, ${1 - distance / 420})`;
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
      }
    });
  });

  positions.forEach(({ x, y, atom }) => {
    drawGlow(x, y, atom.r, atom.color);
    context.fillStyle = atom.color;
    context.beginPath();
    context.arc(x, y, atom.r + Math.sin(time * 2 + atom.phase) * 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.62)';
    context.beginPath();
    context.arc(x - atom.r * 0.28, y - atom.r * 0.32, atom.r * 0.22, 0, Math.PI * 2);
    context.fill();
  });

  requestAnimationFrame(animate);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
requestAnimationFrame(animate);
