const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:/Users/Aditya/work/HRMS/diagrams/mindmap-data.json', 'utf8'));
const jsonStr = JSON.stringify(data);

const CLUSTERS = [
  { id: 1, name: 'Foundation', color: '#546e7a', icon: '\u{1F3D7}\uFE0F', modules: ['Core HR & People Data', 'Platform & Experience Layer', 'Cold Start & Setup', 'Demo Company Feature'] },
  { id: 2, name: 'Day-to-Day Ops', color: '#1565c0', icon: '\u{1F4C5}', modules: ['Time & Attendance', 'Leave Management', 'Daily Work Logging', 'Expense Management'] },
  { id: 3, name: 'Talent Journey', color: '#e65100', icon: '\u{1F680}', modules: ['Talent Acquisition', 'Onboarding & Offboarding', 'Performance & Growth', 'Learning & Development'] },
  { id: 4, name: 'Rewards & Culture', color: '#2e7d32', icon: '\u{1F48E}', modules: ['Compensation & Rewards', 'Payroll Processing', 'Engagement & Culture'] },
  { id: 5, name: 'Intelligence', color: '#6a1b9a', icon: '\u{1F4CA}', modules: ['People Analytics & BI', 'Compliance & Audit', 'Workforce Planning', 'Integrations & API Platform'] },
];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI-Native HRMS — Interactive Mind Map</title>
<style>
  /* ====== RESET & BASE ====== */
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%; height: 100%; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #f5f5f0;
    color: #2c2c2c;
  }

  /* ====== HEADER ====== */
  #header {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: 44px; background: #ffffff;
    border-bottom: 1px solid #e0ddd5;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  #header .left { display: flex; align-items: center; gap: 12px; }
  #header .left h1 { font-size: 15px; font-weight: 700; color: #2c2c2c; }
  #header .left .badge {
    font-size: 11px; background: #f0ede5; color: #6b6b6b;
    padding: 2px 8px; border-radius: 10px; font-weight: 500;
  }
  #header .right { display: flex; align-items: center; gap: 8px; }
  #header .right input {
    width: 200px; height: 28px; border-radius: 6px;
    border: 1px solid #d0cdc5; background: #ffffff;
    padding: 0 10px; font-size: 12px; color: #2c2c2c;
    outline: none; transition: border-color 0.2s;
  }
  #header .right input::placeholder { color: #999; }
  #header .right input:focus { border-color: #888; }
  .hdr-btn {
    height: 28px; padding: 0 10px; border-radius: 6px;
    border: 1px solid #d0cdc5; background: #ffffff;
    color: #555; font-size: 12px; cursor: pointer;
    transition: all 0.15s; display: flex; align-items: center; gap: 4px;
    white-space: nowrap;
  }
  .hdr-btn:hover { background: #f0ede5; }
  .hdr-btn.active { background: #f9a825; color: #fff; border-color: #f9a825; }
  #searchCount {
    font-size: 11px; color: #6b6b6b; min-width: 50px; text-align: right;
  }

  /* ====== CANVAS ====== */
  #canvas-wrap {
    position: fixed; top: 44px; left: 0; right: 0; bottom: 0;
    background: radial-gradient(ellipse at center, #fafaf7 0%, #f0f0eb 100%);
    overflow: hidden; cursor: grab;
  }
  #canvas-wrap.grabbing { cursor: grabbing; }

  svg { width: 100%; height: 100%; }
  svg text { user-select: none; -webkit-user-select: none; }

  /* ====== TOOLTIP ====== */
  #tooltip {
    position: fixed; z-index: 200; pointer-events: none;
    background: #2c2c2c; color: #ffffff; padding: 8px 12px;
    border-radius: 8px; font-size: 12px; max-width: 380px;
    line-height: 1.5; box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    opacity: 0; transition: opacity 0.15s;
    white-space: pre-wrap;
  }
  #tooltip.visible { opacity: 1; }
  #tooltip .tt-title { font-weight: 700; margin-bottom: 4px; font-size: 13px; }
  #tooltip ul { padding-left: 16px; margin: 4px 0 0 0; }
  #tooltip li { margin: 2px 0; }

  /* ====== MODAL ====== */
  #modal-overlay {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);
    display: none; justify-content: center; align-items: center;
  }
  #modal-overlay.visible { display: flex; }
  #modal-card {
    background: #ffffff; border-radius: 12px; padding: 24px;
    max-width: 560px; width: 90%; max-height: 80vh;
    overflow-y: auto; box-shadow: 0 8px 40px rgba(0,0,0,0.15);
    position: relative;
  }
  #modal-card::-webkit-scrollbar { width: 6px; }
  #modal-card::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
  #modal-close {
    position: absolute; top: 12px; right: 12px;
    width: 28px; height: 28px; border-radius: 50%;
    border: 1px solid #e0ddd5; background: #fff; color: #555;
    font-size: 16px; cursor: pointer; display: flex;
    align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  #modal-close:hover { background: #f0ede5; }
  #modal-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #2c2c2c; }
  .modal-type-badge {
    display: inline-block; padding: 2px 10px; border-radius: 12px;
    font-size: 11px; font-weight: 600; margin-bottom: 12px;
  }
  .modal-type-badge.Standard { background: #f0f0f0; color: #555; }
  .modal-type-badge.AI { background: #fffde7; color: #f57f17; border: 1px solid #f9a825; }
  .modal-type-badge.Additional { background: #e8f5e9; color: #2e7d32; border: 1px solid #66bb6a; }
  #modal-bullets { list-style: disc; padding-left: 20px; }
  #modal-bullets li { margin: 6px 0; line-height: 1.6; color: #333; font-size: 14px; }

  /* ====== STATS PANEL ====== */
  #stats-panel {
    position: fixed; bottom: 12px; left: 12px; z-index: 100;
    background: #ffffff; border: 1px solid #e0ddd5;
    border-radius: 10px; padding: 10px 14px;
    font-size: 11px; color: #555;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    line-height: 1.7; min-width: 170px;
  }
  #stats-panel .st-row { display: flex; justify-content: space-between; }
  #stats-panel .st-val { font-weight: 700; color: #2c2c2c; }

  /* ====== MINIMAP ====== */
  #minimap {
    position: fixed; bottom: 12px; right: 12px; z-index: 100;
    width: 160px; height: 120px; background: #ffffff;
    border: 1px solid #e0ddd5; border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden;
  }
  #minimap canvas { width: 100%; height: 100%; }

  /* ====== ZOOM DISPLAY ====== */
  #zoom-display {
    position: fixed; bottom: 140px; right: 12px; z-index: 100;
    background: #ffffff; border: 1px solid #e0ddd5;
    border-radius: 6px; padding: 3px 10px;
    font-size: 11px; color: #555; font-weight: 600;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  /* ====== CONTEXT MENU ====== */
  #ctx-menu {
    position: fixed; z-index: 250; display: none;
    background: #ffffff; border: 1px solid #e0ddd5;
    border-radius: 8px; padding: 4px 0;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    min-width: 200px;
  }
  #ctx-menu .ctx-item {
    padding: 6px 14px; font-size: 12px; color: #333;
    cursor: pointer; transition: background 0.1s;
  }
  #ctx-menu .ctx-item:hover { background: #f0ede5; }

  /* ====== ANIMATIONS ====== */
  @keyframes pulse-shadow {
    0%, 100% { filter: drop-shadow(0 0 6px rgba(52,152,219,0.3)); }
    50% { filter: drop-shadow(0 0 14px rgba(52,152,219,0.5)); }
  }
  @keyframes ai-glow {
    0%, 100% { filter: drop-shadow(0 0 3px rgba(249,168,37,0.2)); }
    50% { filter: drop-shadow(0 0 10px rgba(249,168,37,0.6)); }
  }
  .ai-glow-on { animation: ai-glow 2.5s ease-in-out infinite; }

  @keyframes node-enter {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes line-draw {
    from { stroke-dashoffset: 600; }
    to { stroke-dashoffset: 0; }
  }
</style>
</head>
<body>

<!-- HEADER -->
<div id="header">
  <div class="left">
    <h1>AI-Native HRMS Mind Map</h1>
    <span class="badge">465 features &middot; 1958 bullets</span>
  </div>
  <div class="right">
    <span id="searchCount"></span>
    <input type="text" id="searchInput" placeholder="Search features & bullets..." />
    <button class="hdr-btn" id="btnExpandL1">Expand L1</button>
    <button class="hdr-btn" id="btnCollapseAll">Collapse All</button>
    <button class="hdr-btn" id="btnZoomFit">Fit</button>
    <button class="hdr-btn" id="btnAIHighlight">Highlight AI</button>
  </div>
</div>

<!-- CANVAS -->
<div id="canvas-wrap">
  <svg id="svg">
    <defs>
      <filter id="shadow-sm">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.08"/>
      </filter>
      <filter id="shadow-md">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.1"/>
      </filter>
    </defs>
    <g id="world"></g>
  </svg>
</div>

<!-- TOOLTIP -->
<div id="tooltip"></div>

<!-- MODAL -->
<div id="modal-overlay">
  <div id="modal-card">
    <button id="modal-close">&times;</button>
    <div id="modal-title"></div>
    <div id="modal-type"></div>
    <ul id="modal-bullets"></ul>
  </div>
</div>

<!-- STATS -->
<div id="stats-panel">
  <div class="st-row"><span>Visible</span><span class="st-val" id="stVis">0 / 465</span></div>
  <div class="st-row"><span>Standard</span><span class="st-val" id="stStd">0</span></div>
  <div class="st-row"><span>AI</span><span class="st-val" id="stAI">0</span></div>
  <div class="st-row"><span>Additional</span><span class="st-val" id="stAdd">0</span></div>
  <div class="st-row"><span>Depth</span><span class="st-val" id="stDepth">0</span></div>
  <div class="st-row"><span>Expanded</span><span class="st-val" id="stExp">0</span></div>
</div>

<!-- MINIMAP -->
<div id="minimap"><canvas id="minimapCanvas"></canvas></div>

<!-- ZOOM -->
<div id="zoom-display">100%</div>

<!-- CONTEXT MENU -->
<div id="ctx-menu">
  <div class="ctx-item" id="ctxExpandAll">Expand All Children Recursively</div>
</div>

<script>
// ====================================================================
//  DATA
// ====================================================================
const RAW = ${jsonStr};

const CLUSTERS = ${JSON.stringify(CLUSTERS)};

// ====================================================================
//  BUILD TREE
// ====================================================================
const RADII = [0, 250, 480, 700, 940];

// Node widths per level
function getNodeWidth(level) {
  switch(level) {
    case 0: return 180;
    case 1: return 170;
    case 2: return 160;
    case 3: return 130;
    case 4: return 160;
    default: return 140;
  }
}
function getNodeHeight(level) {
  switch(level) {
    case 0: return 60;
    case 1: return 44;
    case 2: return 36;
    case 3: return 30;
    case 4: return 28;
    default: return 26;
  }
}

let nodeIdCounter = 0;
function makeNode(name, level, parentColor, extraData) {
  return {
    id: nodeIdCounter++,
    name: name,
    level: level,
    children: [],
    expanded: false,
    x: 0, y: 0,
    angle: 0,
    color: parentColor || '#546e7a',
    data: extraData || {},
    visible: level === 0,
    searchMatch: false,
  };
}

// Build tree
const root = makeNode('AI-Native HRMS', 0, '#3498db', {});
root.visible = true;

// Role colors
const ROLE_COLORS = {
  Employee: { bg: '#e8f4fd', border: '#90caf9', text: '#1565c0' },
  Manager:  { bg: '#fff4e6', border: '#ffcc80', text: '#e65100' },
  Admin:    { bg: '#f5e6f5', border: '#ce93d8', text: '#6a1b9a' },
};

CLUSTERS.forEach(cluster => {
  const clusterNode = makeNode(cluster.icon + ' ' + cluster.name, 1, cluster.color, { clusterId: cluster.id });

  cluster.modules.forEach(modName => {
    const modData = RAW.modules[modName];
    if (!modData) return;
    const modNode = makeNode(modName, 2, cluster.color, { moduleName: modName });

    ['Employee', 'Manager', 'Admin'].forEach(role => {
      const features = modData[role];
      if (!features || features.length === 0) return;
      const roleNode = makeNode(role, 3, cluster.color, { role: role });

      features.forEach(feat => {
        const prefix = feat.t === 'AI' ? '\\u2726 ' : '';
        const featNode = makeNode(prefix + feat.n, 4, cluster.color, {
          type: feat.t,
          bullets: feat.b,
          role: role,
        });
        roleNode.children.push(featNode);
      });

      modNode.children.push(roleNode);
    });

    clusterNode.children.push(modNode);
  });

  root.children.push(clusterNode);
});

// ====================================================================
//  LAYOUT (NO OVERLAP)
// ====================================================================
const MIN_GAP = 14;

function calcRequiredArc(node) {
  if (!node.expanded || node.children.length === 0) {
    if (node.level === 0) return 0;
    const w = getNodeWidth(node.level);
    const r = RADII[node.level] || (940 + (node.level - 4) * 200);
    return (w + MIN_GAP) / r;
  }
  let total = 0;
  for (const child of node.children) {
    total += calcRequiredArc(child);
  }
  // Also ensure this node itself has minimum space
  if (node.level > 0) {
    const selfArc = (getNodeWidth(node.level) + MIN_GAP) / (RADII[node.level] || 940);
    total = Math.max(total, selfArc);
  }
  return total;
}

function layoutTree() {
  // Root at center
  root.x = 0;
  root.y = 0;
  root.angle = 0;

  if (!root.expanded || root.children.length === 0) return;

  // Calculate required arcs for all L1 children
  const childArcs = root.children.map(c => calcRequiredArc(c));
  const totalNeeded = childArcs.reduce((a, b) => a + b, 0);

  // Use full circle (2*PI), but if totalNeeded exceeds it, expand
  const fullCircle = Math.PI * 2;
  const actualArc = Math.max(fullCircle, totalNeeded);

  // Distribute proportionally
  let offset = -Math.PI / 2; // Start at top
  root.children.forEach((child, i) => {
    const childArc = totalNeeded > 0 ? childArcs[i] * (actualArc / totalNeeded) : (actualArc / root.children.length);
    layoutNode(child, offset, childArc);
    offset += childArc;
  });
}

function layoutNode(node, startAngle, arcSpan) {
  const r = RADII[node.level] || (940 + (node.level - 4) * 200);
  const midAngle = startAngle + arcSpan / 2;
  node.x = Math.cos(midAngle) * r;
  node.y = Math.sin(midAngle) * r;
  node.angle = midAngle;

  if (!node.expanded || node.children.length === 0) return;

  const childArcs = node.children.map(c => calcRequiredArc(c));
  const totalNeeded = childArcs.reduce((a, b) => a + b, 0);

  // Give children at least as much as they need, centered on parent
  const usedArc = Math.max(arcSpan, totalNeeded);

  let childOffset = midAngle - usedArc / 2;
  const scale = totalNeeded > 0 ? usedArc / totalNeeded : 1;

  node.children.forEach((child, i) => {
    const thisArc = childArcs[i] * scale;
    layoutNode(child, childOffset, thisArc);
    childOffset += thisArc;
  });
}

// ====================================================================
//  RENDERING
// ====================================================================
const svg = document.getElementById('svg');
const world = document.getElementById('world');
const tooltip = document.getElementById('tooltip');

let panX = 0, panY = 0, zoom = 1;
let vpW = window.innerWidth, vpH = window.innerHeight - 44;

function updateTransform() {
  world.setAttribute('transform',
    \`translate(\${vpW/2 + panX}, \${vpH/2 + 22 + panY}) scale(\${zoom})\`);
  document.getElementById('zoom-display').textContent = Math.round(zoom * 100) + '%';
  updateMinimap();
}

function clearWorld() {
  while (world.firstChild) world.removeChild(world.firstChild);
}

// Collect all visible nodes
function collectVisible(node, arr) {
  if (!arr) arr = [];
  arr.push(node);
  if (node.expanded) {
    node.children.forEach(c => {
      if (c.visible) collectVisible(c, arr);
    });
  }
  return arr;
}

// Set visibility recursively
function setVisibility(node, vis) {
  node.visible = vis;
  if (!vis) {
    node.expanded = false;
    node.children.forEach(c => setVisibility(c, false));
  }
}

let renderedNodes = new Map(); // id -> {g, node}
let renderedLines = [];

function render() {
  clearWorld();
  renderedNodes.clear();
  renderedLines = [];
  layoutTree();

  const linesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const nodesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  world.appendChild(linesG);
  world.appendChild(nodesG);

  const visible = collectVisible(root);

  // Draw lines first
  visible.forEach(node => {
    if (node.expanded) {
      node.children.forEach(child => {
        if (child.visible) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          // Curved line
          const dx = child.x - node.x;
          const dy = child.y - node.y;
          const cx1 = node.x + dx * 0.4;
          const cy1 = node.y + dy * 0.1;
          const cx2 = node.x + dx * 0.6;
          const cy2 = node.y + dy * 0.9;
          line.setAttribute('d', \`M\${node.x},\${node.y} C\${cx1},\${cy1} \${cx2},\${cy2} \${child.x},\${child.y}\`);

          const lineColor = lightenColor(child.color, 0.5);
          line.setAttribute('stroke', lineColor);
          line.setAttribute('stroke-width', node.level === 0 ? '2.5' : node.level === 1 ? '2' : '1.5');
          line.setAttribute('fill', 'none');
          line.setAttribute('opacity', '0.6');

          // Animate
          const len = Math.sqrt(dx*dx + dy*dy) + 100;
          line.setAttribute('stroke-dasharray', len);
          line.setAttribute('stroke-dashoffset', len);
          line.style.animation = \`line-draw 0.4s ease-out forwards\`;

          linesG.appendChild(line);
          renderedLines.push(line);
        }
      });
    }
  });

  // Draw nodes
  visible.forEach((node, idx) => {
    const g = renderNode(node, idx);
    nodesG.appendChild(g);
    renderedNodes.set(node.id, { g, node });
  });

  updateStats();
}

function renderNode(node, staggerIdx) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', \`translate(\${node.x}, \${node.y})\`);
  g.style.transformOrigin = \`\${node.x}px \${node.y}px\`;

  if (node.level > 0) {
    const delay = Math.min(staggerIdx * 30, 300);
    g.style.animation = \`node-enter 0.3s ease-out \${delay}ms both\`;
  }

  const w = getNodeWidth(node.level);
  const h = getNodeHeight(node.level);

  // Background rect
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', -w/2);
  rect.setAttribute('y', -h/2);
  rect.setAttribute('width', w);
  rect.setAttribute('height', h);
  rect.setAttribute('rx', node.level === 3 ? h/2 : 8);

  // Style per level
  if (node.level === 0) {
    rect.setAttribute('fill', 'url(#grad-center)');
    // Create gradient
    let defs = svg.querySelector('defs');
    if (!document.getElementById('grad-center')) {
      const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      grad.setAttribute('id', 'grad-center');
      grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
      grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%');
      const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#2c3e50');
      const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#3498db');
      grad.appendChild(s1); grad.appendChild(s2);
      defs.appendChild(grad);
    }
    rect.setAttribute('filter', 'url(#shadow-md)');
    g.style.animation = 'pulse-shadow 3s ease-in-out infinite';
  } else if (node.level === 1) {
    rect.setAttribute('fill', desaturate(node.color, 0.15));
    rect.setAttribute('filter', 'url(#shadow-sm)');
  } else if (node.level === 2) {
    rect.setAttribute('fill', '#ffffff');
    rect.setAttribute('stroke', node.color);
    rect.setAttribute('stroke-width', '0');
    rect.setAttribute('filter', 'url(#shadow-sm)');
    // Left border as separate rect
    const lb = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    lb.setAttribute('x', -w/2);
    lb.setAttribute('y', -h/2);
    lb.setAttribute('width', 4);
    lb.setAttribute('height', h);
    lb.setAttribute('rx', 2);
    lb.setAttribute('fill', node.color);
    g.appendChild(lb);
  } else if (node.level === 3) {
    const rc = ROLE_COLORS[node.name] || { bg: '#f0f0f0', border: '#ccc', text: '#333' };
    rect.setAttribute('fill', rc.bg);
    rect.setAttribute('stroke', rc.border);
    rect.setAttribute('stroke-width', '1');
  } else if (node.level === 4) {
    const ft = node.data.type;
    if (ft === 'AI') {
      rect.setAttribute('fill', '#fffde7');
      rect.setAttribute('stroke', '#f9a825');
      rect.setAttribute('stroke-width', '1.5');
      rect.setAttribute('stroke-dasharray', '5,3');
    } else if (ft === 'Additional') {
      rect.setAttribute('fill', '#e8f5e9');
      rect.setAttribute('stroke', '#66bb6a');
      rect.setAttribute('stroke-width', '1');
      rect.setAttribute('stroke-dasharray', '3,3');
    } else {
      rect.setAttribute('fill', '#ffffff');
      rect.setAttribute('stroke', '#bdbdbd');
      rect.setAttribute('stroke-width', '1');
    }
  }

  // Search highlight
  if (node.searchMatch) {
    rect.setAttribute('stroke', '#f9a825');
    rect.setAttribute('stroke-width', '2.5');
  }

  g.appendChild(rect);

  // Text
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('y', 0);

  let fontSize, fontWeight, fillColor;
  if (node.level === 0) {
    fontSize = 15; fontWeight = '800'; fillColor = '#ffffff';
  } else if (node.level === 1) {
    fontSize = 13; fontWeight = '700'; fillColor = '#ffffff';
  } else if (node.level === 2) {
    fontSize = 11; fontWeight = '600'; fillColor = '#2c2c2c';
  } else if (node.level === 3) {
    const rc = ROLE_COLORS[node.name] || { text: '#333' };
    fontSize = 10; fontWeight = '600'; fillColor = rc.text;
  } else {
    fontSize = 9.5; fontWeight = '500'; fillColor = '#2c2c2c';
  }
  text.setAttribute('font-size', fontSize);
  text.setAttribute('font-weight', fontWeight);
  text.setAttribute('fill', fillColor);

  // Truncate text
  let displayName = node.name;
  const maxChars = Math.floor(w / (fontSize * 0.55));
  if (displayName.length > maxChars) {
    displayName = displayName.substring(0, maxChars - 1) + '\\u2026';
  }
  text.textContent = displayName;
  g.appendChild(text);

  // Subtitle for L0
  if (node.level === 0 && !node.expanded) {
    const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    sub.setAttribute('text-anchor', 'middle');
    sub.setAttribute('y', 16);
    sub.setAttribute('font-size', '10');
    sub.setAttribute('fill', 'rgba(255,255,255,0.7)');
    sub.textContent = 'Click to explore';
    g.appendChild(sub);
  }

  // +/- indicator for expandable nodes
  if (node.children.length > 0 && node.level < 4) {
    const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    indicator.setAttribute('x', w/2 - 8);
    indicator.setAttribute('y', 0);
    indicator.setAttribute('text-anchor', 'middle');
    indicator.setAttribute('dominant-baseline', 'central');
    indicator.setAttribute('font-size', '12');
    indicator.setAttribute('font-weight', '700');
    indicator.setAttribute('fill', node.level <= 1 ? 'rgba(255,255,255,0.7)' : '#999');
    indicator.textContent = node.expanded ? '\\u2212' : '+';
    g.appendChild(indicator);
  }

  // Events
  g.style.cursor = 'pointer';
  g.addEventListener('mouseenter', (e) => onNodeHover(e, node, true));
  g.addEventListener('mouseleave', (e) => onNodeHover(e, node, false));
  g.addEventListener('click', (e) => onNodeClick(e, node));
  g.addEventListener('dblclick', (e) => onNodeDblClick(e, node));
  g.addEventListener('contextmenu', (e) => onNodeContext(e, node));

  // Hover scale
  g.addEventListener('mouseenter', () => {
    g.style.transition = 'transform 0.15s';
  });

  return g;
}

// ====================================================================
//  INTERACTIONS
// ====================================================================
function onNodeClick(e, node) {
  e.stopPropagation();
  hideContextMenu();

  if (node.level === 4) {
    showModal(node);
    return;
  }

  if (node.children.length === 0) return;

  if (node.expanded) {
    // Collapse
    node.expanded = false;
    node.children.forEach(c => setVisibility(c, false));
  } else {
    // Expand
    node.expanded = true;
    node.children.forEach(c => { c.visible = true; });
  }

  render();
}

function onNodeDblClick(e, node) {
  e.stopPropagation();
  if (node.level === 0) {
    // Expand all L1
    node.expanded = true;
    node.children.forEach(c => {
      c.visible = true;
    });
    render();
  }
}

function onNodeContext(e, node) {
  e.preventDefault();
  e.stopPropagation();
  if (node.children.length === 0) return;

  contextTarget = node;
  const menu = document.getElementById('ctx-menu');
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  menu.style.display = 'block';
}
let contextTarget = null;

document.getElementById('ctxExpandAll').addEventListener('click', () => {
  if (contextTarget) {
    expandRecursive(contextTarget);
    render();
  }
  hideContextMenu();
});

function expandRecursive(node) {
  if (node.children.length > 0 && node.level < 4) {
    node.expanded = true;
    node.children.forEach(c => {
      c.visible = true;
      expandRecursive(c);
    });
  }
}

function hideContextMenu() {
  document.getElementById('ctx-menu').style.display = 'none';
}

document.addEventListener('click', hideContextMenu);

// ====================================================================
//  TOOLTIP
// ====================================================================
function onNodeHover(e, node, entering) {
  if (!entering) {
    tooltip.classList.remove('visible');
    return;
  }

  let html = '';
  if (node.level === 0) {
    html = '<div class="tt-title">AI-Native HRMS</div>5 clusters, 19 modules, 465 features';
  } else if (node.level === 1) {
    const mods = node.children.length;
    let feats = 0;
    node.children.forEach(m => m.children.forEach(r => feats += r.children.length));
    html = '<div class="tt-title">' + escHtml(node.name) + '</div>' + mods + ' modules, ' + feats + ' features';
  } else if (node.level === 2) {
    let feats = 0;
    node.children.forEach(r => feats += r.children.length);
    html = '<div class="tt-title">' + escHtml(node.name) + '</div>' + feats + ' features across 3 roles';
  } else if (node.level === 3) {
    let std = 0, ai = 0, add = 0;
    node.children.forEach(f => {
      if (f.data.type === 'AI') ai++;
      else if (f.data.type === 'Additional') add++;
      else std++;
    });
    html = '<div class="tt-title">' + escHtml(node.name) + '</div>' + std + ' standard, ' + ai + ' AI, ' + add + ' additional';
  } else if (node.level === 4 && node.data.bullets) {
    html = '<div class="tt-title">' + escHtml(node.name) + ' (' + node.data.type + ')</div><ul>';
    node.data.bullets.forEach(b => {
      html += '<li>' + escHtml(b) + '</li>';
    });
    html += '</ul>';
  }

  tooltip.innerHTML = html;
  tooltip.classList.add('visible');

  // Position
  const tx = Math.min(e.clientX + 12, window.innerWidth - 400);
  const ty = Math.min(e.clientY + 12, window.innerHeight - 200);
  tooltip.style.left = tx + 'px';
  tooltip.style.top = ty + 'px';
}

document.addEventListener('mousemove', (e) => {
  if (tooltip.classList.contains('visible')) {
    const tx = Math.min(e.clientX + 12, window.innerWidth - 400);
    const ty = Math.min(e.clientY + 12, window.innerHeight - 200);
    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
  }
});

// ====================================================================
//  MODAL
// ====================================================================
function showModal(node) {
  if (!node.data.bullets) return;
  document.getElementById('modal-title').textContent = node.name;
  document.getElementById('modal-type').innerHTML = '<span class="modal-type-badge ' + node.data.type + '">' + node.data.type + '</span>';
  const ul = document.getElementById('modal-bullets');
  ul.innerHTML = '';
  node.data.bullets.forEach(b => {
    const li = document.createElement('li');
    li.textContent = b;
    ul.appendChild(li);
  });
  document.getElementById('modal-overlay').classList.add('visible');
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.remove('visible');
});
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) {
    document.getElementById('modal-overlay').classList.remove('visible');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('modal-overlay').classList.remove('visible');
    // Also clear search
    if (document.getElementById('searchInput').value) {
      document.getElementById('searchInput').value = '';
      clearSearch();
    }
  }
});

// ====================================================================
//  PAN & ZOOM
// ====================================================================
let isDragging = false, dragStartX, dragStartY;

const canvasWrap = document.getElementById('canvas-wrap');

canvasWrap.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  isDragging = true;
  dragStartX = e.clientX - panX;
  dragStartY = e.clientY - panY;
  canvasWrap.classList.add('grabbing');
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  panX = e.clientX - dragStartX;
  panY = e.clientY - dragStartY;
  updateTransform();
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  canvasWrap.classList.remove('grabbing');
});

canvasWrap.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.2, Math.min(3, zoom * delta));

  // Zoom towards cursor
  const rect = canvasWrap.getBoundingClientRect();
  const mx = e.clientX - rect.left - vpW / 2 - panX;
  const my = e.clientY - rect.top - vpH / 2 - panY;

  const ratio = newZoom / zoom;
  panX -= mx * (ratio - 1);
  panY -= my * (ratio - 1);

  zoom = newZoom;
  updateTransform();
}, { passive: false });

// ====================================================================
//  HEADER BUTTONS
// ====================================================================
document.getElementById('btnExpandL1').addEventListener('click', () => {
  root.expanded = true;
  root.children.forEach(c => { c.visible = true; });
  render();
});

document.getElementById('btnCollapseAll').addEventListener('click', () => {
  root.expanded = false;
  root.children.forEach(c => setVisibility(c, false));
  render();
});

document.getElementById('btnZoomFit').addEventListener('click', zoomToFit);

let aiHighlight = false;
document.getElementById('btnAIHighlight').addEventListener('click', () => {
  aiHighlight = !aiHighlight;
  document.getElementById('btnAIHighlight').classList.toggle('active', aiHighlight);
  applyAIHighlight();
});

function applyAIHighlight() {
  renderedNodes.forEach(({ g, node }) => {
    if (node.level === 4 && node.data.type === 'AI') {
      if (aiHighlight) {
        g.classList.add('ai-glow-on');
      } else {
        g.classList.remove('ai-glow-on');
      }
    }
  });
}

function zoomToFit() {
  const visible = collectVisible(root);
  if (visible.length <= 1) {
    panX = 0; panY = 0; zoom = 1;
    updateTransform();
    return;
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  visible.forEach(n => {
    const hw = getNodeWidth(n.level) / 2;
    const hh = getNodeHeight(n.level) / 2;
    if (n.x - hw < minX) minX = n.x - hw;
    if (n.x + hw > maxX) maxX = n.x + hw;
    if (n.y - hh < minY) minY = n.y - hh;
    if (n.y + hh > maxY) maxY = n.y + hh;
  });
  const bw = maxX - minX + 100;
  const bh = maxY - minY + 100;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  zoom = Math.min(vpW / bw, vpH / bh, 2);
  zoom = Math.max(0.2, zoom);
  panX = -cx * zoom;
  panY = -cy * zoom;
  updateTransform();
}

// ====================================================================
//  SEARCH
// ====================================================================
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => doSearch(e.target.value), 300);
});

function doSearch(query) {
  // Clear old
  clearSearchMarks(root);

  if (!query || query.trim().length === 0) {
    document.getElementById('searchCount').textContent = '';
    render();
    return;
  }

  const q = query.toLowerCase();
  let matchCount = 0;

  // Search all L4 nodes
  function searchNode(node) {
    let hasMatch = false;

    if (node.level === 4) {
      // Match name or bullets
      const nameMatch = node.name.toLowerCase().includes(q);
      let bulletMatch = false;
      if (node.data.bullets) {
        bulletMatch = node.data.bullets.some(b => b.toLowerCase().includes(q));
      }
      if (nameMatch || bulletMatch) {
        node.searchMatch = true;
        matchCount++;
        hasMatch = true;
      }
    }

    for (const child of node.children) {
      if (searchNode(child)) hasMatch = true;
    }

    // Auto-expand path to matches
    if (hasMatch && node.children.length > 0) {
      node.expanded = true;
      node.children.forEach(c => { c.visible = true; });
    }

    return hasMatch;
  }

  searchNode(root);
  document.getElementById('searchCount').textContent = matchCount + ' match' + (matchCount !== 1 ? 'es' : '');
  render();
  if (matchCount > 0) zoomToFit();
}

function clearSearchMarks(node) {
  node.searchMatch = false;
  node.children.forEach(c => clearSearchMarks(c));
}

function clearSearch() {
  clearSearchMarks(root);
  document.getElementById('searchCount').textContent = '';
  render();
}

// ====================================================================
//  STATS
// ====================================================================
function updateStats() {
  const visible = collectVisible(root);
  let vis = 0, std = 0, ai = 0, add = 0, maxDepth = 0, expanded = 0;

  visible.forEach(n => {
    if (n.level === 4) {
      vis++;
      if (n.data.type === 'Standard') std++;
      else if (n.data.type === 'AI') ai++;
      else if (n.data.type === 'Additional') add++;
    }
    if (n.level > maxDepth) maxDepth = n.level;
    if (n.expanded) expanded++;
  });

  document.getElementById('stVis').textContent = vis + ' / 465';
  document.getElementById('stStd').textContent = std;
  document.getElementById('stAI').textContent = ai;
  document.getElementById('stAdd').textContent = add;
  document.getElementById('stDepth').textContent = maxDepth;
  document.getElementById('stExp').textContent = expanded;
}

// ====================================================================
//  MINIMAP
// ====================================================================
const mmCanvas = document.getElementById('minimapCanvas');
const mmCtx = mmCanvas.getContext('2d');

function updateMinimap() {
  const cw = 160, ch = 120;
  mmCanvas.width = cw * 2;
  mmCanvas.height = ch * 2;
  mmCanvas.style.width = cw + 'px';
  mmCanvas.style.height = ch + 'px';
  mmCtx.scale(2, 2);

  mmCtx.clearRect(0, 0, cw, ch);

  const visible = collectVisible(root);
  if (visible.length <= 1) return;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  visible.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  });

  const bw = maxX - minX + 200 || 1;
  const bh = maxY - minY + 200 || 1;
  const scale = Math.min(cw / bw, ch / bh) * 0.8;
  const ox = cw / 2;
  const oy = ch / 2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Draw nodes as dots
  visible.forEach(n => {
    const sx = ox + (n.x - cx) * scale;
    const sy = oy + (n.y - cy) * scale;
    const r = n.level === 0 ? 3 : n.level === 1 ? 2.5 : n.level === 2 ? 2 : 1.5;
    mmCtx.beginPath();
    mmCtx.arc(sx, sy, r, 0, Math.PI * 2);
    mmCtx.fillStyle = n.level === 0 ? '#3498db' : n.color;
    mmCtx.fill();
  });

  // Draw viewport rect
  const vl = (-panX / zoom - vpW / 2 / zoom);
  const vt = (-panY / zoom - vpH / 2 / zoom);
  const vr = vl + vpW / zoom;
  const vb = vt + vpH / zoom;

  const sl = ox + (vl - cx) * scale;
  const st = oy + (vt - cy) * scale;
  const sr = ox + (vr - cx) * scale;
  const sb = oy + (vb - cy) * scale;

  mmCtx.strokeStyle = 'rgba(52,152,219,0.6)';
  mmCtx.lineWidth = 1;
  mmCtx.strokeRect(sl, st, sr - sl, sb - st);

  mmCtx.setTransform(1, 0, 0, 1, 0, 0);
}

// ====================================================================
//  UTILITY
// ====================================================================
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function lightenColor(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);
  return '#' + [nr, ng, nb].map(v => v.toString(16).padStart(2, '0')).join('');
}

function desaturate(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const nr = Math.round(r + (gray - r) * amount);
  const ng = Math.round(g + (gray - g) * amount);
  const nb = Math.round(b + (gray - b) * amount);
  return '#' + [nr, ng, nb].map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');
}

// ====================================================================
//  INIT
// ====================================================================
function init() {
  vpW = window.innerWidth;
  vpH = window.innerHeight - 44;
  updateTransform();
  render();
}

window.addEventListener('resize', () => {
  vpW = window.innerWidth;
  vpH = window.innerHeight - 44;
  updateTransform();
});

init();
</script>
</body>
</html>`;

fs.writeFileSync('c:/Users/Aditya/work/HRMS/diagrams/combined-mind-map.html', html, 'utf8');
console.log('File written successfully. Size:', fs.statSync('c:/Users/Aditya/work/HRMS/diagrams/combined-mind-map.html').size, 'bytes');
