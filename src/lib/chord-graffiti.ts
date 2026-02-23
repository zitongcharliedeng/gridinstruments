import rough from 'roughjs';
import type { KeyboardVisualizer } from './keyboard-visualizer';

// Chord shapes in grid coordinates (coordX, coordY)
// These are the MidiMech "mech-theory" shapes on the isomorphic grid.
// coordX = circle-of-fifths steps, coordY = octave steps.
// Major: root(0,0) + maj3(2,-1) + p5(1,0)  — triangle pointing "up" in grid space
// Minor: root(1,0) + min3(0,1)  + p5(2,1)  — triangle pointing "down" (reflection)
const MAJOR_SHAPE: [number, number][] = [[0, 0], [2, -1], [1, 0]];
const MINOR_SHAPE: [number, number][] = [[1, 0], [0, 1], [2, 1]];

// Minor chord hint text (from FEATURES.md spec)
const MINOR_HINT = "it's a reflection of a major chord, neat huh?";

interface GraffitiConfig {
  /** Keyboard container element (parent of the canvas) */
  container: HTMLElement;
  /** KeyboardVisualizer instance for reading grid geometry */
  visualizer: KeyboardVisualizer;
}

/**
 * Create dynamic chord graffiti overlays on the keyboard canvas.
 * Positions in top-left (major) and bottom-right (minor) corners.
 * Returns an update function to call when skew/tuning/zoom changes.
 */
export function createChordGraffiti(config: GraffitiConfig): () => void {
  const { container, visualizer } = config;

  // Ensure container is positioned for absolute children
  const cs = getComputedStyle(container);
  if (cs.position === 'static') {
    container.style.position = 'relative';
  }

  // Create the two overlay SVGs
  const majorSvg = createSvgElement();
  const minorSvg = createSvgElement();
  container.appendChild(majorSvg);
  container.appendChild(minorSvg);

  function update(): void {
    const geo = visualizer.getGridGeometry();
    renderOverlay(majorSvg, MAJOR_SHAPE, 'psst... this is a major chord', geo, 'top-left', 42);
    renderOverlay(minorSvg, MINOR_SHAPE, '...and this is minor', geo, 'bottom-right', 77, MINOR_HINT);
  }

  update();
  return update;
}

function createSvgElement(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('graffiti-overlay');
  svg.style.overflow = 'visible';
  return svg;
}

type Corner = 'top-left' | 'bottom-right';

interface GridGeometry {
  cellHv1: { x: number; y: number };
  cellHv2: { x: number; y: number };
  width: number;
  height: number;
}

function renderOverlay(
  svg: SVGSVGElement,
  shape: [number, number][],
  label: string,
  geo: GridGeometry,
  corner: Corner,
  seed: number,
  hint?: string,
): void {
  // Clear previous content
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const { cellHv1, cellHv2 } = geo;

  // Full cell vectors (2× half-vectors)
  const cv1 = { x: cellHv1.x * 2, y: cellHv1.y * 2 };
  const cv2 = { x: cellHv2.x * 2, y: cellHv2.y * 2 };

  // Compute bounding box of the chord shape in pixel space
  const cellCenters = shape.map(([cx, cy]) => ({
    x: cx * cv1.x + cy * cv2.x,
    y: cx * cv1.y + cy * cv2.y,
  }));

  // Include the parallelogram extents of each cell for bounding box
  const allCorners: { x: number; y: number }[] = [];
  for (const c of cellCenters) {
    allCorners.push(
      { x: c.x - cellHv1.x - cellHv2.x, y: c.y - cellHv1.y - cellHv2.y },
      { x: c.x + cellHv1.x - cellHv2.x, y: c.y + cellHv1.y - cellHv2.y },
      { x: c.x + cellHv1.x + cellHv2.x, y: c.y + cellHv1.y + cellHv2.y },
      { x: c.x - cellHv1.x + cellHv2.x, y: c.y - cellHv1.y + cellHv2.y },
    );
  }

  const minX = Math.min(...allCorners.map(p => p.x));
  const maxX = Math.max(...allCorners.map(p => p.x));
  const minY = Math.min(...allCorners.map(p => p.y));
  const maxY = Math.max(...allCorners.map(p => p.y));

  const padding = 20;
  const labelHeight = hint ? 38 : 22;
  const svgW = (maxX - minX) + padding * 2;
  const svgH = (maxY - minY) + padding * 2 + labelHeight;

  svg.setAttribute('width', String(Math.ceil(svgW)));
  svg.setAttribute('height', String(Math.ceil(svgH)));
  svg.setAttribute('viewBox', `0 0 ${Math.ceil(svgW)} ${Math.ceil(svgH)}`);

  // Offset so shape is centered in the SVG with padding
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  // Position the SVG in the chosen corner of the keyboard container
  const margin = 16;
  if (corner === 'top-left') {
    svg.style.left = `${margin}px`;
    svg.style.top = `${margin}px`;
    svg.style.right = '';
    svg.style.bottom = '';
  } else {
    svg.style.left = '';
    svg.style.top = '';
    svg.style.right = `${margin}px`;
    svg.style.bottom = `${margin + 24}px`; // extra clearance above bottom axis labels
  }

  const rc = rough.svg(svg);

  // Draw triangle connecting the three chord tone centers
  const triPoints = cellCenters.map(c => [
    c.x + offsetX,
    c.y + offsetY,
  ] as [number, number]);

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

  // Draw parallelogram outlines for each chord tone
  shape.forEach((_coord, i) => {
    const center = cellCenters[i];
    const inset = 0.85; // slightly inset from full cell
    const hv1i = { x: cellHv1.x * inset, y: cellHv1.y * inset };
    const hv2i = { x: cellHv2.x * inset, y: cellHv2.y * inset };

    const corners: [number, number][] = [
      [center.x - hv1i.x - hv2i.x + offsetX, center.y - hv1i.y - hv2i.y + offsetY],
      [center.x + hv1i.x - hv2i.x + offsetX, center.y + hv1i.y - hv2i.y + offsetY],
      [center.x + hv1i.x + hv2i.x + offsetX, center.y + hv1i.y + hv2i.y + offsetY],
      [center.x - hv1i.x + hv2i.x + offsetX, center.y - hv1i.y + hv2i.y + offsetY],
    ];

    const cellNode = rc.polygon(corners, {
      roughness: 1.8,
      stroke: '#FFD700',
      strokeWidth: 1.5,
      fill: i === 0 ? 'rgba(255, 200, 0, 0.15)' : 'rgba(255, 200, 0, 0.08)',
      fillStyle: 'solid',
      seed: seed + i + 1,
    });
    svg.appendChild(cellNode);
  });

  // Label text
  const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textEl.setAttribute('x', String(padding));
  textEl.setAttribute('y', String(Math.ceil(svgH) - (hint ? 24 : 6)));
  textEl.classList.add('graffiti-label');
  textEl.textContent = label;
  svg.appendChild(textEl);

  // Optional hint text (smaller, below main label)
  if (hint) {
    const hintEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    hintEl.setAttribute('x', String(padding));
    hintEl.setAttribute('y', String(Math.ceil(svgH) - 6));
    hintEl.classList.add('graffiti-label');
    hintEl.style.fontSize = '8px';
    hintEl.style.opacity = '0.5';
    hintEl.textContent = hint;
    svg.appendChild(hintEl);
  }
}
