
"use client";
import React from 'react';
import { useLevelData } from '@/contexts/LevelDataContext';
import type { BobbinCell, FabricBlockData, LevelData, BobbinColor, BobbinPair } from '@/lib/types';
import { COLOR_MAP, LIMITED_FABRIC_COLORS, createFabricBlock, PAIRING_LINE_COLOR } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FabricBlockPopover } from './FabricBlockPopover';


interface LiveVisualizerProps {
  editorType: 'bobbin' | 'fabric';
  className?: string;
}

const CELL_SIZE = 32; 
const SPOOL_WIDTH_RATIO = 0.8;
const SPOOL_END_HEIGHT_RATIO = 0.2;
const FABRIC_BLOCK_GAP = 2; 
const FABRIC_EMPTY_SLOT_COLOR = "hsl(var(--muted) / 0.5)"; 

const BobbinVisualizer: React.FC<{data: LevelData['bobbinArea'], hasErrors: boolean}> = ({ data, hasErrors }) => {
  const { rows, cols, cells, pairs = [] } = data;
  const width = cols * CELL_SIZE;
  const height = rows * CELL_SIZE;

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`} 
      className={cn("border rounded-md bg-background shadow-inner overflow-visible", hasErrors && "outline outline-2 outline-offset-2 outline-destructive")}
      aria-label="Bobbin area visualization"
    >
      {/* Grid Lines */}
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <line key={`h-line-${i}`} x1="0" y1={i * CELL_SIZE} x2={width} y2={i * CELL_SIZE} stroke="hsl(var(--border))" strokeWidth="0.5" />
      ))}
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <line key={`v-line-${i}`} x1={i * CELL_SIZE} y1="0" x2={i * CELL_SIZE} y2={height} stroke="hsl(var(--border))" strokeWidth="0.5" />
      ))}

      {/* Cells */}
      {cells.map((row, rIdx) => 
        row.map((cell, cIdx) => {
          const x = cIdx * CELL_SIZE;
          const y = rIdx * CELL_SIZE;
          
          let cellElement = <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill="hsl(var(--muted))" />;

          if (cell.type === 'hidden' && cell.color) {
            cellElement = (
              <rect 
                x={x + 0.5} 
                y={y + 0.5} 
                width={CELL_SIZE - 1} 
                height={CELL_SIZE - 1} 
                fill={COLOR_MAP[cell.color] || cell.color} 
                opacity={0.3} 
                stroke={COLOR_MAP[cell.color] || cell.color} 
                strokeWidth="1.5" 
                strokeDasharray="3 3" 
              />
            );
          }

          if (cell.type === 'bobbin' && cell.color) {
            const spoolColor = COLOR_MAP[cell.color] || cell.color;
            cellElement = (
              <g transform={`translate(${x + CELL_SIZE / 2}, ${y + CELL_SIZE / 2})`}>
                <rect 
                  x={-CELL_SIZE * SPOOL_WIDTH_RATIO / 2} 
                  y={-CELL_SIZE / 2 * (1 - SPOOL_END_HEIGHT_RATIO)} 
                  width={CELL_SIZE * SPOOL_WIDTH_RATIO} 
                  height={CELL_SIZE * (1 - SPOOL_END_HEIGHT_RATIO * 2)}
                  fill={spoolColor}
                  rx="2"
                />
                <rect x={-CELL_SIZE / 2} y={-CELL_SIZE / 2} width={CELL_SIZE} height={CELL_SIZE * SPOOL_END_HEIGHT_RATIO} fill={spoolColor} opacity="0.7" rx="1"/>
                <rect x={-CELL_SIZE / 2} y={CELL_SIZE / 2 * (1-SPOOL_END_HEIGHT_RATIO*2)} width={CELL_SIZE} height={CELL_SIZE * SPOOL_END_HEIGHT_RATIO} fill={spoolColor} opacity="0.7" rx="1"/>
              </g>
            );
          }

          if (cell.type === 'pipe' && cell.colors && cell.colors.length >= 1) { 
            const numColors = cell.colors.length;
            const stripeWidth = CELL_SIZE / numColors;
            cellElement = (
              <g>
                {cell.colors.map((pipeColor, i) => (
                  <rect
                    key={`pipe-stripe-${rIdx}-${cIdx}-${i}`}
                    x={x + i * stripeWidth}
                    y={y}
                    width={stripeWidth}
                    height={CELL_SIZE}
                    fill={COLOR_MAP[pipeColor] || pipeColor}
                  />
                ))}
                <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill="none" stroke="hsl(var(--border) / 0.5)" strokeWidth="0.5"/>
              </g>
            );
          } else if (cell.type === 'pipe') { 
             cellElement = <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill="hsl(var(--muted))" stroke="hsl(var(--destructive))" strokeWidth="1" />;
          }
          
          return <React.Fragment key={`bobbin-${rIdx}-${cIdx}`}>{cellElement}</React.Fragment>;
        })
      )}
       {/* Pairing Lines */}
       {pairs.map((pair, pIdx) => {
        const fromX = pair.from.col * CELL_SIZE + CELL_SIZE / 2;
        const fromY = pair.from.row * CELL_SIZE + CELL_SIZE / 2;
        const toX = pair.to.col * CELL_SIZE + CELL_SIZE / 2;
        const toY = pair.to.row * CELL_SIZE + CELL_SIZE / 2;
        return (
          <line
            key={`pair-line-${pIdx}`}
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke={PAIRING_LINE_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
            className="pointer-events-none" 
          />
        );
      })}
    </svg>
  );
};

const FabricVisualizer: React.FC<{data: LevelData['fabricArea'], hasErrors: boolean}> = ({ data, hasErrors }) => {
  const { setLevelData, setLastInteractedFabricCol, setActiveEditorArea } = useLevelData();
  const { cols, maxFabricHeight, columns } = data;
  
  const blockDisplayHeight = CELL_SIZE - FABRIC_BLOCK_GAP;
  const svgWidth = cols * CELL_SIZE;
  const svgHeight = maxFabricHeight * CELL_SIZE;

  const handleTriggerClick = (colIndex: number) => {
    setLastInteractedFabricCol(colIndex);
    setActiveEditorArea('fabric');
  };

  return (
    <svg 
      width={svgWidth} 
      height={svgHeight} 
      viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
      className={cn("border rounded-md bg-background shadow-inner", hasErrors && "outline outline-2 outline-offset-2 outline-destructive")}
      aria-label="Fabric area visualization (interactive)"
    >
      {Array.from({ length: cols }).map((_, cIdx) => 
        Array.from({ length: maxFabricHeight }).map((_, bIdxInVis) => { 
          // bIdxInVis: 0 is top visual slot, maxFabricHeight-1 is bottom visual slot
          // bIdxInColumnData: 0 is bottom-most actual block in sparse array, length-1 is top-most actual block
          const currentColumnSparse = columns[cIdx] || []; 
          // Map visual index (bIdxInVis, 0=top) to sparse data index (0=bottom)
          // A block at visual index bIdxInVis corresponds to a potential block at sparse index (maxFabricHeight - 1 - bIdxInVis)
          // if the sparse array was full.
          // Since it's sparse, we directly check: currentColumnSparse[maxFabricHeight - 1 - bIdxInVis]
          const dataIndexFromBottom = maxFabricHeight - 1 - bIdxInVis;
          const currentBlock = currentColumnSparse[dataIndexFromBottom];


          const x = cIdx * CELL_SIZE + FABRIC_BLOCK_GAP / 2;
          const y = bIdxInVis * CELL_SIZE + FABRIC_BLOCK_GAP / 2; // y still based on visual index

          const fillColor = currentBlock ? (COLOR_MAP[currentBlock.color] || currentBlock.color) : FABRIC_EMPTY_SLOT_COLOR;
          const strokeColor = currentBlock ? (COLOR_MAP[currentBlock.color] || currentBlock.color) : "hsl(var(--border))";
          const blockOpacity = currentBlock?.hidden ? 0.5 : 1;

          return (
            <Popover key={`fabric-popover-${cIdx}-${bIdxInVis}`}>
              <PopoverTrigger asChild onClick={() => handleTriggerClick(cIdx)}>
                <rect
                  x={x}
                  y={y}
                  width={CELL_SIZE - FABRIC_BLOCK_GAP}
                  height={blockDisplayHeight}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={currentBlock ? 1 : 0.5}
                  opacity={blockOpacity} 
                  rx="2"
                  style={{ cursor: 'pointer' }}
                  className={cn(
                    "hover:stroke-primary hover:stroke-2",
                    currentBlock?.hidden && "stroke-dashed stroke-1"
                  )}
                  strokeDasharray={currentBlock?.hidden ? "3 3" : undefined}
                  aria-label={
                    currentBlock 
                      ? `Fabric block color ${currentBlock.color}${currentBlock.hidden ? ' (hidden)' : ''}, column ${cIdx + 1}, visual row ${bIdxInVis + 1}. Click to edit.` 
                      : `Empty fabric slot, column ${cIdx + 1}, visual row ${bIdxInVis + 1}. Click to add/edit block.`
                  }
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <FabricBlockPopover
                  blockData={currentBlock || null} 
                  colIndex={cIdx}
                  rowIndexInVisualizer={bIdxInVis} 
                  onBlockChange={(newBlockState: FabricBlockData | null) => {
                    setLevelData(draft => {
                      const currentSparseColumn = draft.fabricArea.columns[cIdx] || [];
                      
                      // 1. Create a full representation of the visual column (top-down: index 0 is top slot)
                      const visualColumnRepresentation: (FabricBlockData | null)[] = Array(draft.fabricArea.maxFabricHeight).fill(null);
                      
                      // Populate visualColumnRepresentation from currentSparseColumn
                      // currentSparseColumn[j] is the j-th block from the bottom (index 0 of sparse = bottom block).
                      // Its visual index is (maxFabricHeight - 1 - j).
                      for (let j = 0; j < currentSparseColumn.length; j++) {
                        const block = currentSparseColumn[j];
                        const visualIndex = draft.fabricArea.maxFabricHeight - 1 - j;
                        if (visualIndex >= 0 && visualIndex < draft.fabricArea.maxFabricHeight) {
                          visualColumnRepresentation[visualIndex] = block;
                        }
                      }
                      
                      // 2. Modify the visualColumnRepresentation based on the click
                      // bIdxInVis is the visual index clicked (0=top, maxFabricHeight-1=bottom)
                      visualColumnRepresentation[bIdxInVis] = newBlockState; 
                                            
                      // 3. Convert visualColumnRepresentation (top-down) back to a sparse, bottom-up array
                      const newSparseColumnResult: FabricBlockData[] = [];
                      // Iterate visual slots from bottom (maxFabricHeight-1) up to top (0)
                      for (let k_visualRow = draft.fabricArea.maxFabricHeight - 1; k_visualRow >= 0; k_visualRow--) {
                        const blockInSlot = visualColumnRepresentation[k_visualRow];
                        if (blockInSlot) {
                          // When k_visualRow is maxH-1 (bottom visual), this block is PUSHED. It becomes newSparseColumnResult[0].
                          // When k_visualRow is 0 (top visual), this block is PUSHED. It becomes newSparseColumnResult[length-1].
                          // This builds newSparseColumnResult in order [BottomBlock, ..., TopBlock]
                          newSparseColumnResult.push(blockInSlot);
                        }
                      }
                      draft.fabricArea.columns[cIdx] = newSparseColumnResult;
                    });
                  }}
                />
              </PopoverContent>
            </Popover>
          );
        })
      )}
      {Array.from({ length: maxFabricHeight +1 }).map((_, i) => (
         <line key={`h-fabric-line-${i}`} x1="0" y1={i * CELL_SIZE} x2={svgWidth} y2={i * CELL_SIZE} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray={i === maxFabricHeight ? "none" : "2 2"} opacity="0.5"/>
      ))}
       {Array.from({ length: cols + 1 }).map((_, i) => (
        <line key={`v-fabric-line-${i}`} x1={i * CELL_SIZE} y1="0" x2={i * CELL_SIZE} y2={svgHeight} stroke="hsl(var(--border))" strokeWidth="0.5" />
      ))}
    </svg>
  );
};


export const LiveVisualizer: React.FC<LiveVisualizerProps> = ({ editorType, className }) => {
  const { levelData, validationMessages } = useLevelData();
  const hasErrors = validationMessages.some(msg => msg.type === 'error');

  return (
    <div className={cn("p-4 bg-card rounded-lg shadow space-y-3", className)}>
      <h3 className="text-lg font-semibold text-primary">
        {editorType === 'bobbin' ? 'Bobbin Area Preview' : 'Fabric Area Preview'}
         {editorType === 'fabric' && <span className="text-sm font-normal text-muted-foreground"> (Click to edit)</span>}
      </h3>
      <div className="flex justify-center items-center overflow-auto">
      {editorType === 'bobbin' ? (
        <BobbinVisualizer data={levelData.bobbinArea} hasErrors={hasErrors} />
      ) : (
        <FabricVisualizer data={levelData.fabricArea} hasErrors={hasErrors} />
      )}
      </div>
    </div>
  );
};

