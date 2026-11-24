import { useState, useEffect, forwardRef } from 'react';
import { getKMapHeaderConfig, getVariableNames, getMintermFromPosition } from '@/lib/kmap-solver';

interface InteractiveKMapProps {
  variables: number;
  onChange: (minterms: number[], dontCares: number[]) => void;
}

export const InteractiveKMap = forwardRef<HTMLDivElement, InteractiveKMapProps>(
  ({ variables, onChange }, ref) => {
    const varNames = getVariableNames(variables);
    
    // Cell states: 0 = off, 1 = on, 2 = don't care
    const getInitialGrid = () => {
      if (variables === 2) return [[0, 0], [0, 0]];
      if (variables === 3) return [[0, 0, 0, 0], [0, 0, 0, 0]];
      return [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    };
    
    const [cellStates, setCellStates] = useState<number[][]>(getInitialGrid);
    
    useEffect(() => {
      setCellStates(getInitialGrid());
    }, [variables]);
    
    useEffect(() => {
      const minterms: number[] = [];
      const dontCares: number[] = [];
      
      cellStates.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          const minterm = getMintermFromPosition(variables, rowIdx, colIdx);
          if (cell === 1) minterms.push(minterm);
          else if (cell === 2) dontCares.push(minterm);
        });
      });
      
      onChange(minterms, dontCares);
    }, [cellStates, variables, onChange]);
    
    const toggleCell = (rowIdx: number, colIdx: number) => {
      setCellStates(prev => {
        const newStates = prev.map(row => [...row]);
        newStates[rowIdx][colIdx] = (newStates[rowIdx][colIdx] + 1) % 3;
        return newStates;
      });
    };
    
    const { rowLabels, colLabels, rowVars, colVars } = getKMapHeaderConfig(variables, varNames);

    const clearAll = () => {
      setCellStates(getInitialGrid());
    };

    const setAll = (value: number) => {
      setCellStates(prev => prev.map(row => row.map(() => value)));
    };

    return (
      <div ref={ref} className="flex flex-col items-center gap-4 animate-fade-in">
        {/* Variable labels */}
        <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
          <span className="text-primary font-semibold">{rowVars} \ {colVars}</span>
        </div>
        
        <div className="flex">
          {/* Row labels */}
          <div className="flex flex-col mt-10">
            {rowLabels.map((label, idx) => (
              <div 
                key={idx} 
                className="h-12 flex items-center justify-end pr-3 font-mono text-sm text-muted-foreground"
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
                  className="w-12 h-6 flex items-center justify-center font-mono text-sm text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>
            
            {/* Cells */}
            <div className="relative border-2 border-primary/30 rounded-lg overflow-hidden">
              {cellStates.map((row, rowIdx) => (
                <div key={rowIdx} className="flex">
                  {row.map((cell, colIdx) => {
                    const minterm = getMintermFromPosition(variables, rowIdx, colIdx);
                    
                    return (
                      <button
                        key={colIdx}
                        onClick={() => toggleCell(rowIdx, colIdx)}
                        className={`
                          relative w-12 h-12 border border-border
                          flex items-center justify-center
                          text-lg font-mono font-bold
                          transition-all duration-150
                          hover:scale-105 hover:z-10
                          focus:outline-none focus:ring-2 focus:ring-primary
                          ${cell === 1 
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                            : cell === 2 
                              ? 'bg-accent/30 text-accent'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'}
                        `}
                      >
                        <span className="relative z-10">
                          {cell === 2 ? 'X' : cell}
                        </span>
                        <span className="absolute bottom-0.5 right-1 text-[9px] opacity-40">
                          {minterm}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Quick actions */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={() => setAll(1)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
          >
            Set All 1
          </button>
          <button
            onClick={() => setAll(2)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
          >
            Set All X
          </button>
        </div>
        
        {/* Instructions */}
        <p className="text-xs text-muted-foreground text-center">
          Click cells to toggle: <span className="text-muted-foreground">0</span> → <span className="text-primary">1</span> → <span className="text-accent">X</span> → <span className="text-muted-foreground">0</span>
        </p>
      </div>
    );
  }
);

InteractiveKMap.displayName = 'InteractiveKMap';
