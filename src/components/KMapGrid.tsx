import { forwardRef, useMemo } from 'react';
import { getKMapHeaderConfig, getVariableNames, getMintermFromPosition, Group } from '@/lib/kmap-solver';

interface KMapGridProps {
  variables: number;
  grid: number[][];
  groups: Group[];
}

export const KMapGrid = forwardRef<HTMLDivElement, KMapGridProps>(
  ({ variables, grid, groups }, ref) => {
    const varNames = getVariableNames(variables);
    
    const { rowLabels, colLabels, rowVars, colVars } = useMemo(
      () => getKMapHeaderConfig(variables, varNames),
      [variables, varNames]
    );

    const getCellColor = (row: number, col: number): string | null => {
      const minterm = getMintermFromPosition(variables, row, col);
      for (const group of groups) {
        if (group.cells.includes(minterm)) {
          return group.color;
        }
      }
      return null;
    };

    return (
      <div ref={ref} className="flex flex-col items-center gap-4 animate-fade-in">
        {/* Variable labels */}
        <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
          <span className="text-primary">{rowVars} \ {colVars}</span>
        </div>
        
        <div className="flex">
          {/* Row labels */}
          <div className="flex flex-col mt-14">
            {rowLabels.map((label, idx) => (
              <div 
                key={idx} 
                className="h-14 flex items-center justify-end pr-3 font-mono text-sm text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>
          
          {/* Grid */}
          <div className="flex flex-col">
            {/* Column labels */}
            <div className="flex">
              {colLabels.map((label, idx) => (
                <div 
                  key={idx} 
                  className="w-14 h-8 flex items-center justify-center font-mono text-sm text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>
            
            {/* Cells */}
            <div className="relative border-2 border-border rounded-lg overflow-hidden glow-box">
              {grid.map((row, rowIdx) => (
                <div key={rowIdx} className="flex">
                  {row.map((cell, colIdx) => {
                    const groupColor = getCellColor(rowIdx, colIdx);
                    const minterm = getMintermFromPosition(variables, rowIdx, colIdx);
                    
                    return (
                      <div
                        key={colIdx}
                        className={`
                          kmap-cell relative
                          ${cell === 1 ? 'kmap-cell-active' : ''}
                          ${cell === -1 ? 'text-accent' : ''}
                        `}
                        style={groupColor ? { 
                          backgroundColor: `${groupColor}20`,
                          boxShadow: `inset 0 0 0 2px ${groupColor}40`
                        } : undefined}
                      >
                        <span className="relative z-10">
                          {cell === -1 ? 'X' : cell}
                        </span>
                        <span className="absolute bottom-1 right-1 text-[10px] text-muted-foreground opacity-50">
                          {minterm}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Groups legend */}
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {groups.map((group, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card"
                style={{ borderColor: group.color }}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span className="font-mono text-sm" style={{ color: group.color }}>
                  {group.term}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

KMapGrid.displayName = 'KMapGrid';
