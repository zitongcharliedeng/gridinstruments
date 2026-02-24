import rough from 'roughjs';
import type { KeyboardVisualizer } from './keyboard-visualizer';

// Chord shapes in fifth/octave grid coordinates (fifth steps, octave steps).
// coordX = fifth steps, coordY = octave steps.
// Root position shapes (cleanest ▲/▽ geometry):
// Major (D, F#, A): root(0,0) + M3(4,-2) + P5(1,0)  — triangle pointing "up" ▲
// Minor (D, F, A):  root(0,0) + m3(-3,2)  + P5(1,0)  — triangle pointing "down" ▽
const MAJOR_SHAPE: [number, number][] = [[0, 0], [4, -2], [1, 0]];
const MINOR_SHAPE: [number, number][] = [[0, 0], [-3, 2], [1, 0]];

// Minor chord hint text (from FEATURES.md spec)
const MINOR_HINT = "it's a reflection of a major chord, neat huh?";

interface GraffitiConfig {
  /** Keyboard container element (parent of the canvas) */
  container: HTMLElement;
  /** KeyboardVisualizer instance for reading grid geometry */
  visualizer: KeyboardVisualizer;
}

type ButtonLike = { x: number; y: number; coordX: number; coordY: number };

/**
 * Create dynamic chord graffiti overlays on the keyboard canvas.
 * Positions in top-left (major) and bottom-right (minor) corners.
 * Returns an update function to call when skew/tuning/zoom changes.
 */
export function createChordGraffiti(config: GraffitiConfig): () => void {
  const { container, visualizer } = config;

  const cs = getComputedStyle(container);
  if (cs.position === 'static') {
    container.style.position = 'relative';
  }

  const svg = createSvgElement();
  container.appendChild(svg);

  function update(): void {
    const geo = visualizer.getGridGeometry();
    const buttons = visualizer.getButtons();
    const { width, height } = geo;

    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const majorRoot = findCornerRoot(buttons, MAJOR_SHAPE, width, height, 'top-left');
    const minorRoot = findCornerRoot(buttons, MINOR_SHAPE, width, height, 'bottom-right');

    if (majorRoot) {
      renderChord(svg, MAJOR_SHAPE, majorRoot, buttons, 'psst... this is a major chord', 42);
    }
    if (minorRoot) {
      renderChord(svg, MINOR_SHAPE, minorRoot, buttons, '...and this is minor', 77, MINOR_HINT);
    }
  }

  update();
  return update;
}

function createSvgElement(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('graffiti-overlay');
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.pointerEvents = 'none';
  svg.style.overflow = 'visible';
  return svg;
}

type Corner = 'top-left' | 'bottom-right';

function findCornerRoot(
  buttons: ButtonLike[],
  shape: [number, number][],
  width: number,
  height: number,
  corner: Corner,
): ButtonLike | null {
  const targetX = corner === 'top-left' ? 0 : width;
  const targetY = corner === 'top-left' ? 0 : height;

  const byCoord = new Map<string, ButtonLike>();
  for (const b of buttons) {
    byCoord.set(`${b.coordX}_${b.coordY}`, b);
  }

  let bestRoot: ButtonLike | null = null;
  let bestDist = Infinity;

  for (const root of buttons) {
    const noteButtons: ButtonLike[] = [];
    let allFound = true;
    for (const [dx, dy] of shape) {
      const key = `${root.coordX + dx}_${root.coordY + dy}`;
      const nb = byCoord.get(key);
      if (!nb) { allFound = false; break; }
      noteButtons.push(nb);
    }
    if (!allFound) continue;

    const cx = noteButtons.reduce((s, b) => s + b.x, 0) / noteButtons.length;
    const cy = noteButtons.reduce((s, b) => s + b.y, 0) / noteButtons.length;

    const margin = 20;
    const allOnScreen = noteButtons.every(
      b => b.x >= margin && b.x <= width - margin && b.y >= margin && b.y <= height - margin,
    );
    if (!allOnScreen) continue;

    const dist = (cx - targetX) ** 2 + (cy - targetY) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestRoot = root;
    }
  }

  return bestRoot;
}

function renderChord(
  svg: SVGSVGElement,
  shape: [number, number][],
  root: ButtonLike,
  buttons: ButtonLike[],
  label: string,
  seed: number,
  hint?: string,
): void {
  const byCoord = new Map<string, ButtonLike>();
  for (const b of buttons) {
    byCoord.set(`${b.coordX}_${b.coordY}`, b);
  }

  const notePositions: { x: number; y: number }[] = [];
  for (const [dx, dy] of shape) {
    const key = `${root.coordX + dx}_${root.coordY + dy}`;
    const nb = byCoord.get(key);
    if (!nb) return;
    notePositions.push({ x: nb.x, y: nb.y });
  }

  const rc = rough.svg(svg);

  const triPoints = notePositions.map(p => [p.x, p.y] as [number, number]);

  const triNode = rc.polygon(triPoints, {
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
  svg.appendChild(triNode);

  const cx = notePositions.reduce((s, p) => s + p.x, 0) / notePositions.length;
  const cy = notePositions.reduce((s, p) => s + p.y, 0) / notePositions.length;

  const labelY = cy + (hint ? 14 : 8);

  const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textEl.setAttribute('x', String(Math.round(cx)));
  textEl.setAttribute('y', String(Math.round(labelY)));
  textEl.setAttribute('text-anchor', 'middle');
  textEl.classList.add('graffiti-label');
  textEl.textContent = label;
  svg.appendChild(textEl);

  if (hint) {
    const hintEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    hintEl.setAttribute('x', String(Math.round(cx)));
    hintEl.setAttribute('y', String(Math.round(labelY + 14)));
    hintEl.setAttribute('text-anchor', 'middle');
    hintEl.classList.add('graffiti-label');
    hintEl.style.fontSize = '10px';
    hintEl.style.opacity = '0.7';
    hintEl.textContent = hint;
    svg.appendChild(hintEl);
  }
}
