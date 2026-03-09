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
  mdrResubmit: boolean;
  totalStackupLength: string | null;
  stackUp: number | null;
  sleeveBushings: string | null;
  countersinked: boolean;
  clean: boolean;
  cutSleeveBushing: boolean;
  installed: boolean;
  primer: boolean;
  surfaceCorrosion: boolean;
  nutplateInspection: string | null;
  nutplateSurfaceCorrosion: string | null;
  totalStructureThickness: string | null;
  flexhone: string | null;
  flexndi: boolean;
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
  aircraftId: number | null;
  aircraftAn: string | null;
  aircraftSerialNumber: string | null;
  aircraftArrivalDate: Date | null;
  panelId: number | null;
  panelNumber: number | null;
  holeIds: string | null;
  resubmit: boolean;
  requestSent: boolean;
  mdrNumber: string | null;
  mdrVersion: string | null;
  edNumber: string | null;
  subject: string | null;
  status: string | null;
  dcmCheck: string | null;
  submittedBy: string | null;
  submitListDate: Date | null;
  requestDate: Date | null;
  needDate: Date | null;
  approvalDate: Date | null;
  approved: boolean;
  tier2: boolean;
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
  problemStatement: string | null;
  discoveredBy: string | null;
  dateDiscovered: Date | null;
  technicalProductDetailsSummary: string | null;
  tms: string | null;
  email: string | null;
  confirmEmail: string | null;
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

export interface HoleTrackerRow {
  holeId: number;
  holeNumber: number;
  panelId: number;
  panelNumber: number;
  aircraftId: number | null;
  aircraftAn: string | null;
  maxBpDiameter: number | null;
  maxStepSize: number | null;
  flexhoneNeeded: boolean;
  reamingStepCount: number;
  queueStatus: 'max_bp' | 'flexhone' | 'reaming_steps';
}

export interface InstallationTrackerRow {
  holeId: number;
  holeNumber: number;
  panelId: number;
  panelNumber: number;
  aircraftId: number | null;
  aircraftAn: string | null;
  orderedParts: number;
  deliveredParts: number;
  pendingParts: number;
  installationReady: boolean;
  queueStatus: 'ready_for_installation' | 'finished_installation';
}

export interface CorrosionReportRow {
  holeId: number;
  aircraftAn: string | null;
  panelNumber: number;
  holeNumber: number;
  inspectionStatus: string | null;
  mdrCode: string | null;
  mdrVersion: string | null;
  ndiFinished: boolean;
  finalHoleSize: number | null;
  maxBpDiameter: number | null;
  createdAt: Date;
}

export interface MdrPowerpointInfoRow {
  mdrCaseId: number;
  panelId: number | null;
  panelNumber: number | null;
  aircraftAn: string | null;
  mdrNumber: string | null;
  mdrVersion: string | null;
  subject: string | null;
  status: string | null;
  submittedBy: string | null;
  requestDate: Date | null;
  needDate: Date | null;
}

export interface LookupStatusCode {
  id: number;
  statusCode: string | null;
  statusCodeDcm: string | null;
}

export interface LookupMdrOption {
  id: number;
  lcn: string | null;
  discrepancyType: string | null;
  causeCodeDiscrepantWork: string | null;
  whenDiscovered: string | null;
  discoveredBy: string | null;
}

export interface AppUser {
  id: number;
  username: string;
  role: 'engineer' | 'reviewer' | 'admin';
  isActive: boolean;
}
