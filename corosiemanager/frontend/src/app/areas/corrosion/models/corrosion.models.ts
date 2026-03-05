export interface HoleStep {
  id: number;
  stepNo: number;
  sizeValue: number | null;
  visualDamageCheck: string | null;
  reamFlag: boolean | null;
  mdrFlag: boolean | null;
  ndiFlag: boolean | null;
}

export interface HolePart {
  id: number;
  slotNo: number;
  partNumber: string | null;
  partLength: number | null;
  bushingType: string | null;
  standardCustom: string | null;
  orderedFlag: boolean | null;
  deliveredFlag: boolean | null;
  status: string | null;
}

export interface Hole {
  id: number;
  panelId: number;
  holeNumber: number;
  maxBpDiameter: number | null;
  finalHoleSize: number | null;
  fit: string | null;
  mdrCode: string | null;
  mdrVersion: string | null;
  ndiNameInitials: string | null;
  ndiInspectionDate: Date | null;
  ndiFinished: boolean;
  inspectionStatus: string | null;
  createdAt: Date;
  steps: HoleStep[];
  parts: HolePart[];
}

export interface PanelSummary {
  id: number;
  panelNumber: number;
  holeCount: number;
}

export interface MdrCase {
  id: number;
  panelId: number | null;
  mdrNumber: string | null;
  mdrVersion: string | null;
  subject: string | null;
  status: string | null;
  submittedBy: string | null;
  requestDate: Date | null;
  needDate: Date | null;
  approved: boolean;
}

export interface NdiReport {
  id: number;
  panelId: number | null;
  holeId: number | null;
  nameInitials: string | null;
  inspectionDate: Date | null;
  method: string | null;
  tools: string | null;
  corrosionPosition: string | null;
}
