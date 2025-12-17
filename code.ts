import { colornames } from 'color-name-list/bestof';

interface ColorEntry {
  name: string;
  hex: string;
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Convert Figma RGB (0-1) to hex
function figmaRgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Calculate color distance (simple Euclidean in RGB space)
function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  return Math.sqrt(
    Math.pow(r2 - r1, 2) +
    Math.pow(g2 - g1, 2) +
    Math.pow(b2 - b1, 2)
  );
}

// Find the closest named color
function findClosestColor(hex: string): ColorEntry {
  const target = hexToRgb(hex);
  let closest: ColorEntry = colornames[0];
  let minDistance = Infinity;

  for (const color of colornames as ColorEntry[]) {
    const rgb = hexToRgb(color.hex);
    const distance = colorDistance(
      target.r, target.g, target.b,
      rgb.r, rgb.g, rgb.b
    );

    if (distance < minDistance) {
      minDistance = distance;
      closest = color;
    }

    // Exact match
    if (distance === 0) break;
  }

  return closest;
}

// Main plugin logic
function main() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify('Please select an object with a fill color');
    figma.closePlugin();
    return;
  }

  const node = selection[0];

  // Check if node has fills
  if (!('fills' in node)) {
    figma.notify('Selected object does not have fills');
    figma.closePlugin();
    return;
  }

  const fills = node.fills as readonly Paint[];

  if (!Array.isArray(fills) || fills.length === 0) {
    figma.notify('Selected object has no fills');
    figma.closePlugin();
    return;
  }

  // Find the first solid fill
  const solidFill = fills.find((fill): fill is SolidPaint =>
    fill.type === 'SOLID' && fill.visible !== false
  );

  if (!solidFill) {
    figma.notify('No solid fill found on selected object');
    figma.closePlugin();
    return;
  }

  const { r, g, b } = solidFill.color;
  const hex = figmaRgbToHex(r, g, b);
  const closestColor = findClosestColor(hex);

  // Show UI (hidden) to copy to clipboard
  figma.showUI(__html__, { visible: false });

  figma.ui.postMessage({
    type: 'copy-to-clipboard',
    text: closestColor.name,
  });

  figma.ui.onmessage = (msg) => {
    if (msg.type === 'copied') {
      figma.notify(`Copied "${closestColor.name}" to clipboard (${hex} -> ${closestColor.hex})`);
    } else if (msg.type === 'error') {
      figma.notify(`Failed to copy: ${msg.message}`);
    }
    figma.closePlugin();
  };
}

main();
