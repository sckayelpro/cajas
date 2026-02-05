"use client";

import { useState, useMemo, useEffect } from "react";
import { Product, CalculationResults } from "../types";
import { 
  Box, Ruler, Trash2, RotateCw, Copy, ChevronsRight, 
  ChevronsDown, Eraser, Save, FolderOpen, Edit2, Plus, Info 
} from "lucide-react";

// --- TIPOS ---
type ProductTemplate = Product;

interface PlacedProduct {
  instanceId: string;
  template: ProductTemplate;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

interface SavedBox {
  id: string;
  name: string;
  rows: number;
  cols: number;
  placedProducts: PlacedProduct[];
  boxType: string;
  heightMargin: string;
  lidHeight: string;
  lidMargin: string;
}

interface ExtendedResults extends CalculationResults {
  internalLidCutWidth?: number;
  internalLidCutLength?: number;
}

const INITIAL_TEMPLATES: ProductTemplate[] = [
  { id: "1", name: "Dona", width: 10, length: 10, height: 4 },
  { id: "2", name: "Café", width: 8, length: 8, height: 12 },
  { id: "3", name: "Jugo", width: 5.5, length: 5.5, height: 15 },
  { id: "4", name: "Sandwich", width: 12, length: 12, height: 6 },
];

export function BoxCalculator() {
  const SCALE = 8;

  // --- ESTADOS ---
  const [productTemplates, setProductTemplates] = useState<ProductTemplate[]>([]);
  const [savedBoxes, setSavedBoxes] = useState<SavedBox[]>([]);
  const [currentBoxName, setCurrentBoxName] = useState("");
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(5);
  const [placedProducts, setPlacedProducts] = useState<PlacedProduct[]>([]);
  const [boxType, setBoxType] = useState("with-lid");
  const [heightMargin, setHeightMargin] = useState("1.5");
  const [lidHeight, setLidHeight] = useState("3");
  const [lidMargin, setLidMargin] = useState("0.3");
  const [newProduct, setNewProduct] = useState({ id: "", name: "", width: "", length: "", height: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  const [colSpan, setColSpan] = useState(1);
  const [rowSpan, setRowSpan] = useState(1);
  const [results, setResults] = useState<ExtendedResults | null>(null);

  // --- PERSISTENCIA ---
  useEffect(() => {
    const storedTemplates = localStorage.getItem("box_templates");
    const storedBoxes = localStorage.getItem("saved_boxes");
    setProductTemplates(storedTemplates ? JSON.parse(storedTemplates) : INITIAL_TEMPLATES);
    if (storedBoxes) setSavedBoxes(JSON.parse(storedBoxes));
  }, []);

  useEffect(() => {
    if (productTemplates.length > 0) localStorage.setItem("box_templates", JSON.stringify(productTemplates));
  }, [productTemplates]);

  useEffect(() => {
    localStorage.setItem("saved_boxes", JSON.stringify(savedBoxes));
  }, [savedBoxes]);

  // --- LÓGICA ---
  const handleSaveTemplate = () => {
    if (!newProduct.name || !newProduct.width) return;
    const templateData: ProductTemplate = {
      id: isEditing ? newProduct.id : new Date().toISOString(),
      name: newProduct.name,
      width: parseFloat(newProduct.width),
      length: parseFloat(newProduct.length),
      height: parseFloat(newProduct.height),
    };

    if (isEditing) {
      setProductTemplates(prev => prev.map(t => t.id === templateData.id ? templateData : t));
      setPlacedProducts(prev => prev.map(p => p.template.id === templateData.id ? { ...p, template: templateData } : p));
    } else {
      setProductTemplates([...productTemplates, templateData]);
    }
    setNewProduct({ id: "", name: "", width: "", length: "", height: "" });
    setIsEditing(false);
  };

  const startEdit = (t: ProductTemplate) => {
    setNewProduct({ id: t.id, name: t.name, width: t.width.toString(), length: t.length.toString(), height: t.height.toString() });
    setIsEditing(true);
  };

  const handleSaveCurrentBox = () => {
    if (!currentBoxName) { alert("Ponle un nombre a tu diseño"); return; }
    const newBox: SavedBox = {
      id: new Date().toISOString(),
      name: currentBoxName,
      rows, cols, placedProducts, boxType, heightMargin, lidHeight, lidMargin
    };
    setSavedBoxes([newBox, ...savedBoxes.filter(b => b.name !== currentBoxName)]);
    alert("¡Diseño guardado!");
  };

  const loadSavedBox = (box: SavedBox) => {
    setRows(box.rows); setCols(box.cols); setPlacedProducts(box.placedProducts);
    setBoxType(box.boxType); setHeightMargin(box.heightMargin);
    setLidHeight(box.lidHeight); setLidMargin(box.lidMargin);
    setCurrentBoxName(box.name);
  };

  const { colWidths, rowLengths, totalInnerWidth, totalInnerLength, maxHeight } = useMemo(() => {
    const widths = Array(cols).fill(0); 
    const lengths = Array(rows).fill(0);

    placedProducts.forEach(p => {
      const wPerCol = p.template.width / p.colSpan;
      for (let i = 0; i < p.colSpan; i++) if (p.col + i < cols) widths[p.col + i] = Math.max(widths[p.col + i], wPerCol);
      const lPerRow = p.template.length / p.rowSpan;
      for (let i = 0; i < p.rowSpan; i++) if (p.row + i < rows) lengths[p.row + i] = Math.max(lengths[p.row + i], lPerRow);
    });

    return {
      colWidths: widths, rowLengths: lengths,
      totalInnerWidth: widths.reduce((a, b) => a + b, 0),
      totalInnerLength: lengths.reduce((a, b) => a + b, 0),
      maxHeight: Math.max(0, ...placedProducts.map(p => p.template.height), 0)
    };
  }, [placedProducts, rows, cols]);

  useEffect(() => {
    if (placedProducts.length === 0) { setResults(null); return; }
    
    const iH = maxHeight + parseFloat(heightMargin || "0");
    const bW = totalInnerWidth + 2 * iH;
    const bL = totalInnerLength + 2 * iH;
    
    let lW, lL, intLW, intLL;

    if (boxType === "with-lid") {
      const fH = parseFloat(lidHeight || "0"), fM = parseFloat(lidMargin || "0");
      lW = (totalInnerWidth + fM) + 2 * fH; 
      lL = (totalInnerLength + fM) + 2 * fH;
    }

    if (boxType === "internal-half-lid") {
      const targetWidth = totalInnerWidth - 0.2; 
      const targetLength = totalInnerLength - 0.2;
      const targetHeight = iH - 0.1; 
      intLW = targetWidth + 2 * targetHeight;
      intLL = targetLength + 2 * targetHeight;
    }

    setResults({ 
      innerWidth: totalInnerWidth, innerLength: totalInnerLength, innerHeight: iH, 
      baseCutWidth: bW, baseCutLength: bL, lidCutWidth: lW, lidCutLength: lL,
      internalLidCutWidth: intLW, internalLidCutLength: intLL
    });
  }, [totalInnerWidth, totalInnerLength, maxHeight, boxType, heightMargin, lidHeight, lidMargin, placedProducts]);

  const handleCellClick = (r: number, c: number) => {
    if (!selectedTemplate) return;
    if ((r + rowSpan) > rows || (c + colSpan) > cols) return;
    if (placedProducts.some(p => (c < p.col + p.colSpan && c + colSpan > p.col) && (r < p.row + p.rowSpan && r + rowSpan > p.row))) return;
    setPlacedProducts([...placedProducts, { instanceId: Date.now().toString(), template: selectedTemplate, row: r, col: c, rowSpan, colSpan }]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 bg-zinc-50 dark:bg-zinc-950 min-h-screen text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-black flex items-center gap-3 italic text-blue-600 dark:text-blue-500"><Box size={36}/> BOX MASTER 2026</h1>
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-lg shadow-sm border dark:border-zinc-800">
          <input type="text" placeholder="Nombre de esta caja..." value={currentBoxName} onChange={e => setCurrentBoxName(e.target.value)} className="bg-transparent border-none outline-none text-sm w-48"/>
          <button onClick={handleSaveCurrentBox} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors"><Save size={16}/> Guardar</button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* PANEL IZQUIERDO */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">{isEditing ? <Edit2 size={18}/> : <Plus size={18}/>} {isEditing ? "Editar" : "Nuevo Producto"}</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Nombre..." value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border-none text-sm"/>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="An" value={newProduct.width} onChange={e => setNewProduct({...newProduct, width: e.target.value})} className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border-none text-xs text-center"/>
                <input type="number" placeholder="La" value={newProduct.length} onChange={e => setNewProduct({...newProduct, length: e.target.value})} className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border-none text-xs text-center"/>
                <input type="number" placeholder="Al" value={newProduct.height} onChange={e => setNewProduct({...newProduct, height: e.target.value})} className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 border-none text-xs text-center"/>
              </div>
              <button onClick={handleSaveTemplate} className="w-full bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white p-2 rounded-md text-sm font-bold">{isEditing ? "Actualizar" : "Crear"}</button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
            <h2 className="text-lg font-bold mb-4 text-zinc-400 font-mono uppercase tracking-tighter">Biblioteca</h2>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {productTemplates.map(t => (
                <div key={t.id} className={`group relative p-2 rounded-lg border-2 transition-all ${selectedTemplate?.id === t.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-zinc-100 dark:border-zinc-800'}`}>
                  <div onClick={() => setSelectedTemplate(t)} className="cursor-pointer">
                    <p className="font-bold text-xs truncate uppercase">{t.name}</p>
                    <p className="text-[10px] opacity-60">{t.width}x{t.length}cm</p>
                  </div>
                  <div className="absolute top-1 right-1 hidden group-hover:flex gap-1 bg-white dark:bg-zinc-800 rounded p-1 shadow-sm">
                    <button onClick={() => startEdit(t)} className="text-blue-500"><Edit2 size={12}/></button>
                    <button onClick={() => setProductTemplates(prev => prev.filter(p => p.id !== t.id))} className="text-red-500"><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FolderOpen size={18}/> Mis Diseños</h2>
            <div className="space-y-2">
              {savedBoxes.length === 0 && <p className="text-xs text-zinc-500 italic">No hay diseños guardados.</p>}
              {savedBoxes.map(box => (
                <div key={box.id} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg group">
                  <button onClick={() => loadSavedBox(box)} className="text-sm font-medium hover:text-blue-600 truncate">{box.name}</button>
                  <button onClick={() => setSavedBoxes(prev => prev.filter(b => b.id !== box.id))} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border dark:border-zinc-800 shadow-xl">
            <div className="flex justify-between items-end mb-6">
              <div className="flex gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Cuadrícula</p>
                  <div className="flex gap-1">
                    <input type="number" value={rows} onChange={e => setRows(Number(e.target.value))} className="w-10 p-1 bg-zinc-100 dark:bg-zinc-800 rounded text-center text-xs font-bold"/>
                    <span className="opacity-30">×</span>
                    <input type="number" value={cols} onChange={e => setCols(Number(e.target.value))} className="w-10 p-1 bg-zinc-100 dark:bg-zinc-800 rounded text-center text-xs font-bold"/>
                  </div>
                </div>
                {selectedTemplate && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-blue-500">Expansión: {selectedTemplate.name}</p>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 text-[10px]"><ChevronsRight size={14}/> <input type="number" min="1" value={colSpan} onChange={e => setColSpan(Number(e.target.value))} className="w-8 bg-blue-50 dark:bg-blue-900/30 rounded text-center"/></label>
                      <label className="flex items-center gap-1 text-[10px]"><ChevronsDown size={14}/> <input type="number" min="1" value={rowSpan} onChange={e => setRowSpan(Number(e.target.value))} className="w-8 bg-blue-50 dark:bg-blue-900/30 rounded text-center"/></label>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setPlacedProducts([])} className="text-xs text-red-500 flex items-center gap-1"><Eraser size={14}/> Borrar</button>
            </div>

            <div 
              className="grid gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl overflow-auto"
              style={{
                gridTemplateColumns: colWidths.map(w => `${Math.max(w, 5) * SCALE}px`).join(' '),
                gridTemplateRows: rowLengths.map(l => `${Math.max(l, 5) * SCALE}px`).join(' '),
                width: 'fit-content',
                minWidth: '100%'
              }}
            >
              {Array.from({ length: rows * cols }).map((_, i) => {
                const r = Math.floor(i / cols), c = i % cols;
                return <div key={`c-${r}-${c}`} onClick={() => handleCellClick(r, c)} className="bg-white dark:bg-zinc-700/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-crosshair min-h-[40px] rounded-sm transition-colors"/>;
              })}
              {placedProducts.map(p => (
                <div key={p.instanceId} onClick={() => setPlacedProducts(prev => prev.filter(x => x.instanceId !== p.instanceId))} className="flex flex-col items-center justify-center p-1 rounded-md border-2 border-blue-600 bg-blue-600 text-white z-10 cursor-pointer shadow-lg overflow-hidden"
                  style={{ gridRowStart: p.row + 1, gridColumnStart: p.col + 1, gridRowEnd: `span ${p.rowSpan}`, gridColumnEnd: `span ${p.colSpan}` }}>
                  <p className="font-black text-[9px] uppercase leading-tight truncate w-full text-center">{p.template.name}</p>
                  <p className="text-[8px] opacity-80">{p.template.width}x{p.template.length}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RESULTADOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Ruler size={16}/> Configuración</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400">Tipo de Empaque</label>
                  <select value={boxType} onChange={e => setBoxType(e.target.value)} className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm border-none font-bold">
                    <option value="with-lid">Base + Tapa Estándar</option>
                    <option value="without-lid">Sólo Base</option>
                    <option value="internal-half-lid">Base + Media Tapa Interna</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400">Margen Base</label>
                  <input type="number" value={heightMargin} onChange={e => setHeightMargin(e.target.value)} className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm border-none"/>
                </div>
                {boxType === 'with-lid' && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Alto Tapa</label>
                    <input type="number" value={lidHeight} onChange={e => setLidHeight(e.target.value)} className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm border-none"/>
                  </div>
                )}
              </div>
              {boxType === 'internal-half-lid' && (
                <div className="mt-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-2 items-start text-blue-800 dark:text-blue-300">
                  <Info size={14} className="mt-1 flex-shrink-0"/>
                  <p className="text-[10px] leading-tight">
                    <strong>Media Tapa:</strong> Calculada con -0.2 cm de holgura y altura al ras (-0.1 cm).
                  </p>
                </div>
              )}
            </div>

            <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 p-6 rounded-xl shadow-2xl">
              {results ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-zinc-700 dark:border-zinc-300 pb-2">
                    <p className="text-[10px] uppercase font-black opacity-60">Medida Interior</p>
                    <p className="font-mono text-lg leading-none">{results.innerWidth.toFixed(1)}×{results.innerLength.toFixed(1)}×{results.innerHeight.toFixed(1)} cm</p>
                  </div>
                  
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-blue-400 dark:text-blue-600 mb-1">Plancha Base</p>
                    <p className="text-3xl font-black font-mono">{results.baseCutWidth.toFixed(1)} × {results.baseCutLength.toFixed(1)} <span className="text-xs uppercase">cm</span></p>
                  </div>

                  {results.lidCutWidth && results.lidCutLength && (
                    <div className="animate-in fade-in">
                      <p className="text-[10px] uppercase font-black tracking-widest text-purple-400 dark:text-purple-600 mb-1">Tapa Estándar</p>
                      <p className="text-2xl font-black font-mono">{results.lidCutWidth.toFixed(1)} × {results.lidCutLength.toFixed(1)} <span className="text-xs uppercase">cm</span></p>
                    </div>
                  )}

                  {results.internalLidCutWidth && results.internalLidCutLength && (
                    <div className="p-3 bg-blue-600 text-white rounded-lg shadow-inner">
                      <p className="text-[10px] uppercase font-black tracking-widest text-blue-200 mb-1">Media Tapa Interna</p>
                      <p className="text-2xl font-black font-mono">{results.internalLidCutWidth.toFixed(1)} × {results.internalLidCutLength.toFixed(1)} <span className="text-xs uppercase">cm</span></p>
                      <p className="text-[9px] mt-1 opacity-80 italic italic">
                        Usa pestañas de {(results.innerHeight - 0.1).toFixed(1)} cm
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center opacity-30 text-sm italic">Añade productos al lienzo...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}