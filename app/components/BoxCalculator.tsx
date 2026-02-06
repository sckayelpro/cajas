"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Box, Ruler, Trash2, RotateCw, Copy, ChevronsRight, 
  ChevronsDown, Eraser, Save, FolderOpen, Edit2, Plus, Info, Layout, Scissors,
  Search, Cookie, Coffee, CupSoda, Sandwich, Dessert, Circle, Hash, Layers, Banknote
} from "lucide-react";

// --- TIPOS ---
interface Product {
  id: string;
  name: string;
  width: number;
  length: number;
  height: number;
  icon?: string;
}

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

interface CalculationResults {
  innerWidth: number;
  innerLength: number;
  innerHeight: number;
  baseCutWidth: number;
  baseCutLength: number;
  lidCutWidth?: number;
  lidCutLength?: number;
  internalLidCutWidth?: number;
  internalLidCutLength?: number;
}

// --- CONSTANTES ---
const SHEET_W = 110;
const SHEET_L = 77;
const SHEET_PRICE = 6; // Precio en Bs.

const ICON_MAP: Record<string, any> = {
  donut: Circle,
  dessert: Dessert,
  coffee: Coffee,
  cookie: Cookie,
  juice: CupSoda,
  sandwich: Sandwich,
  default: Box
};

const DEFAULT_PRODUCTS: ProductTemplate[] = [
  { id: "d-1", name: "DONA", width: 10, length: 10, height: 4, icon: "donut" },
  { id: "d-2", name: "CROISSANT", width: 10.5, length: 10.5, height: 5.5, icon: "dessert" },
  { id: "d-3", name: "ROLL DE CANELA", width: 10, length: 10, height: 5, icon: "dessert" },
  { id: "d-4", name: "BROWNIE", width: 10, length: 10, height: 4, icon: "dessert" },
  { id: "d-5", name: "CAFÉ", width: 10, length: 10, height: 5.5, icon: "coffee" },
  { id: "d-6", name: "TRUFA", width: 4, length: 4, height: 4, icon: "donut" },
  { id: "d-7", name: "ALFAJOR", width: 8, length: 8, height: 4, icon: "dessert" },
  { id: "d-8", name: "GALLETA RED VELVET", width: 4, length: 10, height: 2, icon: "cookie" },
  { id: "d-9", name: "GALLETA CHISPAS", width: 4, length: 10, height: 2, icon: "cookie" },
  { id: "d-10", name: "PALITO DE QUESO", width: 3, length: 12, height: 3, icon: "default" },
  { id: "d-11", name: "JUGO", width: 5.5, length: 15, height: 5.5, icon: "juice" },
  { id: "d-12", name: "SANDWICH", width: 10.5, length: 10.5, height: 3, icon: "sandwich" },
];

// --- COMPONENTES AUXILIARES ---

function ProductIcon({ name, size = 16, className = "" }: { name?: string, size?: number, className?: string }) {
  const IconComponent = ICON_MAP[name || "default"] || ICON_MAP.default;
  return <IconComponent size={size} className={className} />;
}

function getOptimization(pw: number, pl: number) {
  if (pw <= 0 || pl <= 0) return null;
  const areaSheet = SHEET_W * SHEET_L;
  const nx = Math.floor(SHEET_W / pw);
  const ny = Math.floor(SHEET_L / pl);
  const totalNormal = nx * ny;
  const rx = Math.floor(SHEET_W / pl);
  const ry = Math.floor(SHEET_L / pw);
  const totalRotated = rx * ry;
  const useRotated = totalRotated > totalNormal;
  const bestTotal = useRotated ? totalRotated : totalNormal;
  const finalW = useRotated ? pl : pw;
  const finalL = useRotated ? pw : pl;
  const countX = useRotated ? rx : nx;
  const countY = useRotated ? ry : ny;
  const efficiency = ((bestTotal * pw * pl) / areaSheet) * 100;
  return { bestTotal, useRotated, finalW, finalL, countX, countY, efficiency };
}

function SheetLayoutView({ pw, pl, colorClass }: { pw: number, pl: number, colorClass: string }) {
  const opt = getOptimization(pw, pl);
  if (!opt || opt.bestTotal === 0) return null;
  const svgScale = 2;
  return (
    <div className="mt-4 p-4 bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colorClass.replace('text-', 'bg-')}`}></div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Pliego (110x77)</span>
        </div>
        <span className="text-[10px] font-black text-green-400 bg-green-400/10 px-2 py-0.5 rounded">{opt.efficiency.toFixed(1)}% USO</span>
      </div>
      <div className="relative bg-black rounded border border-zinc-800 overflow-hidden">
        <svg viewBox={`0 0 ${SHEET_W * svgScale} ${SHEET_L * svgScale}`} className="w-full h-auto">
          <rect width={SHEET_W * svgScale} height={SHEET_L * svgScale} fill="#09090b" />
          {Array.from({ length: opt.countY }).map((_, y) => 
            Array.from({ length: opt.countX }).map((_, x) => (
              <rect key={`${x}-${y}`} x={x * opt.finalW * svgScale} y={y * opt.finalL * svgScale} width={opt.finalW * svgScale} height={opt.finalL * svgScale} className={`${colorClass.replace('text-', 'fill-')} opacity-40`} stroke="white" strokeWidth="0.5" />
            ))
          )}
        </svg>
      </div>
      <div className="flex justify-between mt-3">
        <p className="text-[10px] text-zinc-400 font-bold"><span className="text-white">{opt.bestTotal}</span> unidades / pliego</p>
      </div>
    </div>
  );
}

function PlanchaDiagram({ width, length, flap, label, colorClass }: { width: number, length: number, flap: number, label: string, colorClass: string }) {
  const viewScale = 2;
  const pw = width + (flap * 2);
  const pl = length + (flap * 2);
  return (
    <div className="flex flex-col gap-2 p-5 bg-zinc-800/30 rounded-2xl border border-zinc-700/50 shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <p className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">{label}</p>
        <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[11px] font-mono text-white flex items-center gap-2">
          <Scissors size={14} className="text-zinc-500" />
          <strong>{pw.toFixed(1)}</strong> x <strong>{pl.toFixed(1)}</strong> cm
        </div>
      </div>
      <svg viewBox={`-60 -20 ${(pw * viewScale) + 80} ${(pl * viewScale) + 60}`} className={`w-full max-w-[280px] mx-auto h-auto ${colorClass} fill-current`}>
        <g className="opacity-30">
          <rect x={flap * viewScale} y={flap * viewScale} width={width * viewScale} height={length * viewScale} />
          <rect x={0} y={flap * viewScale} width={flap * viewScale} height={length * viewScale} />
          <rect x={(flap + width) * viewScale} y={flap * viewScale} width={flap * viewScale} height={length * viewScale} />
          <rect x={flap * viewScale} y={0} width={width * viewScale} height={flap * viewScale} />
          <rect x={flap * viewScale} y={(flap + length) * viewScale} width={width * viewScale} height={flap * viewScale} />
        </g>
        <g className="fill-none stroke-white stroke-[0.8] opacity-60">
          <rect x={flap * viewScale} y={flap * viewScale} width={width * viewScale} height={length * viewScale} />
          <rect x={0} y={0} width={pw * viewScale} height={pl * viewScale} />
        </g>
        <text x={-25} y={(pl * viewScale) / 2} transform={`rotate(-90, -25, ${(pl * viewScale) / 2})`} fill="white" className="font-mono font-black" style={{ fontSize: '16px' }} textAnchor="middle">{pl.toFixed(1)}</text>
        <text x={(pw * viewScale) / 2} y={(pl * viewScale) + 40} fill="white" className="font-mono font-black" style={{ fontSize: '16px' }} textAnchor="middle">{pw.toFixed(1)}</text>
      </svg>
      <SheetLayoutView pw={pw} pl={pl} colorClass={colorClass} />
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---

export function BoxCalculator() {
  const SCALE = 8;

  // Estados
  const [productTemplates, setProductTemplates] = useState<ProductTemplate[]>([]);
  const [savedBoxes, setSavedBoxes] = useState<SavedBox[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentBoxName, setCurrentBoxName] = useState("");
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(5);
  const [placedProducts, setPlacedProducts] = useState<PlacedProduct[]>([]);
  const [boxType, setBoxType] = useState("with-lid");
  const [heightMargin, setHeightMargin] = useState("1.5");
  const [lidHeight, setLidHeight] = useState("3");
  const [lidMargin, setLidMargin] = useState("0.3");
  const [productionQuantity, setProductionQuantity] = useState(50);
  
  const [newProduct, setNewProduct] = useState({ id: "", name: "", width: "", length: "", height: "", icon: "default" });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  const [colSpan, setColSpan] = useState(1);
  const [rowSpan, setRowSpan] = useState(1);
  const [results, setResults] = useState<CalculationResults | null>(null);

  // Persistencia
  useEffect(() => {
    const storedT = localStorage.getItem("box_templates_v3");
    const storedB = localStorage.getItem("saved_boxes_v3");
    if (storedT) {
      setProductTemplates(JSON.parse(storedT));
    } else {
      setProductTemplates(DEFAULT_PRODUCTS);
      localStorage.setItem("box_templates_v3", JSON.stringify(DEFAULT_PRODUCTS));
    }
    if (storedB) setSavedBoxes(JSON.parse(storedB));
  }, []);

  useEffect(() => {
    localStorage.setItem("box_templates_v3", JSON.stringify(productTemplates));
    localStorage.setItem("saved_boxes_v3", JSON.stringify(savedBoxes));
  }, [productTemplates, savedBoxes]);

  const filteredProducts = useMemo(() => {
    return productTemplates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [productTemplates, searchTerm]);
// CARGAR CAJA GUARDADA
const loadBox = (box: SavedBox) => {
  setRows(box.rows);
  setCols(box.cols);
  setPlacedProducts(box.placedProducts);
  setBoxType(box.boxType);
  setHeightMargin(box.heightMargin);
  setLidHeight(box.lidHeight);
  setLidMargin(box.lidMargin);
  setCurrentBoxName(box.name);
};
 // CÁLCULOS TÉCNICOS
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
      lW = (totalInnerWidth + fM) + 2 * fH; lL = (totalInnerLength + fM) + 2 * fH;
    }
    if (boxType === "internal-half-lid") {
      const tW = totalInnerWidth - 0.2, tL = totalInnerLength - 0.2, tH = iH - 0.1;
      intLW = tW + 2 * tH; intLL = tL + 2 * tH;
    }
    setResults({ innerWidth: totalInnerWidth, innerLength: totalInnerLength, innerHeight: iH, baseCutWidth: bW, baseCutLength: bL, lidCutWidth: lW, lidCutLength: lL, internalLidCutWidth: intLW, internalLidCutLength: intLL });
  }, [totalInnerWidth, totalInnerLength, maxHeight, boxType, heightMargin, lidHeight, lidMargin, placedProducts]);

  // LÓGICA DE PRODUCCIÓN Y COSTOS
  const productionSummary = useMemo(() => {
    if (!results) return null;

    const baseOpt = getOptimization(results.baseCutWidth, results.baseCutLength);
    const basesPerSheet = baseOpt?.bestTotal || 0;
    const sheetsForBases = basesPerSheet > 0 ? Math.ceil(productionQuantity / basesPerSheet) : 0;
    const unitCostBase = basesPerSheet > 0 ? SHEET_PRICE / basesPerSheet : 0;

    let lidsPerSheet = 0;
    let sheetsForLids = 0;
    let unitCostLid = 0;
    let labelTapa = "Tapa";

    if (boxType === "with-lid" && results.lidCutWidth && results.lidCutLength) {
      const lidOpt = getOptimization(results.lidCutWidth, results.lidCutLength);
      lidsPerSheet = lidOpt?.bestTotal || 0;
      sheetsForLids = lidsPerSheet > 0 ? Math.ceil(productionQuantity / lidsPerSheet) : 0;
      unitCostLid = lidsPerSheet > 0 ? SHEET_PRICE / lidsPerSheet : 0;
    } else if (boxType === "internal-half-lid" && results.internalLidCutWidth && results.internalLidCutLength) {
      const lidOpt = getOptimization(results.internalLidCutWidth, results.internalLidCutLength);
      lidsPerSheet = lidOpt?.bestTotal || 0;
      sheetsForLids = lidsPerSheet > 0 ? Math.ceil(productionQuantity / lidsPerSheet) : 0;
      unitCostLid = lidsPerSheet > 0 ? SHEET_PRICE / lidsPerSheet : 0;
      labelTapa = "Tapa Interna";
    }

    const totalBoxCost = unitCostBase + unitCostLid;
    const totalOrderCost = (sheetsForBases + sheetsForLids) * SHEET_PRICE;

    return {
      basesPerSheet, sheetsForBases, unitCostBase,
      lidsPerSheet, sheetsForLids, unitCostLid, labelTapa,
      totalBoxCost, totalOrderCost, totalSheets: sheetsForBases + sheetsForLids
    };
  }, [results, productionQuantity, boxType]);

  const handleCellClick = (r_idx: number, c_idx: number) => {
    if (!selectedTemplate) return;
    if ((r_idx + rowSpan) > rows || (c_idx + colSpan) > cols) return;
    const isOccupied = placedProducts.some(p => (c_idx < p.col + p.colSpan && c_idx + colSpan > p.col) && (r_idx < p.row + p.rowSpan && r_idx + rowSpan > p.row));
    if (isOccupied) return;
    setPlacedProducts([...placedProducts, { instanceId: Date.now().toString(), template: selectedTemplate, row: r_idx, col: c_idx, rowSpan, colSpan }]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 bg-zinc-950 min-h-screen text-zinc-100 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20"><Box size={32} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Box Master <span className="text-blue-500">PRO</span></h1>
            <p className="text-[10px] text-zinc-500 font-black tracking-[0.2em] uppercase">Distribución Óptima 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 shadow-xl">
          <input type="text" placeholder="NOMBRE DEL DISEÑO..." value={currentBoxName} onChange={e => setCurrentBoxName(e.target.value)} className="bg-transparent border-none outline-none text-xs px-4 w-48 font-black uppercase placeholder:text-zinc-700" />
          <button onClick={() => {
            if (!currentBoxName) return alert("Nombra el diseño");
            setSavedBoxes([{ id: Date.now().toString(), name: currentBoxName, rows, cols, placedProducts, boxType, heightMargin, lidHeight, lidMargin }, ...savedBoxes]);
            alert("¡Diseño guardado!");
          }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"><Save size={16} /> GUARDAR</button>
        </div>
      </header>
{/* SECCIÓN: DISEÑOS GUARDADOS (CORREGIDO) */}
<div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
            <h2 className="text-xs font-black uppercase text-blue-500 mb-4 tracking-widest flex items-center gap-2"><FolderOpen size={16}/> Mis Diseños Guardados</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
              {savedBoxes.length === 0 && <p className="text-[10px] text-zinc-600 italic text-center py-4">No hay diseños aún</p>}
              {savedBoxes.map(box => (
                <div key={box.id} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-zinc-800 group hover:border-blue-500/50 transition-all">
                  <button onClick={() => loadBox(box)} className="text-[11px] font-black uppercase truncate text-left flex-1">{box.name}</button>
                  <button onClick={() => setSavedBoxes(prev => prev.filter(b => b.id !== box.id))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-6">
          {/* CALCULADORA DE PRODUCCIÓN Y COSTOS */}
          {results && productionSummary && (
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2rem] shadow-2xl border border-blue-400/30 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em] flex items-center gap-2"><Banknote size={18} /> Resumen Financiero</h2>
                <span className="text-[10px] font-black bg-black/20 px-2 py-1 rounded">PLIEGO: 6 Bs.</span>
              </div>
              
              <div className="bg-black/20 p-4 rounded-2xl space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-blue-100 opacity-60">Cantidad a producir</label>
                  <input type="number" value={productionQuantity} onChange={e => setProductionQuantity(Math.max(1, Number(e.target.value)))} className="bg-transparent text-2xl font-black outline-none w-full text-white" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black uppercase text-blue-200">Costo Base Unit.</p>
                    <p className="text-xs font-black">{productionSummary.unitCostBase.toFixed(2)} Bs.</p>
                  </div>
                  {productionSummary.unitCostLid > 0 && (
                    <div className="space-y-0.5 text-right border-l border-white/10 pl-4">
                      <p className="text-[9px] font-black uppercase text-blue-200">Costo {productionSummary.labelTapa} Unit.</p>
                      <p className="text-xs font-black">{productionSummary.unitCostLid.toFixed(2)} Bs.</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black uppercase text-white/70">Costo Material p/ Caja:</span>
                  <span className="text-lg font-black text-white">{productionSummary.totalBoxCost.toFixed(2)} Bs.</span>
                </div>

                <div className="h-px bg-white/10 my-1" />

                <div className="bg-white text-blue-900 p-4 rounded-2xl flex justify-between items-center shadow-lg">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black uppercase opacity-60">Total Inversión Material</p>
                    <p className="text-[10px] font-bold">{productionSummary.totalSheets} Pliegos necesarios</p>
                  </div>
                  <p className="text-2xl font-black">{productionSummary.totalOrderCost.toFixed(1)} <span className="text-xs uppercase">Bs.</span></p>
                </div>
              </div>
            </div>
          )}

          {/* BIBLIOTECA - SE MANTIENE IGUAL */}
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm space-y-4">
            <h2 className="text-xs font-black uppercase text-blue-500 tracking-[0.2em] flex items-center gap-2"><FolderOpen size={16} /> Biblioteca</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input type="text" placeholder="BUSCAR..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-all uppercase" />
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2 scrollbar-hide">
              {filteredProducts.map(t => (
                <div key={t.id} onClick={() => setSelectedTemplate(t)} className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${selectedTemplate?.id === t.id ? 'border-blue-600 bg-blue-600/10' : 'border-zinc-800 hover:border-zinc-700 bg-black/40'}`}>
                  <div className={`p-2 rounded-lg ${selectedTemplate?.id === t.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    <ProductIcon name={t.icon} />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-xs uppercase tracking-tight">{t.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{t.width}×{t.length}×{t.height} CM</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FORMULARIO NUEVO PRODUCTO */}
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
            <h2 className="text-xs font-black uppercase text-zinc-500 mb-6 tracking-[0.2em]">Añadir Producto</h2>
            <div className="space-y-4">
              <input type="text" placeholder="NOMBRE..." value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full p-4 rounded-2xl bg-black border border-zinc-800 text-sm font-bold outline-none uppercase" />
              <div className="grid grid-cols-3 gap-3">
                {['Ancho', 'Largo', 'Alto'].map((label, i) => (
                  <div key={label} className="space-y-2 text-center">
                    <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">{label}</span>
                    <input type="number" value={[newProduct.width, newProduct.length, newProduct.height][i]} onChange={e => {
                      const keys = ["width", "length", "height"] as const;
                      setNewProduct({ ...newProduct, [keys[i]]: e.target.value });
                    }} className="w-full p-3 rounded-xl bg-black border border-zinc-800 text-xs text-center font-black" />
                  </div>
                ))}
              </div>
              <button onClick={() => {
                if (!newProduct.name || !newProduct.width) return;
                const templateData = { id: isEditing ? newProduct.id : Date.now().toString(), name: newProduct.name, width: parseFloat(newProduct.width), length: parseFloat(newProduct.length), height: parseFloat(newProduct.height), icon: newProduct.icon };
                isEditing ? setProductTemplates(prev => prev.map(t => t.id === templateData.id ? templateData : t)) : setProductTemplates([...productTemplates, templateData]);
                setNewProduct({ id: "", name: "", width: "", length: "", height: "", icon: "default" }); setIsEditing(false);
              }} className="w-full bg-zinc-100 text-black p-4 rounded-2xl text-xs font-black uppercase tracking-[0.15em] hover:bg-white transition-all shadow-lg">AÑADIR A BIBLIOTECA</button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 space-y-6">
          <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-2xl relative overflow-hidden">
            <div className="flex flex-wrap justify-between items-end mb-8 gap-6">
              <div className="flex gap-8">
                <div className="space-y-2">
                  <p className="text-[9px] uppercase font-black text-zinc-600 tracking-[0.2em]">Celdas Caja</p>
                  <div className="flex gap-2 items-center bg-black p-1 px-3 rounded-xl border border-zinc-800 font-black">
                    <input type="number" value={rows} onChange={e => setRows(Number(e.target.value))} className="w-8 bg-transparent text-center text-xs outline-none text-blue-500" />
                    <span className="opacity-20 text-[10px]">×</span>
                    <input type="number" value={cols} onChange={e => setCols(Number(e.target.value))} className="w-8 bg-transparent text-center text-xs outline-none text-blue-500" />
                  </div>
                </div>
              </div>
              <button onClick={() => setPlacedProducts([])} className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all border border-transparent hover:border-red-500/20"><Eraser size={14} /> Limpiar Lienzo</button>
            </div>

            <div className="grid gap-1.5 bg-black p-2 rounded-3xl overflow-auto min-h-[300px]"
              style={{ gridTemplateColumns: colWidths.map(w => `${Math.max(w, 5) * SCALE}px`).join(' '), gridTemplateRows: rowLengths.map(l => `${Math.max(l, 5) * SCALE}px`).join(' '), width: 'fit-content', minWidth: '100%' }}>
              {Array.from({ length: rows * cols }).map((_, i) => {
                const r = Math.floor(i / cols), c = i % cols;
                return <div key={`c-${r}-${c}`} onClick={() => handleCellClick(r, c)} className="bg-zinc-900/40 hover:bg-zinc-800 cursor-crosshair min-h-[50px] rounded-xl transition-all border border-zinc-800/50" style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }} />;
              })}
              {placedProducts.map(p => (
                <div key={p.instanceId} onClick={() => setPlacedProducts(prev => prev.filter(x => x.instanceId !== p.instanceId))} className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-blue-600 bg-blue-600 text-white z-10 cursor-pointer shadow-2xl overflow-hidden group"
                  style={{ gridRowStart: p.row + 1, gridColumnStart: p.col + 1, gridRowEnd: `span ${p.rowSpan}`, gridColumnEnd: `span ${p.colSpan}` }}>
                  <ProductIcon name={p.template.icon} size={20} className="mb-1 opacity-80 group-hover:scale-110 transition-transform" />
                  <p className="font-black text-[9px] uppercase leading-none truncate w-full text-center">{p.template.name}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl space-y-6">
              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-3"><Ruler size={18} className="text-blue-500" /> Ingeniería</h3>
              <div className="space-y-6">
                <select value={boxType} onChange={e => setBoxType(e.target.value)} className="w-full p-4 bg-black rounded-2xl text-xs font-black uppercase border border-zinc-800 outline-none focus:ring-2 focus:ring-blue-600 transition-all">
                  <option value="with-lid">Base + Tapa Estándar</option>
                  <option value="without-lid">Sólo Estuche Base</option>
                  <option value="internal-half-lid">Base + Media Tapa Interna</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase text-center block tracking-widest">Margen Alto</label>
                    <input type="number" value={heightMargin} onChange={e => setHeightMargin(e.target.value)} className="w-full p-4 bg-black rounded-2xl text-sm font-black border border-zinc-800 text-center" />
                  </div>
                  {boxType === 'with-lid' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase text-center block tracking-widest">Alto Tapa</label>
                      <input type="number" value={lidHeight} onChange={e => setLidHeight(e.target.value)} className="w-full p-4 bg-black rounded-2xl text-sm font-black border border-zinc-800 text-center" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 p-8 rounded-[2rem] shadow-2xl border border-zinc-800">
              {results ? (
                <div className="grid grid-cols-1 gap-6 overflow-y-auto max-h-[500px] pr-2 scrollbar-hide">
                  <PlanchaDiagram width={results.innerWidth} length={results.innerLength} flap={results.innerHeight} label="Base" colorClass="text-blue-500" />
                  {boxType === 'with-lid' && results.lidCutWidth && (
                    <PlanchaDiagram width={results.innerWidth + parseFloat(lidMargin)} length={results.innerLength + parseFloat(lidMargin)} flap={parseFloat(lidHeight)} label="Tapa" colorClass="text-purple-500" />
                  )}
                  {boxType === 'internal-half-lid' && results.internalLidCutWidth && (
                    <PlanchaDiagram width={results.innerWidth - 0.2} length={results.innerLength - 0.2} flap={results.innerHeight - 0.1} label="Tapa Interna" colorClass="text-emerald-500" />
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 gap-4">
                  <Layout size={60} className="text-blue-600 animate-pulse" />
                  <p className="font-black uppercase tracking-widest text-xs text-center">Sin diseño para procesar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}