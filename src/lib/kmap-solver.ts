// K-Map Solver Logic

export type InputType = 'minterms' | 'maxterms' | 'truthTable';

export interface KMapInput {
  type: InputType;
  variables: number;
  values: number[];
  dontCares?: number[];
}

export interface Group {
  cells: number[];
  color: string;
  term: string;
}

export interface KMapResult {
  grid: number[][];
  groups: Group[];
  sop: string;
  pos: string;
  sopTerms: string[];
  posTerms: string[];
}

export interface KMapHeaderConfig {
  rowLabels: string[];
  colLabels: string[];
  rowVars: string;
  colVars: string;
}

const GROUP_COLORS = [
  'hsl(185, 80%, 50%)',    // cyan
  'hsl(310, 80%, 55%)',    // magenta
  'hsl(50, 90%, 55%)',     // yellow
  'hsl(140, 70%, 45%)',    // green
  'hsl(25, 90%, 55%)',     // orange
  'hsl(260, 70%, 60%)',    // purple
];

// Gray code ordering for K-map
const grayCode2 = [0, 1, 3, 2];
const grayCode4 = [
  [0, 1, 3, 2],
  [4, 5, 7, 6],
  [12, 13, 15, 14],
  [8, 9, 11, 10]
];

export function getGrayCodeLabels(bits: number): string[] {
  if (bits === 1) return ['0', '1'];
  if (bits === 2) return ['00', '01', '11', '10'];
  return ['0', '1'];
}

export function getVariableNames(count: number): string[] {
  return ['A', 'B', 'C', 'D'].slice(0, count);
}

export function getKMapHeaderConfig(variables: number, varNames?: string[]): KMapHeaderConfig {
  const names = varNames || getVariableNames(variables);
  if (variables === 2) {
    return {
      rowLabels: ['0', '1'],
      colLabels: ['0', '1'],
      rowVars: names[0] || 'A',
      colVars: names[1] || 'B',
    };
  }
  if (variables === 3) {
    return {
      rowLabels: ['0', '1'],
      colLabels: getGrayCodeLabels(2),
      rowVars: names[0] || 'A',
      colVars: `${names[1] || 'B'}${names[2] || 'C'}`,
    };
  }
  return {
    rowLabels: getGrayCodeLabels(2),
    colLabels: getGrayCodeLabels(2),
    rowVars: `${names[0] || 'A'}${names[1] || 'B'}`,
    colVars: `${names[2] || 'C'}${names[3] || 'D'}`,
  };
}

export function createKMapGrid(variables: number, minterms: number[], dontCares: number[] = []): number[][] {
  if (variables === 2) {
    const grid = [[0, 0], [0, 0]];
    for (let i = 0; i < 4; i++) {
      const row = (i >> 1) & 1;
      const col = i & 1;
      if (minterms.includes(i)) grid[row][col] = 1;
      else if (dontCares.includes(i)) grid[row][col] = -1;
    }
    return grid;
  }
  
  if (variables === 3) {
    const grid = [[0, 0, 0, 0], [0, 0, 0, 0]];
    const colOrder = [0, 1, 3, 2];
    for (let i = 0; i < 8; i++) {
      const row = (i >> 2) & 1;
      const colIdx = colOrder.indexOf(i & 3);
      if (minterms.includes(i)) grid[row][colIdx] = 1;
      else if (dontCares.includes(i)) grid[row][colIdx] = -1;
    }
    return grid;
  }
  
  if (variables === 4) {
    const grid = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const rowOrder = [0, 1, 3, 2];
    const colOrder = [0, 1, 3, 2];
    
    for (let i = 0; i < 16; i++) {
      const rowBits = (i >> 2) & 3;
      const colBits = i & 3;
      const row = rowOrder.indexOf(rowBits);
      const col = colOrder.indexOf(colBits);
      if (minterms.includes(i)) grid[row][col] = 1;
      else if (dontCares.includes(i)) grid[row][col] = -1;
    }
    return grid;
  }
  
  return [[0]];
}

export function getMintermFromPosition(variables: number, row: number, col: number): number {
  const rowOrder = [0, 1, 3, 2];
  const colOrder = [0, 1, 3, 2];
  
  if (variables === 2) {
    return (row << 1) | col;
  }
  
  if (variables === 3) {
    const colBits = colOrder[col];
    return (row << 2) | colBits;
  }
  
  if (variables === 4) {
    const rowBits = rowOrder[row];
    const colBits = colOrder[col];
    return (rowBits << 2) | colBits;
  }
  
  return 0;
}

function findGroups(variables: number, grid: number[][]): Group[] {
  const groups: Group[] = [];
  const rows = grid.length;
  const cols = grid[0].length;
  const covered = new Set<string>();
  
  // Get all cells with value 1 or -1 (don't care)
  const activeCells: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1 || grid[r][c] === -1) {
        activeCells.push([r, c]);
      }
    }
  }
  
  // Find groups of sizes: 8, 4, 2, 1
  const sizes = variables >= 4 ? [8, 4, 2, 1] : variables >= 3 ? [4, 2, 1] : [2, 1];
  
  for (const size of sizes) {
    const possibleGroups = generatePossibleGroups(rows, cols, size);
    
    for (const cells of possibleGroups) {
      // Check if all cells in this group are active (1 or -1)
      const allActive = cells.every(([r, c]) => grid[r][c] === 1 || grid[r][c] === -1);
      
      // Check if this group covers at least one uncovered '1' cell
      const coversNew = cells.some(([r, c]) => grid[r][c] === 1 && !covered.has(`${r},${c}`));
      
      if (allActive && coversNew) {
        const minterms = cells.map(([r, c]) => getMintermFromPosition(variables, r, c));
        const term = getTermFromGroup(variables, minterms);
        
        groups.push({
          cells: minterms,
          color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
          term
        });
        
        // Mark covered cells
        cells.forEach(([r, c]) => {
          if (grid[r][c] === 1) covered.add(`${r},${c}`);
        });
      }
    }
  }
  
  return groups;
}

function generatePossibleGroups(rows: number, cols: number, size: number): [number, number][][] {
  const groups: [number, number][][] = [];
  
  // Determine possible dimensions for this group size
  const dimensions: [number, number][] = [];
  for (let h = 1; h <= rows; h *= 2) {
    for (let w = 1; w <= cols; w *= 2) {
      if (h * w === size) {
        dimensions.push([h, w]);
      }
    }
  }
  
  for (const [height, width] of dimensions) {
    for (let startR = 0; startR < rows; startR++) {
      for (let startC = 0; startC < cols; startC++) {
        const cells: [number, number][] = [];
        
        for (let dr = 0; dr < height; dr++) {
          for (let dc = 0; dc < width; dc++) {
            const r = (startR + dr) % rows;
            const c = (startC + dc) % cols;
            cells.push([r, c]);
          }
        }
        
        groups.push(cells);
      }
    }
  }
  
  return groups;
}

function getTermFromGroup(variables: number, minterms: number[]): string {
  const varNames = getVariableNames(variables);
  const bits = minterms.map(m => {
    const binary = m.toString(2).padStart(variables, '0');
    return binary.split('').map(b => parseInt(b));
  });
  
  const term: string[] = [];
  
  for (let i = 0; i < variables; i++) {
    const values = bits.map(b => b[i]);
    const allZero = values.every(v => v === 0);
    const allOne = values.every(v => v === 1);
    
    if (allZero) {
      term.push(`${varNames[i]}'`);
    } else if (allOne) {
      term.push(varNames[i]);
    }
    // If mixed, this variable is eliminated
  }
  
  return term.length > 0 ? term.join('') : '1';
}

function getPOSTermFromGroup(variables: number, maxterms: number[]): string {
  const varNames = getVariableNames(variables);
  const bits = maxterms.map(m => {
    const binary = m.toString(2).padStart(variables, '0');
    return binary.split('').map(b => parseInt(b));
  });
  
  const term: string[] = [];
  
  for (let i = 0; i < variables; i++) {
    const values = bits.map(b => b[i]);
    const allZero = values.every(v => v === 0);
    const allOne = values.every(v => v === 1);
    
    if (allZero) {
      term.push(varNames[i]);
    } else if (allOne) {
      term.push(`${varNames[i]}'`);
    }
  }
  
  return term.length > 0 ? `(${term.join(' + ')})` : '0';
}

export function solveKMap(input: KMapInput): KMapResult {
  const { type, variables, values, dontCares = [] } = input;
  
  let minterms: number[] = [];
  let maxterms: number[] = [];
  const totalCells = Math.pow(2, variables);
  
  if (type === 'minterms') {
    minterms = values;
    maxterms = Array.from({ length: totalCells }, (_, i) => i)
      .filter(i => !minterms.includes(i) && !dontCares.includes(i));
  } else if (type === 'maxterms') {
    maxterms = values;
    minterms = Array.from({ length: totalCells }, (_, i) => i)
      .filter(i => !maxterms.includes(i) && !dontCares.includes(i));
  } else {
    // Truth table - values array contains the output for each row
    values.forEach((val, idx) => {
      if (val === 1) minterms.push(idx);
      else if (val === 0) maxterms.push(idx);
    });
  }
  
  const grid = createKMapGrid(variables, minterms, dontCares);
  
  // Find groups for SOP
  const sopGroups = findGroups(variables, grid);
  const sopTerms = [...new Set(sopGroups.map(g => g.term))];
  const sop = sopTerms.length > 0 ? sopTerms.join(' + ') : '0';
  
  // Find groups for POS (using maxterms)
  const maxGrid = createKMapGrid(variables, maxterms, dontCares);
  const posGroupsRaw = findGroups(variables, maxGrid);
  const posTerms = [...new Set(posGroupsRaw.map(g => {
    return getPOSTermFromGroup(variables, g.cells);
  }))];
  const pos = posTerms.length > 0 ? posTerms.join('') : '1';
  
  return {
    grid,
    groups: sopGroups,
    sop,
    pos,
    sopTerms,
    posTerms
  };
}

export function parseTerms(input: string): number[] {
  const cleaned = input.replace(/\s/g, '');
  if (!cleaned) return [];
  
  return cleaned.split(',')
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n));
}
