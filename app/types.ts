
export interface Product {
  id: string;
  name: string;
  width: number;
  length: number;
  height: number;
}

export interface CalculationResults {
  innerWidth: number;
  innerLength: number;
  innerHeight: number;
  baseCutWidth: number;
  baseCutLength: number;
  lidCutWidth?: number;
  lidCutLength?: number;
}
