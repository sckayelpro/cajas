// types.ts

export type PartType = 'BASE' | 'FULL_LID' | 'INTERNAL_LID' | 'HOLDER' | 'HANDLE';

// Configuración de una pieza (Lo que el usuario define)
export interface BoxPartConfig {
  id: string;
  type: PartType;
  label: string;
  height: number;
  margin: number; // Holgura (ej. 0.3 para tapas, -0.1 para internas)
  targetProductIds?: string[]; // Para tapas internas o portacafés (qué productos cubre)
}

// El resultado del cálculo (Lo que pintará tu UI)
export interface CutResult {
  partId: string;
  label: string;
  cutWidth: number;
  cutLength: number;
  flapSize: number;
  colorClass: string; 
}

export interface CalculationResults {
  innerWidth: number;
  innerLength: number;
  innerHeight: number;
  partsToCut: CutResult[]; // <-- La magia de la escalabilidad está aquí
}