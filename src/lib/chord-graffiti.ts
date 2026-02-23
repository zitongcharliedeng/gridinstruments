import rough from 'roughjs';

// Chord shapes in grid coordinates (col, row)
// These are the MidiMech "mech-theory" shapes
const MAJOR_SHAPE = [[0, 0], [1, 1], [2, 0]]; // triangle UP: root(0,0), maj3(1,1), p5(2,0)
const MINOR_SHAPE = [[0, 1], [1, 0], [2, 1]]; // triangle DOWN: min3(0,1), root(1,0), p5(2,1)

interface GraffitiConfig {
  container: HTMLElement;
  cellSize?: number; // size of each grid cell in the diagram
}

export function createChordGraffiti(config: GraffitiConfig): void {
  const { container: _container, cellSize = 40 } = config;
  
  // Find good placement areas - look for the about section and keyboard container
  const aboutSection = document.getElementById('about');
  const keyboardContainer = document.getElementById('keyboard-container');
  
  if (!aboutSection || !keyboardContainer) return;
  
  // Major chord - place near the left side of about section
  createChordOverlay({
    parent: aboutSection,
    shape: MAJOR_SHAPE,
    label: 'psst... this is a major chord',
    cellSize,
    offsetX: -20,
    offsetY: -60,
    rotation: -12,
    seed: 42,
  });
  
  // Minor chord - place near the right side of about section
  createChordOverlay({
    parent: aboutSection,
    shape: MINOR_SHAPE,
    label: '...and this is minor',
    cellSize,
    offsetX: aboutSection.offsetWidth - 180,
    offsetY: -50,
    rotation: 8,
    seed: 77,
  });
}

function createChordOverlay(opts: {
  parent: HTMLElement;
  shape: number[][];
  label: string;
  cellSize: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  seed: number;
}): void {
  const { parent, shape, label, cellSize, offsetX, offsetY, rotation, seed } = opts;
  
  // Ensure parent has position: relative for absolute children
  const parentStyle = getComputedStyle(parent);
  if (parentStyle.position === 'static') {
    parent.style.position = 'relative';
  }
  
  const padding = 30;
  const cols = 3, rows = 2;
  const svgW = cols * cellSize + padding * 2;
  const svgH = rows * cellSize + padding * 2 + 30; // extra for label
  
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('width', String(svgW));
  svgEl.setAttribute('height', String(svgH));
  svgEl.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
  svgEl.classList.add('graffiti-overlay');
  svgEl.style.left = `${offsetX}px`;
  svgEl.style.top = `${offsetY}px`;
  svgEl.style.transform = `rotate(${rotation}deg)`;
  svgEl.style.opacity = '0.75';
  
  const rc = rough.svg(svgEl);
  
  // Convert grid coords to pixel positions (centers of cells)
  const centers = shape.map(([col, row]) => [
    padding + col * cellSize + cellSize / 2,
    padding + (1 - row) * cellSize + cellSize / 2, // flip Y so row 1 is above row 0
  ]);
  
  // Draw the triangle connecting the three chord tones
  const triangleNode = rc.polygon(centers as [number, number][], {
    roughness: 2.5,
    bowing: 1.5,
    stroke: '#FFD700',
    strokeWidth: 2.5,
    fill: 'rgba(255, 200, 0, 0.06)',
    fillStyle: 'hachure',
    hachureAngle: 45,
    hachureGap: 12,
    fillWeight: 1.2,
    seed,
    disableMultiStroke: false,
  });
  svgEl.appendChild(triangleNode);
  
  // Draw small squares for each chord tone
  shape.forEach(([col, row], i) => {
    const x = padding + col * cellSize + 4;
    const y = padding + (1 - row) * cellSize + 4;
    const cellNode = rc.rectangle(x, y, cellSize - 8, cellSize - 8, {
      roughness: 1.8,
      stroke: '#FFD700',
      strokeWidth: 1.5,
      fill: i === 0 ? 'rgba(255, 200, 0, 0.15)' : 'rgba(255, 200, 0, 0.08)', // root brighter
      fillStyle: 'solid',
      seed: seed + i + 1,
    });
    svgEl.appendChild(cellNode);
  });
  
  // Add scribbled label text
  const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textEl.setAttribute('x', String(padding));
  textEl.setAttribute('y', String(svgH - 8));
  textEl.classList.add('graffiti-label');
  textEl.textContent = label;
  svgEl.appendChild(textEl);
  
  parent.appendChild(svgEl);
}
