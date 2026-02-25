"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Box, Ruler, Trash2, Save, FolderOpen, ChevronsRight, 
  ChevronsDown, Eraser, Layers, Scissors, Search,
  Cookie, Coffee, CupSoda, Sandwich, Dessert, Circle, Hash, Banknote,
  Plus, MousePointer, CheckCircle2, LayoutTemplate, Edit2, Loader2
} from "lucide-react";

// --- IMPORTACIONES DE FIREBASE ---
import { db } from "../lib/firebase"; // Ajusta la ruta si es necesario
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";

// --- TIPOS ---
interface Product { id: string; name: string; width: number; length: number; height: number; icon?: string; }
type ProductTemplate = Product;
interface PlacedProduct { instanceId: string; template: ProductTemplate; row: number; col: number; rowSpan: number; colSpan: number; }
export type PartType = 'BASE' | 'FULL_LID' | 'INTERNAL_LID' | 'HOLDER' | 'HANDLE' | 'REINFORCEMENT';

export interface BoxPartConfig {
  id: string; type: PartType; name: string; customHeight?: number; customMargin?: number; customWidth?: number; customLength?: number; targetProductIds: string[];
}
export interface CutResult {
  partId: string; name: string; type: PartType; cutWidth: number; cutLength: number; flapSize: number; colorClass: string; isStrip?: boolean;
}
interface SavedBox { id: string; name: string; rows: number; cols: number; placedProducts: PlacedProduct[]; boxParts: BoxPartConfig[]; }
interface CalculationResults { innerWidth: number; innerLength: number; innerHeight: number; partsToCut: CutResult[]; }

// --- CONSTANTES ---
const SHEET_W = 110;
const SHEET_L = 77;
const ICON_MAP: Record<string, any> = { donut: Circle, dessert: Dessert, coffee: Coffee, cookie: Cookie, juice: CupSoda, sandwich: Sandwich, default: Box };
const PART_COLORS: Record<PartType, string> = { BASE: 'text-blue-500', FULL_LID: 'text-purple-500', INTERNAL_LID: 'text-emerald-500', HOLDER: 'text-amber-500', HANDLE: 'text-pink-500', REINFORCEMENT: 'text-cyan-500' };

// --- COMPONENTES AUXILIARES ---
function ProductIcon({ name, size = 16, className = "" }: { name?: string, size?: number, className?: string }) {
  const IconComponent = ICON_MAP[name || "default"] || ICON_MAP.default;
  return <IconComponent size={size} className={className} />;
}

function getOptimization(pw: number, pl: number) {
  if (pw <= 0 || pl <= 0) return null;
  const areaSheet = SHEET_W * SHEET_L;
  const nx = Math.floor(SHEET_W / pw), ny = Math.floor(SHEET_L / pl);
  const totalNormal = nx * ny;
  const rx = Math.floor(SHEET_W / pl), ry = Math.floor(SHEET_L / pw);
  const totalRotated = rx * ry;
  const useRotated = totalRotated > totalNormal;
  const bestTotal = useRotated ? totalRotated : totalNormal;
  const finalW = useRotated ? pl : pw, finalL = useRotated ? pw : pl;
  const countX = useRotated ? rx : nx, countY = useRotated ? ry : ny;
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
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Pliego Optimizado (110x77)</span>
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

function PlanchaDiagram({ part }: { part: CutResult }) {
  const viewScale = 2;
  const { cutWidth: pw, cutLength: pl, flapSize: flap, name, colorClass, isStrip } = part;
  const width = pw - (flap * 2);
  const length = pl - (flap * 2);

  return (
    <div className="flex flex-col gap-2 p-5 bg-zinc-800/30 rounded-2xl border border-zinc-700/50 shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <p className={`text-[10px] font-black uppercase tracking-widest ${colorClass}`}>{name}</p>
        <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[11px] font-mono text-white flex items-center gap-2">
          <Scissors size={14} className="text-zinc-500" />
          <strong>{pw.toFixed(1)}</strong> x <strong>{pl.toFixed(1)}</strong> cm
        </div>
      </div>
      
      <svg viewBox={`-60 -20 ${(pw * viewScale) + 80} ${(pl * viewScale) + 60}`} className={`w-full max-w-[280px] mx-auto h-auto ${colorClass} fill-current`}>
        <g className="opacity-30">
          {!isStrip && flap > 0 ? (
            <>
              <rect x={flap * viewScale} y={flap * viewScale} width={width * viewScale} height={length * viewScale} />
              <rect x={0} y={flap * viewScale} width={flap * viewScale} height={length * viewScale} />
              <rect x={(flap + width) * viewScale} y={flap * viewScale} width={flap * viewScale} height={length * viewScale} />
              <rect x={flap * viewScale} y={0} width={width * viewScale} height={flap * viewScale} />
              <rect x={flap * viewScale} y={(flap + length) * viewScale} width={width * viewScale} height={flap * viewScale} />
            </>
          ) : ( <rect x={0} y={0} width={pw * viewScale} height={pl * viewScale} /> )}
        </g>
        
        <g className="fill-none stroke-white stroke-[0.8] opacity-60">
          {!isStrip && flap > 0 && <rect x={flap * viewScale} y={flap * viewScale} width={width * viewScale} height={length * viewScale} />}
          <rect x={0} y={0} width={pw * viewScale} height={pl * viewScale} />
        </g>
        
        <text x={-25} y={(pl * viewScale) / 2} transform={`rotate(-90, -25, ${(pl * viewScale) / 2})`} fill="white" className="font-mono font-black" style={{ fontSize: '16px' }} textAnchor="middle">{pl.toFixed(1)}</text>
        <text x={(pw * viewScale) / 2} y={(pl * viewScale) + 40} fill="white" className="font-mono font-black" style={{ fontSize: '16px' }} textAnchor="middle">{pw.toFixed(1)}</text>

        {!isStrip && flap > 0 && (
          <>
            <text x={(flap + width / 2) * viewScale} y={(flap + length / 2) * viewScale} fill="white" className="font-mono font-bold opacity-90" style={{ fontSize: '8px' }} textAnchor="middle" dominantBaseline="middle">
              {width.toFixed(1)} × {length.toFixed(1)}
            </text>
            <text x={(flap + width / 2) * viewScale} y={(flap / 2) * viewScale} fill="white" className="font-mono font-bold opacity-80" style={{ fontSize: '8px' }} textAnchor="middle" dominantBaseline="middle">
              {flap.toFixed(1)}
            </text>
            <text x={(flap / 2) * viewScale} y={(flap + length / 2) * viewScale} transform={`rotate(-90, ${(flap / 2) * viewScale}, ${(flap + length / 2) * viewScale})`} fill="white" className="font-mono font-bold opacity-80" style={{ fontSize: '8px' }} textAnchor="middle" dominantBaseline="middle">
              {flap.toFixed(1)}
            </text>
          </>
        )}
      </svg>
      <SheetLayoutView pw={pw} pl={pl} colorClass={colorClass} />
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---

export function BoxCalculator() {
  const SCALE = 8;

  const [loadingDb, setLoadingDb] = useState(true);
  const [productTemplates, setProductTemplates] = useState<ProductTemplate[]>([]);
  const [savedBoxes, setSavedBoxes] = useState<SavedBox[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentBoxName, setCurrentBoxName] = useState("");
  const [currentBoxId, setCurrentBoxId] = useState<string | null>(null); 
  
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(5);
  const [placedProducts, setPlacedProducts] = useState<PlacedProduct[]>([]);
  
  const [boxParts, setBoxParts] = useState<BoxPartConfig[]>([ { id: 'base-initial', type: 'BASE', name: 'Base Estuche', customMargin: 1.5, targetProductIds: [] } ]);
  const [selectionMode, setSelectionMode] = useState<{ active: boolean, partId: string | null }>({ active: false, partId: null });

  const [productionQuantity, setProductionQuantity] = useState(10);
  const [newProduct, setNewProduct] = useState({ id: "", name: "", width: "", length: "", height: "", icon: "default" });
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  const [colSpan, setColSpan] = useState(1);
  const [rowSpan, setRowSpan] = useState(1);
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [sheetPrice, setSheetPrice] = useState(6);

  useEffect(() => {
    const fetchFirestoreData = async () => {
      try {
        const productsSnap = await getDocs(collection(db, "products"));
        const fetchedProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductTemplate));
        setProductTemplates(fetchedProducts);

        const boxesSnap = await getDocs(collection(db, "boxes"));
        const fetchedBoxes = boxesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedBox));
        setSavedBoxes(fetchedBoxes);
      } catch (error) {
        console.error("Error cargando de Firestore:", error);
      } finally {
        setLoadingDb(false);
      }
    };
    fetchFirestoreData();
  }, []);

  const filteredProducts = useMemo(() => productTemplates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())), [productTemplates, searchTerm]);

  const handleSaveBox = async () => {
    if (!currentBoxName) return alert("Nombra el diseño");
    const boxData = { name: currentBoxName, rows, cols, placedProducts, boxParts };
    try {
      if (currentBoxId) {
        await updateDoc(doc(db, "boxes", currentBoxId), boxData);
        setSavedBoxes(prev => prev.map(b => b.id === currentBoxId ? { id: currentBoxId, ...boxData } : b));
        alert("¡Diseño actualizado en la nube!");
      } else {
        const docRef = await addDoc(collection(db, "boxes"), boxData);
        setSavedBoxes([{ id: docRef.id, ...boxData }, ...savedBoxes]);
        setCurrentBoxId(docRef.id);
        alert("¡Diseño guardado en la nube!");
      }
    } catch (error) {
      console.error("Error guardando caja:", error);
      alert("Error al guardar.");
    }
  };

  const handleDeleteBox = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar este diseño de la nube?")) return;
    try {
      await deleteDoc(doc(db, "boxes", id));
      setSavedBoxes(prev => prev.filter(b => b.id !== id));
      if (currentBoxId === id) {
        setPlacedProducts([]); setCurrentBoxName(""); setCurrentBoxId(null);
      }
    } catch (error) {
      console.error("Error eliminando caja:", error);
    }
  };

  const loadBox = (box: SavedBox) => {
    setRows(box.rows); setCols(box.cols); setPlacedProducts(box.placedProducts);
    setCurrentBoxName(box.name); setCurrentBoxId(box.id); setBoxParts(box.boxParts);
    setSelectionMode({ active: false, partId: null });
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.width) return;
    const productData = { name: newProduct.name, width: parseFloat(newProduct.width), length: parseFloat(newProduct.length), height: parseFloat(newProduct.height), icon: newProduct.icon };
    try {
      if (isEditingProduct && newProduct.id) {
        await updateDoc(doc(db, "products", newProduct.id), productData);
        setProductTemplates(prev => prev.map(p => p.id === newProduct.id ? { id: newProduct.id, ...productData } : p));
      } else {
        const docRef = await addDoc(collection(db, "products"), productData);
        setProductTemplates([...productTemplates, { id: docRef.id, ...productData }]);
      }
      setNewProduct({ id: "", name: "", width: "", length: "", height: "", icon: "default" });
      setIsEditingProduct(false);
    } catch (error) {
      console.error("Error guardando producto:", error);
    }
  };

  const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProductTemplates(prev => prev.filter(p => p.id !== id));
      if (selectedTemplate?.id === id) setSelectedTemplate(null);
    } catch (error) {
      console.error("Error eliminando producto:", error);
    }
  };

  const editProduct = (prod: ProductTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewProduct({ id: prod.id, name: prod.name, width: prod.width.toString(), length: prod.length.toString(), height: prod.height.toString(), icon: prod.icon || "default" });
    setIsEditingProduct(true);
  };

  // --- MOTOR DE CÁLCULO FÍSICO CORREGIDO ---
  const { colWidths, rowLengths, totalInnerWidth, totalInnerLength, maxHeight } = useMemo(() => {
    // 1. Cálculo de pistas para el grid visual
    const widths = Array(cols).fill(0); const lengths = Array(rows).fill(0);
    placedProducts.forEach(p => {
      const wPerCol = p.template.width / p.colSpan;
      for (let i = 0; i < p.colSpan; i++) if (p.col + i < cols) widths[p.col + i] = Math.max(widths[p.col + i], wPerCol);
      const lPerRow = p.template.length / p.rowSpan;
      for (let i = 0; i < p.rowSpan; i++) if (p.row + i < rows) lengths[p.row + i] = Math.max(lengths[p.row + i], lPerRow);
    });

    // 2. Cálculo matemático estricto de la Caja Fáctica (sin superponer anchos/largos innecesarios)
    let maxPhysicalLength = 0;
    for (let c = 0; c < cols; c++) {
      let colSum = 0;
      placedProducts.forEach(p => {
        if (c >= p.col && c < p.col + p.colSpan) colSum += p.template.length; 
      });
      if (colSum > maxPhysicalLength) maxPhysicalLength = colSum;
    }

    let maxPhysicalWidth = 0;
    for (let r = 0; r < rows; r++) {
      let rowSum = 0;
      placedProducts.forEach(p => {
        if (r >= p.row && r < p.row + p.rowSpan) rowSum += p.template.width;
      });
      if (rowSum > maxPhysicalWidth) maxPhysicalWidth = rowSum;
    }

    return { 
      colWidths: widths, 
      rowLengths: lengths, 
      totalInnerWidth: maxPhysicalWidth, 
      totalInnerLength: maxPhysicalLength, 
      maxHeight: Math.max(0, ...placedProducts.map(p => p.template.height), 0) 
    };
  }, [placedProducts, rows, cols]);

  useEffect(() => {
    if (placedProducts.length === 0) { setResults(null); return; }
    const partsToCut: CutResult[] = [];
    const baseConfig = boxParts.find(p => p.type === 'BASE') || boxParts[0];
    const innerHeight = maxHeight + (baseConfig.customMargin || 0);

    boxParts.forEach(part => {
      if (part.type === 'BASE') {
        partsToCut.push({ partId: part.id, name: part.name, type: part.type, cutWidth: totalInnerWidth + 2 * innerHeight, cutLength: totalInnerLength + 2 * innerHeight, flapSize: innerHeight, colorClass: PART_COLORS[part.type] });
      } 
      else if (part.type === 'FULL_LID') {
        const flap = part.customHeight || 3; const margin = part.customMargin || 0.3;
        partsToCut.push({ partId: part.id, name: part.name, type: part.type, cutWidth: (totalInnerWidth + margin) + 2 * flap, cutLength: (totalInnerLength + margin) + 2 * flap, flapSize: flap, colorClass: PART_COLORS[part.type] });
      }
      else if (part.type === 'INTERNAL_LID') {
        const targets = placedProducts.filter(p => part.targetProductIds.includes(p.instanceId));
        let boxW = totalInnerWidth;
        
        // Lógica corregida para el ancho de la Tapa Interna
        if (targets.length > 0) {
          let maxTargetWidth = 0;
          for (let r = 0; r < rows; r++) {
            let rowSum = 0;
            targets.forEach(p => {
              if (r >= p.row && r < p.row + p.rowSpan) rowSum += p.template.width;
            });
            if (rowSum > maxTargetWidth) maxTargetWidth = rowSum;
          }
          boxW = maxTargetWidth;
        }

        const cutL = totalInnerLength - 0.2; 
        const flap = innerHeight - 0.1;
        partsToCut.push({ partId: part.id, name: part.name, type: part.type, cutWidth: boxW + 2 * flap, cutLength: cutL + 2 * flap, flapSize: flap, colorClass: PART_COLORS[part.type] });
      }
      else if (part.type === 'HOLDER') {
        const flap = Math.min(innerHeight - 0.1, part.customHeight || 5.9);
        partsToCut.push({ partId: part.id, name: part.name, type: part.type, cutWidth: (part.customWidth || 10) + 2 * flap, cutLength: (part.customLength || 10) + 2 * flap, flapSize: flap, colorClass: PART_COLORS[part.type] });
      }
      else if (part.type === 'HANDLE') {
        partsToCut.push({ partId: part.id, name: part.name, type: part.type, cutWidth: totalInnerWidth, cutLength: 46 + totalInnerLength, flapSize: 0, colorClass: PART_COLORS[part.type], isStrip: true });
      }
      else if (part.type === 'REINFORCEMENT') {
        const flap = part.customHeight || 3;
        partsToCut.push({ partId: part.id, name: part.name, type: part.type, cutWidth: (totalInnerWidth - 0.1) + 2 * flap, cutLength: (totalInnerLength - 0.1) + 2 * flap, flapSize: flap, colorClass: PART_COLORS[part.type] });
      }
    });
    setResults({ innerWidth: totalInnerWidth, innerLength: totalInnerLength, innerHeight, partsToCut });
  }, [totalInnerWidth, totalInnerLength, maxHeight, placedProducts, boxParts, colWidths]);

  const productionSummary = useMemo(() => {
    if (!results) return null;
    let totalSheets = 0;
    const partsData = results.partsToCut.map(cut => {
      const opt = getOptimization(cut.cutWidth, cut.cutLength);
      const perSheet = opt?.bestTotal || 0;
      const sheets = perSheet > 0 ? Math.ceil(productionQuantity / perSheet) : 0;
      const unitCost = perSheet > 0 ? (sheetPrice / perSheet) : 0;
      totalSheets += sheets; return { ...cut, perSheet, sheets, unitCost };
    });
    return { partsData, totalSheets, totalProjectCost: totalSheets * sheetPrice, totalUnitCost: partsData.reduce((sum, p) => sum + p.unitCost, 0) };
  }, [results, productionQuantity, sheetPrice]);

  const handleCellClick = (r_idx: number, c_idx: number) => {
    if (selectionMode.active || !selectedTemplate) return;
    if ((r_idx + rowSpan) > rows || (c_idx + colSpan) > cols) return;
    if (placedProducts.some(p => (c_idx < p.col + p.colSpan && c_idx + colSpan > p.col) && (r_idx < p.row + p.rowSpan && r_idx + rowSpan > p.row))) return;
    setPlacedProducts([...placedProducts, { instanceId: Date.now().toString(), template: selectedTemplate, row: r_idx, col: c_idx, rowSpan, colSpan }]);
  };

  const handleProductClick = (instanceId: string) => {
    if (selectionMode.active && selectionMode.partId) {
      setBoxParts(prev => prev.map(pt => pt.id === selectionMode.partId ? { ...pt, targetProductIds: pt.targetProductIds.includes(instanceId) ? pt.targetProductIds.filter(id => id !== instanceId) : [...pt.targetProductIds, instanceId] } : pt));
    } else {
      setPlacedProducts(prev => prev.filter(x => x.instanceId !== instanceId));
    }
  };

  const addPart = (type: PartType) => {
    const names: Record<PartType, string> = { BASE: 'Base', FULL_LID: 'Tapa', INTERNAL_LID: 'Tapa Interna', HOLDER: 'Portacafé', HANDLE: 'Agarrador', REINFORCEMENT: 'Base Refuerzo' };
    const newPart: BoxPartConfig = { id: `${type.toLowerCase()}-${Date.now()}`, type, name: names[type], targetProductIds: [] };
    
    if (type === 'FULL_LID') { newPart.customHeight = 3; newPart.customMargin = 0.3; }
    if (type === 'HOLDER') { newPart.customWidth = 10; newPart.customLength = 10; newPart.customHeight = 5.9; }
    if (type === 'REINFORCEMENT') { newPart.customHeight = 3; }
    
    setBoxParts([...boxParts, newPart]);
  };

  if (loadingDb) {
    return (
      <div className="w-full min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-blue-500 gap-4">
        <Loader2 className="animate-spin" size={48} />
        <p className="font-black tracking-widest text-xs uppercase text-zinc-500">Conectando a Firestore...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 bg-zinc-950 min-h-screen text-zinc-100 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20"><Box size={32} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Box Master <span className="text-blue-500">PRO</span></h1>
            <p className="text-[10px] text-zinc-500 font-black tracking-[0.2em] uppercase">Cloud Sync Active</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 shadow-xl">
          <input type="text" placeholder="NOMBRE DEL DISEÑO..." value={currentBoxName} onChange={e => setCurrentBoxName(e.target.value)} className="bg-transparent border-none outline-none text-xs px-4 w-48 font-black uppercase placeholder:text-zinc-700" />
          <button onClick={() => { setPlacedProducts([]); setCurrentBoxName(""); setCurrentBoxId(null); setBoxParts([{ id: 'base-initial', type: 'BASE', name: 'Base Estuche', customMargin: 1.5, targetProductIds: [] }]); }} className="text-zinc-500 hover:text-white px-2"><Plus size={16}/></button>
          <button onClick={handleSaveBox} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"><Save size={16} /> GUARDAR</button>
        </div>
      </header>

      {/* SECCIÓN DE DISEÑOS GUARDADOS EN LA NUBE */}
      <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm space-y-4 mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black uppercase text-amber-500 tracking-[0.2em] flex items-center gap-2"><FolderOpen size={16} /> Mis Proyectos en la Nube</h2>
          <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full">{savedBoxes.length}</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {savedBoxes.length === 0 ? (
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">No hay diseños guardados</p>
          ) : (
            savedBoxes.map((box) => (
              <div key={box.id} className={`group relative min-w-[200px] flex flex-col p-4 rounded-2xl border transition-all cursor-pointer ${currentBoxId === box.id ? 'bg-amber-500/10 border-amber-500' : 'bg-black border-zinc-800 hover:border-amber-500/50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div onClick={() => loadBox(box)} className="flex-1">
                    <h3 className="text-xs font-black uppercase text-zinc-100 group-hover:text-amber-500 transition-colors truncate">{box.name}</h3>
                    <p className="text-[9px] font-bold text-zinc-500 mt-1">{box.cols}x{box.rows} • {box.boxParts.length} piezas</p>
                  </div>
                  <button onClick={(e) => handleDeleteBox(box.id, e)} className="text-zinc-700 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="xl:col-span-4 space-y-6">
          {results && productionSummary && (
            <div className="bg-blue-600 p-6 rounded-[2rem] shadow-xl shadow-blue-900/20 border border-blue-400/30 space-y-6 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-blue-400/30 pb-4">
                <h2 className="text-xs font-black uppercase text-white tracking-[0.2em] flex items-center gap-2"><Layers size={18} /> Producción</h2>
                <div className="flex items-center gap-2 bg-blue-800/50 px-3 py-1 rounded-full border border-blue-400/30">
                  <span className="text-[9px] font-black text-blue-200 uppercase">Precio Pliego:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white">Bs</span>
                    <input type="number" value={sheetPrice} onChange={e => setSheetPrice(Number(e.target.value))} className="w-10 bg-transparent text-white font-black text-xs outline-none border-b border-white/50 text-center" />
                  </div>
                </div>
              </div>
              <div className="bg-black/20 p-4 rounded-2xl">
                <label className="text-[10px] font-black uppercase text-blue-100 opacity-70 mb-1 block">Cantidad a Fabricar (Unidades)</label>
                <div className="flex items-center gap-3">
                    <Hash size={18} className="text-white opacity-50"/>
                    <input type="number" value={productionQuantity} onChange={e => setProductionQuantity(Math.max(1, Number(e.target.value)))} className="bg-transparent text-2xl font-black outline-none w-full text-white" />
                </div>
              </div>
              <div className="space-y-3">
                {productionSummary.partsData.map(part => (
                  <div key={part.partId} className="flex justify-between items-center text-[11px] text-blue-100 bg-white/5 p-2 rounded-lg">
                    <span>{part.name} ({part.perSheet} u/pliego):</span>
                    <div className="text-right">
                      <span className="font-mono font-bold block">{part.sheets} pliegos</span>
                      <span className="text-[9px] opacity-70">Costo: Bs {part.unitCost.toFixed(2)} / u</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-px bg-white/20" />
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <p className="text-[9px] font-black uppercase text-blue-200 mb-1 flex items-center gap-1"><Banknote size={12}/> Costo Unitario</p>
                  <p className="text-2xl font-black text-white leading-none"><span className="text-sm align-top opacity-70">Bs</span> {productionSummary.totalUnitCost.toFixed(2)}</p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-right">
                  <p className="text-[9px] font-black uppercase text-blue-200 mb-1">Inversión Material</p>
                  <p className="text-2xl font-black text-white leading-none"><span className="text-sm align-top opacity-70">Bs</span> {productionSummary.totalProjectCost.toFixed(0)}</p>
                  <p className="text-[9px] font-bold text-blue-200 mt-1">({productionSummary.totalSheets} pliegos)</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm space-y-4">
            <h2 className="text-xs font-black uppercase text-blue-500 tracking-[0.2em] flex items-center gap-2"><FolderOpen size={16} /> Biblioteca de Productos</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input type="text" placeholder="BUSCAR..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-all uppercase" />
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
              {filteredProducts.map(t => (
                <div key={t.id} onClick={() => setSelectedTemplate(t)} className={`group relative p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${selectedTemplate?.id === t.id ? 'border-blue-600 bg-blue-600/10' : 'border-zinc-800 hover:border-zinc-700 bg-black/40'}`}>
                  <div className={`p-2 rounded-lg ${selectedTemplate?.id === t.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    <ProductIcon name={t.icon} />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-xs uppercase tracking-tight">{t.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{t.width}×{t.length}×{t.height} CM</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => editProduct(t, e)} className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded"><Edit2 size={14}/></button>
                    <button onClick={(e) => handleDeleteProduct(t.id, e)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xs font-black uppercase text-zinc-500 tracking-[0.2em]">{isEditingProduct ? "Editar Producto" : "Nuevo Producto"}</h2>
               {isEditingProduct && <button onClick={() => { setIsEditingProduct(false); setNewProduct({ id: "", name: "", width: "", length: "", height: "", icon: "default" }); }} className="text-[10px] text-zinc-500 hover:text-white uppercase font-black">Cancelar</button>}
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="NOMBRE..." value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full p-4 rounded-2xl bg-black border border-zinc-800 text-sm font-bold outline-none uppercase" />
              <div className="grid grid-cols-3 gap-3">
                {['Ancho', 'Largo', 'Alto'].map((label, i) => (
                  <div key={label} className="space-y-2 text-center">
                    <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">{label}</span>
                    <input type="number" step="0.1" value={[newProduct.width, newProduct.length, newProduct.height][i]} onChange={e => {
                      const keys = ["width", "length", "height"] as const;
                      setNewProduct({ ...newProduct, [keys[i]]: e.target.value });
                    }} className="w-full p-3 rounded-xl bg-black border border-zinc-800 text-xs text-center font-black" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block text-center">Icono</span>
                <select value={newProduct.icon} onChange={e => setNewProduct({ ...newProduct, icon: e.target.value })} className="w-full p-3 bg-black border border-zinc-800 rounded-xl text-xs font-bold outline-none uppercase text-zinc-400">
                  {Object.keys(ICON_MAP).map(iconName => <option key={iconName} value={iconName}>{iconName.toUpperCase()}</option>)}
                </select>
              </div>
              <button onClick={handleSaveProduct} className={`w-full p-4 rounded-2xl text-xs font-black uppercase tracking-[0.15em] transition-all shadow-lg ${isEditingProduct ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-zinc-100 text-black hover:bg-white'}`}>
                {isEditingProduct ? "ACTUALIZAR NUBE" : "GUARDAR EN NUBE"}
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="xl:col-span-8 space-y-6">
          <div className={`bg-zinc-900 p-8 rounded-[2rem] border transition-colors shadow-2xl relative overflow-hidden ${selectionMode.active ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-zinc-800'}`}>
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
                {selectedTemplate && !selectionMode.active && (
                  <div className="space-y-2 animate-in slide-in-from-left-4 font-black">
                    <p className="text-[9px] uppercase text-blue-500 tracking-[0.2em]">Insertar: {selectedTemplate.name}</p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-[10px] bg-black p-1 px-3 rounded-xl border border-zinc-800"><ChevronsRight size={14} className="text-zinc-500" /> <input type="number" min="1" value={colSpan} onChange={e => setColSpan(Number(e.target.value))} className="w-6 bg-transparent text-center" /></label>
                      <label className="flex items-center gap-2 text-[10px] bg-black p-1 px-3 rounded-xl border border-zinc-800"><ChevronsDown size={14} className="text-zinc-500" /> <input type="number" min="1" value={rowSpan} onChange={e => setRowSpan(Number(e.target.value))} className="w-6 bg-transparent text-center" /></label>
                    </div>
                  </div>
                )}
                {selectionMode.active && (
                  <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl flex items-center gap-3 animate-pulse">
                    <MousePointer size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Haz clic en los productos para asignarlos a la pieza</span>
                  </div>
                )}
              </div>
              <button onClick={() => setPlacedProducts([])} className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all border border-transparent hover:border-red-500/20"><Eraser size={14} /> Limpiar Todo</button>
            </div>

            <div className={`grid gap-1.5 bg-black p-2 rounded-3xl overflow-auto min-h-[300px] ${selectionMode.active ? 'cursor-pointer' : ''}`}
              style={{ gridTemplateColumns: colWidths.map(w => `${Math.max(w, 5) * SCALE}px`).join(' '), gridTemplateRows: rowLengths.map(l => `${Math.max(l, 5) * SCALE}px`).join(' '), width: 'fit-content', minWidth: '100%' }}>
              {Array.from({ length: rows * cols }).map((_, i) => {
                const r = Math.floor(i / cols), c = i % cols;
                return <div key={`c-${r}-${c}`} onClick={() => handleCellClick(r, c)} className={`bg-zinc-900/40 min-h-[50px] rounded-xl transition-all border border-zinc-800/50 ${!selectionMode.active ? 'hover:bg-zinc-800 cursor-crosshair' : ''}`} style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }} />;
              })}
              
              {placedProducts.map(p => {
                const activePart = selectionMode.active ? boxParts.find(pt => pt.id === selectionMode.partId) : null;
                const isTargeted = activePart?.targetProductIds.includes(p.instanceId);
                return (
                  <div key={p.instanceId} onClick={() => handleProductClick(p.instanceId)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 text-white z-10 cursor-pointer shadow-2xl overflow-hidden group transition-all
                    ${selectionMode.active ? (isTargeted ? 'border-emerald-400 bg-emerald-600 scale-105' : 'border-zinc-700 bg-zinc-800 opacity-50 hover:opacity-100') : 'border-blue-600 bg-blue-600'}`}
                    style={{ gridRowStart: p.row + 1, gridColumnStart: p.col + 1, gridRowEnd: `span ${p.rowSpan}`, gridColumnEnd: `span ${p.colSpan}` }}>
                    {selectionMode.active && isTargeted && <CheckCircle2 className="absolute top-1 right-1 text-white opacity-80" size={12} />}
                    <ProductIcon name={p.template.icon} size={20} className="mb-1 opacity-80 group-hover:scale-110 transition-transform" />
                    <p className="font-black text-[9px] uppercase leading-none truncate w-full text-center">{p.template.name}</p>
                    <p className="text-[7px] font-bold mt-1 opacity-70">{p.template.width}x{p.template.length}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-xl space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-3"><LayoutTemplate size={18} className="text-blue-500" /> Constructor</h3>
                <div className="flex items-center gap-2">
                  <select id="part-selector" className="bg-black text-[10px] font-black uppercase text-zinc-300 border border-zinc-700 rounded-lg p-2 outline-none">
                    <option value="FULL_LID">Tapa</option>
                    <option value="INTERNAL_LID">Tapa Interna</option>
                    <option value="HOLDER">Portacafé</option>
                    <option value="HANDLE">Agarrador</option>
                    <option value="REINFORCEMENT">Base de Refuerzo</option>
                  </select>
                  <button onClick={() => { const sel = document.getElementById('part-selector') as HTMLSelectElement; addPart(sel.value as PartType); }} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg text-white transition-colors"><Plus size={16} /></button>
                </div>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {boxParts.map((part) => (
                  <div key={part.id} className={`p-4 rounded-2xl border-2 transition-all ${selectionMode.partId === part.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-black/40'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <input type="text" value={part.name} onChange={e => setBoxParts(prev => prev.map(p => p.id === part.id ? { ...p, name: e.target.value } : p))} className={`bg-transparent text-xs font-black uppercase outline-none ${PART_COLORS[part.type]}`} />
                      {part.type !== 'BASE' && (
                        <button onClick={() => setBoxParts(prev => prev.filter(p => p.id !== part.id))} className="text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {part.type === 'BASE' && (
                        <div className="col-span-2 space-y-1">
                           <label className="text-[9px] font-black text-zinc-500 uppercase">Margen Alto Base (cm)</label>
                           <input type="number" step="0.1" value={part.customMargin} onChange={e => setBoxParts(prev => prev.map(p => p.id === part.id ? { ...p, customMargin: parseFloat(e.target.value) } : p))} className="w-full p-2 bg-black rounded-lg border border-zinc-800 text-xs text-white" />
                        </div>
                      )}
                      
                      {part.type === 'REINFORCEMENT' && (
                        <div className="col-span-2 space-y-1">
                           <label className="text-[9px] font-black text-zinc-500 uppercase">Alto Refuerzo (cm)</label>
                           <input type="number" step="0.1" value={part.customHeight} onChange={e => setBoxParts(prev => prev.map(p => p.id === part.id ? { ...p, customHeight: parseFloat(e.target.value) } : p))} className="w-full p-2 bg-black rounded-lg border border-zinc-800 text-xs text-white" />
                        </div>
                      )}
                      
                      {part.type === 'FULL_LID' && (
                        <>
                          <div className="space-y-1">
                             <label className="text-[9px] font-black text-zinc-500 uppercase">Alto Tapa</label>
                             <input type="number" step="0.1" value={part.customHeight} onChange={e => setBoxParts(prev => prev.map(p => p.id === part.id ? { ...p, customHeight: parseFloat(e.target.value) } : p))} className="w-full p-2 bg-black rounded-lg border border-zinc-800 text-xs text-white" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[9px] font-black text-zinc-500 uppercase">Holgura (mm)</label>
                             <input type="number" step="0.1" value={part.customMargin} onChange={e => setBoxParts(prev => prev.map(p => p.id === part.id ? { ...p, customMargin: parseFloat(e.target.value) } : p))} className="w-full p-2 bg-black rounded-lg border border-zinc-800 text-xs text-white" />
                          </div>
                        </>
                      )}

                      {(part.type === 'INTERNAL_LID' || part.type === 'HOLDER') && (
                        <div className="col-span-2">
                          <button onClick={() => setSelectionMode(prev => prev.active && prev.partId === part.id ? { active: false, partId: null } : { active: true, partId: part.id })} 
                            className={`w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2
                            ${selectionMode.partId === part.id ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-emerald-500/50 hover:text-emerald-400'}`}>
                            <MousePointer size={14} />
                            {selectionMode.partId === part.id ? 'Terminar Selección' : `Elegir Objetivos (${part.targetProductIds.length})`}
                          </button>
                        </div>
                      )}

                      {part.type === 'HOLDER' && (
                        <>
                          <div className="space-y-1 mt-2">
                             <label className="text-[9px] font-black text-zinc-500 uppercase">Ancho Fijo</label>
                             <input type="number" step="0.1" value={part.customWidth} onChange={e => setBoxParts(prev => prev.map(p => p.id === part.id ? { ...p, customWidth: parseFloat(e.target.value) } : p))} className="w-full p-2 bg-black rounded-lg border border-zinc-800 text-xs text-white" />
                          </div>
                          <div className="space-y-1 mt-2">
                             <label className="text-[9px] font-black text-zinc-500 uppercase">Largo Fijo</label>
                             <input type="number" step="0.1" value={part.customLength} onChange={e => setBoxParts(prev => prev.map(p => p.id === part.id ? { ...p, customLength: parseFloat(e.target.value) } : p))} className="w-full p-2 bg-black rounded-lg border border-zinc-800 text-xs text-white" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 p-8 rounded-[2rem] shadow-2xl border border-zinc-800">
              {results ? (
                <>
                  <div className="border-b border-zinc-800 pb-6 mb-6">
                    <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-2">Medida Útil Caja (Inner)</p>
                    <p className="font-mono text-2xl font-black leading-none text-white">{results.innerWidth.toFixed(1)} × {results.innerLength.toFixed(1)} × {results.innerHeight.toFixed(1)} <span className="text-xs text-blue-500">CM</span></p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 overflow-y-auto max-h-[500px] pr-2 scrollbar-hide">
                    {results.partsToCut.map(cutResult => (
                      <PlanchaDiagram key={cutResult.partId} part={cutResult} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 gap-4">
                  <Ruler size={60} className="text-blue-600 animate-pulse" />
                  <p className="font-black uppercase tracking-widest text-xs">Sin diseño</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}