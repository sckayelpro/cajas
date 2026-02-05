"use client";

import { useState, useMemo, useEffect } from "react";
import { Product, CalculationResults } from "../types";
import { Box, Ruler, Trash2, RotateCw, Copy, ChevronsRight, ChevronsDown, Eraser } from "lucide-react";

// Definiciones de tipos internos
type ProductTemplate = Product;

interface PlacedProduct {
  instanceId: string;
  template: ProductTemplate;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export function BoxCalculator() {
  // --- CONSTANTES DE DISEÑO ---
  const SCALE = 8; // 1cm = 8px. 

  // --- ESTADO ---
  const [productTemplates, setProductTemplates] = useState<ProductTemplate[]>([]);
  const [newProductName, setNewProductName] = useState("");
  const [newProductWidth, setNewProductWidth] = useState("");
  const [newProductLength, setNewProductLength] = useState("");
  const [newProductHeight, setNewProductHeight] = useState("");

  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(5);
  const [placedProducts, setPlacedProducts] = useState<PlacedProduct[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  
  const [colSpan, setColSpan] = useState(1);
  const [rowSpan, setRowSpan] = useState(1);

  const [boxType, setBoxType] = useState("with-lid");
  const [heightMargin, setHeightMargin] = useState("1.5");
  const [lidHeight, setLidHeight] = useState("3");
  const [lidMargin, setLidMargin] = useState("0.3");

  const [results, setResults] = useState<CalculationResults | null>(null);

  // --- LÓGICA DE PLANTILLAS ---
  const handleAddTemplate = () => {
    if (newProductName && newProductWidth && newProductLength && newProductHeight) {
      const newTemplate: ProductTemplate = {
        id: new Date().toISOString(),
        name: newProductName,
        width: parseFloat(newProductWidth),
        length: parseFloat(newProductLength),
        height: parseFloat(newProductHeight),
      };
      setProductTemplates([...productTemplates, newTemplate]);
      setNewProductName("");
      setNewProductWidth("");
      setNewProductLength("");
      setNewProductHeight("");
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    setProductTemplates(prev => prev.filter(p => p.id !== templateId));
    setPlacedProducts(prev => prev.filter(p => p.template.id !== templateId));
    if (selectedTemplate?.id === templateId) setSelectedTemplate(null);
  };

  const handleSelectTemplate = (template: ProductTemplate) => {
    if (selectedTemplate?.id === template.id) {
      const rotated = { ...template, width: template.length, length: template.width };
      setProductTemplates(prev => prev.map(t => t.id === rotated.id ? rotated : t));
      setSelectedTemplate(rotated);
    } else {
      setSelectedTemplate(template);
      setColSpan(1);
      setRowSpan(1);
    }
  };

  // --- LÓGICA DE ESCALA Y DIMENSIONES REALES (CORREGIDA) ---
  const { colWidths, rowLengths, totalInnerWidth, totalInnerLength, maxHeight } = useMemo(() => {
    // Inicializamos en 0 para que las celdas vacías no sumen centímetros reales
    const widths = Array(cols).fill(0); 
    const lengths = Array(rows).fill(0);

    placedProducts.forEach(p => {
      const widthPerCol = p.template.width / p.colSpan;
      for (let i = 0; i < p.colSpan; i++) {
        const c = p.col + i;
        if (c < cols) widths[c] = Math.max(widths[c], widthPerCol);
      }

      const lengthPerRow = p.template.length / p.rowSpan;
      for (let i = 0; i < p.rowSpan; i++) {
        const r = p.row + i;
        if (r < rows) lengths[r] = Math.max(lengths[r], lengthPerRow);
      }
    });

    return {
      colWidths: widths,
      rowLengths: lengths,
      totalInnerWidth: widths.reduce((a, b) => a + b, 0),
      totalInnerLength: lengths.reduce((a, b) => a + b, 0),
      maxHeight: Math.max(0, ...placedProducts.map(p => p.template.height), 0)
    };
  }, [placedProducts, rows, cols]);

  // --- CÁLCULO DE RESULTADOS FINALES ---
  useEffect(() => {
    if (placedProducts.length === 0) {
      setResults(null);
      return;
    }

    const innerHeight = maxHeight + parseFloat(heightMargin || "0");
    const baseCutWidth = totalInnerWidth + 2 * innerHeight;
    const baseCutLength = totalInnerLength + 2 * innerHeight;

    let lidCutWidth, lidCutLength;
    if (boxType === "with-lid") {
      const fLidH = parseFloat(lidHeight || "0");
      const fLidM = parseFloat(lidMargin || "0");
      lidCutWidth = (totalInnerWidth + fLidM) + 2 * fLidH;
      lidCutLength = (totalInnerLength + fLidM) + 2 * fLidH;
    }

    setResults({
      innerWidth: totalInnerWidth,
      innerLength: totalInnerLength,
      innerHeight,
      baseCutWidth,
      baseCutLength,
      lidCutWidth,
      lidCutLength,
    });
  }, [totalInnerWidth, totalInnerLength, maxHeight, boxType, heightMargin, lidHeight, lidMargin, placedProducts]);

  // --- MANEJO DEL CLICK EN EL LIENZO ---
  const handleCellClick = (r_idx: number, c_idx: number) => {
    if (!selectedTemplate) return;

    if ((r_idx + rowSpan) > rows || (c_idx + colSpan) > cols) {
      alert("El producto excede los límites definidos.");
      return;
    }

    const isOccupied = placedProducts.some(p => {
      const horizontalOverlap = c_idx < p.col + p.colSpan && c_idx + colSpan > p.col;
      const verticalOverlap = r_idx < p.row + p.rowSpan && r_idx + rowSpan > p.row;
      return horizontalOverlap && verticalOverlap;
    });

    if (isOccupied) {
      alert("Ese espacio ya está ocupado.");
      return;
    }

    const newPlaced: PlacedProduct = {
      instanceId: new Date().getTime().toString(),
      template: selectedTemplate,
      row: r_idx,
      col: c_idx,
      rowSpan,
      colSpan,
    };
    setPlacedProducts([...placedProducts, newPlaced]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 bg-white dark:bg-zinc-900 shadow-lg rounded-xl">
      <h1 className="text-3xl font-bold text-center mb-6 flex items-center justify-center gap-3">
        <Box size={32} /> Simulador de Empaque Real
      </h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* COLUMNA IZQUIERDA: CONFIGURACIÓN */}
        <div className="space-y-6">
          <div className="p-4 border rounded-lg dark:border-zinc-700">
            <h2 className="text-xl font-semibold mb-4">1. Crear Plantillas</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Nombre (ej. Dona)" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full p-2 rounded bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700"/>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="Ancho" value={newProductWidth} onChange={e => setNewProductWidth(e.target.value)} className="p-2 rounded bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700"/>
                <input type="number" placeholder="Largo" value={newProductLength} onChange={e => setNewProductLength(e.target.value)} className="p-2 rounded bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700"/>
                <input type="number" placeholder="Alto" value={newProductHeight} onChange={e => setNewProductHeight(e.target.value)} className="p-2 rounded bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700"/>
              </div>
              <button onClick={handleAddTemplate} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"><Copy size={16}/>Añadir a Catálogo</button>
            </div>
          </div>

          <div className="p-4 border rounded-lg dark:border-zinc-700">
            <h2 className="text-xl font-semibold mb-4">2. Catálogo</h2>
            <div className="flex flex-wrap gap-2">
              {productTemplates.map(t => (
                <div key={t.id} onClick={() => handleSelectTemplate(t)} className={`relative p-2 rounded border-2 transition-all cursor-pointer ${selectedTemplate?.id === t.id ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-transparent bg-zinc-100 dark:bg-zinc-800'}`}>
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-xs">{t.width} x {t.length} cm</p>
                  {selectedTemplate?.id === t.id && <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1"><RotateCw size={12}/></div>}
                  <button onClick={(e) => {e.stopPropagation(); handleDeleteTemplate(t.id)}} className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-0.5"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          </div>

          {selectedTemplate && (
            <div className="p-4 border-2 border-green-500 rounded-lg bg-green-50 dark:bg-green-900/10">
              <h2 className="text-lg font-semibold mb-3">3. Configurar Colocación</h2>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"> <ChevronsRight size={16}/> Cols (Ancho): 
                  <input type="number" min="1" max={cols} value={colSpan} onChange={e => setColSpan(Number(e.target.value))} className="w-12 p-1 rounded border dark:bg-zinc-800"/>
                </label>
                <label className="flex items-center gap-2 text-sm"> <ChevronsDown size={16}/> Filas (Largo): 
                  <input type="number" min="1" max={rows} value={rowSpan} onChange={e => setRowSpan(Number(e.target.value))} className="w-12 p-1 rounded border dark:bg-zinc-800"/>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: LIENZO Y RESULTADOS */}
        <div className="space-y-6">
          <div className="p-4 border rounded-lg dark:border-zinc-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">4. Lienzo de Diseño</h2>
              <button onClick={() => setPlacedProducts([])} className="text-xs flex items-center gap-1 text-red-500 hover:underline"><Eraser size={14}/> Limpiar</button>
            </div>
            
            <div className="flex gap-4 mb-4 text-sm">
              <label>Filas: <input type="number" value={rows} onChange={e => setRows(Number(e.target.value))} className="w-12 p-1 rounded border dark:bg-zinc-800"/></label>
              <label>Columnas: <input type="number" value={cols} onChange={e => setCols(Number(e.target.value))} className="w-12 p-1 rounded border dark:bg-zinc-800"/></label>
            </div>

            {/* GRILLA DINÁMICA: Si el valor real es 0, usamos 5 para que sea visible en el editor */}
            <div 
              className="grid gap-1 bg-zinc-200 dark:bg-zinc-800 p-1 rounded-md overflow-auto border dark:border-zinc-600"
              style={{
                gridTemplateColumns: colWidths.map(w => `${Math.max(w, 5) * SCALE}px`).join(' '),
                gridTemplateRows: rowLengths.map(l => `${Math.max(l, 5) * SCALE}px`).join(' '),
                width: 'fit-content',
                minWidth: '100%'
              }}
            >
              {Array.from({ length: rows * cols }).map((_, i) => {
                const r = Math.floor(i / cols);
                const c = i % cols;
                return (
                  <div 
                    key={`cell-${r}-${c}`} 
                    onClick={() => handleCellClick(r, c)}
                    className="bg-zinc-50 dark:bg-zinc-700/50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer border border-transparent hover:border-green-400"
                    style={{ gridRowStart: r + 1, gridColumnStart: c + 1, minHeight: '40px' }}
                  />
                );
              })}

              {placedProducts.map(p => (
                <div 
                  key={p.instanceId} 
                  onClick={() => setPlacedProducts(prev => prev.filter(x => x.instanceId !== p.instanceId))}
                  className="flex flex-col items-center justify-center p-1 rounded border-2 border-blue-500 bg-blue-500/20 text-blue-700 dark:text-blue-300 z-10 cursor-pointer overflow-hidden shadow-sm"
                  style={{
                    gridRowStart: p.row + 1,
                    gridColumnStart: p.col + 1,
                    gridRowEnd: `span ${p.rowSpan}`,
                    gridColumnEnd: `span ${p.colSpan}`
                  }}
                >
                  <p className="font-bold text-[10px] truncate w-full text-center">{p.template.name}</p>
                  <p className="text-[9px]">{p.template.width}x{p.template.length}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RESULTADOS */}
          <div className="p-4 border rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <h2 className="text-xl font-semibold mb-4">5. Resultados de Caja</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <select value={boxType} onChange={e => setBoxType(e.target.value)} className="p-2 rounded border dark:bg-zinc-700">
                <option value="with-lid">Caja con Tapa</option>
                <option value="without-lid">Caja sin Tapa</option>
              </select>
              <input type="number" placeholder="Margen Alto" value={heightMargin} onChange={e => setHeightMargin(e.target.value)} className="p-2 rounded border dark:bg-zinc-700"/>
            </div>

            {results ? (
              <div className="space-y-4 border-t pt-4 dark:border-zinc-700">
                <div className="text-sm grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white dark:bg-zinc-800 p-2 rounded shadow-sm">
                    <p className="text-zinc-500">Ancho Int.</p>
                    <p className="font-bold">{results.innerWidth.toFixed(1)} cm</p>
                  </div>
                  <div className="bg-white dark:bg-zinc-800 p-2 rounded shadow-sm">
                    <p className="text-zinc-500">Largo Int.</p>
                    <p className="font-bold">{results.innerLength.toFixed(1)} cm</p>
                  </div>
                  <div className="bg-white dark:bg-zinc-800 p-2 rounded shadow-sm">
                    <p className="text-zinc-500">Alto Int.</p>
                    <p className="font-bold">{results.innerHeight.toFixed(1)} cm</p>
                  </div>
                </div>

                <div className="p-3 bg-blue-600 text-white rounded-lg text-center">
                  <p className="text-xs uppercase font-bold opacity-80">Plancha Base</p>
                  <p className="text-2xl font-mono">{results.baseCutWidth.toFixed(1)} x {results.baseCutLength.toFixed(1)} cm</p>
                </div>

                {results.lidCutWidth && results.lidCutLength && (
                  <div className="p-3 bg-purple-600 text-white rounded-lg text-center">
                    <p className="text-xs uppercase font-bold opacity-80">Plancha Tapa</p>
                    <p className="text-2xl font-mono">
                      {results.lidCutWidth.toFixed(1)} x {results.lidCutLength.toFixed(1)} cm
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-zinc-500 py-8">Coloca productos para calcular.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}