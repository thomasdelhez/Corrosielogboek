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
