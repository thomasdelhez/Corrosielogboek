export interface UpdateHoleInput {
  maxBpDiameter: number | null;
  bpDamageClean?: string | null;
  finalHoleSize: number | null;
  fit: string | null;
  reamMaxBp?: boolean;
  mdrCode: string | null;
  mdrNeeded?: boolean;
  mdrVersion: string | null;
  ndiNameInitials: string | null;
  ndiInspectionDate: Date | null;
  ndiFinished: boolean;
  inspectionStatus: string | null;
  mdrResubmit?: boolean;
  totalStackupLength?: string | null;
  stackUp?: number | null;
  sleeveBushings?: string | null;
  countersinked?: boolean;
  clean?: boolean;
  cutSleeveBushing?: boolean;
  installed?: boolean;
  primer?: boolean;
  surfaceCorrosion?: boolean;
  nutplateInspection?: string | null;
  nutplateSurfaceCorrosion?: string | null;
  nutplateTest?: string | null;
  totalStructureThickness?: string | null;
  flexhone?: string | null;
  flexndi?: boolean;
  examplePart?: string | null;
  cleanAlcoholAlodine?: boolean;
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
  aircraftId?: number | null;
  aircraftAn?: string | null;
  aircraftSerialNumber?: string | null;
  aircraftArrivalDate?: Date | null;
  panelId: number | null;
  panelNumber?: number | null;
  holeIds?: string | null;
  resubmit?: boolean;
  requestSent?: boolean;
  mdrNumber: string | null;
  mdrVersion: string | null;
  edNumber?: string | null;
  subject: string | null;
  status: string | null;
  dcmCheck?: string | null;
  submittedBy: string | null;
  submitListDate?: Date | null;
  requestDate: Date | null;
  needDate: Date | null;
  approvalDate?: Date | null;
  approved: boolean;
  tier2?: boolean;
}

export interface MdrRequestDetailInput {
  panelId: number | null;
  tve: string | null;
  panelNumber: number | null;
  taskType: string | null;
  fmsOrNonFms: string | null;
  releasability: string | null;
  technicalProductNumber: string | null;
  technicalProductTitle: string | null;
  submitterName: string | null;
  location: string | null;
  mdrType: string | null;
  serialNumber: string | null;
  partNumber: string | null;
  internalReferenceNumber: string | null;
  crEcp: string | null;
  discrepancyType: string | null;
  causeCodeDiscrepantWork: string | null;
  resubmitReason: string | null;
  defectCode: string | null;
  accessLocation: string | null;
  dateDueToField: Date | null;
  lcn: string | null;
  lcnDescription: string | null;
  inspectionCriteria: string | null;
  mgiRequired: string | null;
  mgiNumber: string | null;
  discoveredDuring: string | null;
  whenDiscovered: string | null;
  discoveredBy: string | null;
  dateDiscovered: Date | null;
  problemStatement: string | null;
  technicalProductDetailsSummary: string | null;
  tms: string | null;
  email: string | null;
  confirmEmail: string | null;
}

export interface CreateMdrRemarkInput {
  remarkIndex: number;
  remarkText: string;
  remarkDatetime: Date | null;
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
  bpDamageClean?: string | null;
  finalHoleSize: number | null;
  fit: string | null;
  reamMaxBp?: boolean;
  mdrCode: string | null;
  mdrNeeded?: boolean;
  mdrVersion: string | null;
  ndiNameInitials: string | null;
  ndiInspectionDate: Date | null;
  ndiFinished: boolean;
  inspectionStatus: string | null;
  mdrResubmit?: boolean;
  totalStackupLength?: string | null;
  stackUp?: number | null;
  sleeveBushings?: string | null;
  countersinked?: boolean;
  clean?: boolean;
  cutSleeveBushing?: boolean;
  installed?: boolean;
  primer?: boolean;
  surfaceCorrosion?: boolean;
  nutplateInspection?: string | null;
  nutplateSurfaceCorrosion?: string | null;
  nutplateTest?: string | null;
  totalStructureThickness?: string | null;
  flexhone?: string | null;
  flexndi?: boolean;
  examplePart?: string | null;
  cleanAlcoholAlodine?: boolean;
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

export interface CreateAircraftInput {
  an: string;
  serialNumber: string | null;
}

export interface CreatePanelInput {
  aircraftId: number;
  panelNumber: number;
}

export interface CreateAppUserInput {
  username: string;
  password: string;
  role: 'engineer' | 'reviewer' | 'admin';
  isActive?: boolean;
}

export interface UserAuditFilterInput {
  action?: string | null;
  username?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  limit?: number | null;
}
