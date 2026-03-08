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

export interface Aircraft {
  id: number;
  an: string;
  serialNumber: string | null;
}

export interface PanelSummary {
  id: number;
  aircraftId: number | null;
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

export interface MdrRequestDetail {
  id: number;
  panelId: number | null;
  tve: string | null;
  mdrType: string | null;
  serialNumber: string | null;
  partNumber: string | null;
  defectCode: string | null;
  problemStatement: string | null;
  discoveredBy: string | null;
  dateDiscovered: Date | null;
}

export interface MdrRemark {
  id: number;
  mdrCaseId: number;
  remarkIndex: number;
  remarkText: string;
  remarkDatetime: Date | null;
}

export interface OrderingTrackerRow {
  holeId: number;
  holeNumber: number;
  panelId: number;
  panelNumber: number;
  aircraftId: number | null;
  aircraftAn: string | null;
  inspectionStatus: string | null;
  orderedParts: number;
  deliveredParts: number;
  pendingParts: number;
  orderNeeded: boolean;
  orderInProgress: boolean;
  deliveryInProgress: boolean;
  installationReady: boolean;
}

export interface NdiQueueRow {
  holeId: number;
  holeNumber: number;
  panelId: number;
  panelNumber: number;
  aircraftId: number | null;
  aircraftAn: string | null;
  inspectionStatus: string | null;
  ndiNameInitials: string | null;
  ndiInspectionDate: Date | null;
  latestReportId: number | null;
  latestReportMethod: string | null;
  latestReportTools: string | null;
  queueStatus: 'check_tracker' | 'action_needed' | 'report_needed' | 'finished';
}

export interface InspectionQueueRow {
  holeId: number;
  holeNumber: number;
  panelId: number;
  panelNumber: number;
  aircraftId: number | null;
  aircraftAn: string | null;
  inspectionStatus: string | null;
  queueStatus: 'to_be_inspected' | 'marked_as_corroded' | 'marked_as_rifled' | 'marked_as_clean';
}
