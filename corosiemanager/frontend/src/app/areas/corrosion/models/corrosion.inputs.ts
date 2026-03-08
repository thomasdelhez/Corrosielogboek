export interface UpdateHoleInput {
  maxBpDiameter: number | null;
  finalHoleSize: number | null;
  fit: string | null;
  mdrCode: string | null;
  mdrVersion: string | null;
  ndiNameInitials: string | null;
  ndiInspectionDate: Date | null;
  ndiFinished: boolean;
  inspectionStatus: string | null;
}

export interface UpdateHoleStepInput {
  stepNo: number;
  sizeValue: number | null;
  visualDamageCheck: string | null;
  reamFlag: boolean | null;
  mdrFlag: boolean | null;
  ndiFlag: boolean | null;
}

export interface UpdateHolePartInput {
  slotNo: number;
  partNumber: string | null;
  partLength: number | null;
  bushingType: string | null;
  standardCustom: string | null;
  orderedFlag: boolean | null;
  deliveredFlag: boolean | null;
  status: string | null;
}

export interface CreateMdrCaseInput {
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

export interface CreateNdiReportInput {
  panelId: number | null;
  nameInitials: string | null;
  inspectionDate: Date | null;
  method: string | null;
  tools: string | null;
  corrosionPosition: string | null;
}

export interface CreateHoleInput {
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
  steps: UpdateHoleStepInput[];
  parts: UpdateHolePartInput[];
}

export interface CreateHoleBatchResultRow {
  holeNumber: number;
  holeId: number | null;
  status: 'created' | 'skipped' | 'error';
  detail: string | null;
}

export interface CreateHoleBatchResult {
  created: number;
  skipped: number;
  errors: number;
  results: CreateHoleBatchResultRow[];
}
