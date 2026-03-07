import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CreateMdrCaseInput } from '../models/corrosion.inputs';
import { Aircraft, MdrCase, PanelSummary } from '../models/corrosion.models';
import { CorrosionService } from '../services/corrosion.service';

@Component({
  selector: 'app-mdr-management-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Hoofdmenu</a>

      <section class="card">
        <h2>MDR Management</h2>
        <p class="subtitle">MDR dashboard met queue-overzicht en gecontroleerde status-overgangen.</p>

        <div class="filters">
          <label class="field">
            <span>Aircraft</span>
            <select [ngModel]="selectedAircraftId()" (ngModelChange)="onAircraftChange($event)">
              @for (a of aircraft(); track a.id) {
                <option [ngValue]="a.id">{{ a.an }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span>Panel</span>
            <select [ngModel]="selectedPanelId()" (ngModelChange)="onPanelChange($event)">
              @for (p of panels(); track p.id) {
                <option [ngValue]="p.id">Panel {{ p.panelNumber }}</option>
              }
            </select>
          </label>
        </div>

        <div class="actions" style="margin-top:12px;">
          @if (!creatingMode() && !editingId()) {
            <button class="btn-primary" type="button" (click)="startCreate()">+ Nieuwe MDR case</button>
          }
          <span class="msg">{{ message() }}</span>
        </div>

        @if (creatingMode() || editingId()) {
          <form class="editor" (ngSubmit)="save()">
            <h3>{{ editingId() ? 'MDR case wijzigen' : 'Nieuwe MDR case' }}</h3>
            <div class="grid">
              <label class="field"><span>MDR Number</span><input [(ngModel)]="form.mdrNumber" name="mdrNumber" /></label>
              <label class="field"><span>Versie</span><input [(ngModel)]="form.mdrVersion" name="mdrVersion" /></label>
              <label class="field">
                <span>Status</span>
                <select [(ngModel)]="form.status" name="status">
                  @for (opt of mdrStatusOptions; track opt) {
                    <option [value]="opt">{{ opt }}</option>
                  }
                </select>
              </label>
              <label class="field"><span>Submitted by</span><input [(ngModel)]="form.submittedBy" name="submittedBy" /></label>
              <label class="field full"><span>Subject</span><input [(ngModel)]="form.subject" name="subject" /></label>
            </div>
            <div class="actions">
              <button class="btn-primary" type="submit">{{ editingId() ? 'Opslaan wijzigingen' : 'Aanmaken' }}</button>
              <button class="btn-secondary" type="button" (click)="resetForm()">Annuleren</button>
            </div>
          </form>
        }

        @if (loading()) {
          <p class="state">Laden...</p>
        } @else {
          <div class="queue-grid">
            <section class="queue-card">
              <h3>Awaiting Request ({{ awaiting().length }})</h3>
              @if (awaiting().length === 0) { <p class="state">Leeg</p> } @else {
                @for (m of awaiting(); track m.id) { <article class="case-row">{{ caseLabel(m) }} <div class="row-actions">@for (next of nextStatuses(m.status); track next) {<button class="btn-secondary inline" (click)="transition(m.id, next)">{{ next }}</button>}<button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button></div></article> }
              }
            </section>

            <section class="queue-card">
              <h3>Request ({{ requestQ().length }})</h3>
              @if (requestQ().length === 0) { <p class="state">Leeg</p> } @else {
                @for (m of requestQ(); track m.id) { <article class="case-row">{{ caseLabel(m) }} <div class="row-actions">@for (next of nextStatuses(m.status); track next) {<button class="btn-secondary inline" (click)="transition(m.id, next)">{{ next }}</button>}<button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button></div></article> }
              }
            </section>

            <section class="queue-card">
              <h3>Submit ({{ submitQ().length }})</h3>
              @if (submitQ().length === 0) { <p class="state">Leeg</p> } @else {
                @for (m of submitQ(); track m.id) { <article class="case-row">{{ caseLabel(m) }} <div class="row-actions">@for (next of nextStatuses(m.status); track next) {<button class="btn-secondary inline" (click)="transition(m.id, next)">{{ next }}</button>}<button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button></div></article> }
              }
            </section>

            <section class="queue-card">
              <h3>Resubmit ({{ resubmitQ().length }})</h3>
              @if (resubmitQ().length === 0) { <p class="state">Leeg</p> } @else {
                @for (m of resubmitQ(); track m.id) { <article class="case-row">{{ caseLabel(m) }} <div class="row-actions">@for (next of nextStatuses(m.status); track next) {<button class="btn-secondary inline" (click)="transition(m.id, next)">{{ next }}</button>}<button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button></div></article> }
              }
            </section>
          </div>

          <div class="table-wrap" style="margin-top:14px;">
            <table>
              <thead>
                <tr><th>ID</th><th>MDR Number</th><th>Subject</th><th>Status</th><th>Acties</th></tr>
              </thead>
              <tbody>
                @for (m of mdrCases(); track m.id) {
                  <tr>
                    <td>#{{ m.id }}</td>
                    <td>{{ m.mdrNumber ?? '-' }}</td>
                    <td>{{ m.subject ?? '-' }}</td>
                    <td>{{ m.status ?? '-' }}</td>
                    <td>
                      <button class="btn-secondary inline" (click)="startEdit(m)">Wijzigen</button>
                      <button class="btn-danger inline" (click)="deleteMdr(m.id)">Verwijder</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </main>
  `,
  styles: `
    .page{max-width:1150px;margin:0 auto;padding:24px}.back{text-decoration:none;color:#334155;font-weight:600}
    .card{border:1px solid #e2e8f0;border-radius:14px;padding:20px;background:#fff}.subtitle{color:#64748b}
    .filters{display:grid;grid-template-columns:repeat(2,minmax(0,260px));gap:10px;margin:10px 0}
    .field{display:grid;gap:6px;font-weight:600;color:#334155} input,select{padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px}
    .editor{margin:12px 0;padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.field.full{grid-column:1/-1}
    .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}.msg{color:#15803d;font-weight:600}
    .btn-primary,.btn-secondary,.btn-danger{border:0;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}
    .btn-primary{background:#2563eb;color:#fff}.btn-secondary{background:#e2e8f0;color:#334155}.btn-danger{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
    .inline{margin-right:6px;padding:6px 10px}
    .queue-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px}
    .queue-card{border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#f8fafc}
    .queue-card h3{margin:0 0 8px;font-size:1rem}
    .case-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #e5e7eb}
    .case-row:first-of-type{border-top:0}
    .row-actions{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
    .table-wrap{margin-top:14px;border:1px solid #e2e8f0;border-radius:12px;overflow:auto} table{width:100%;border-collapse:collapse} th,td{padding:10px 12px;border-bottom:1px solid #eef2f7;text-align:left}
    .state{color:#64748b}
    @media(max-width:900px){.queue-grid{grid-template-columns:1fr}}
    @media(max-width:760px){.filters,.grid{grid-template-columns:1fr}}
  `,
})
export class MdrManagementPage implements OnInit {
  private readonly svc = inject(CorrosionService);

  protected readonly aircraft = signal<Aircraft[]>([]);
  protected readonly panels = signal<PanelSummary[]>([]);
  protected readonly mdrCases = signal<MdrCase[]>([]);
  protected readonly selectedAircraftId = signal<number | null>(null);
  protected readonly selectedPanelId = signal<number | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly creatingMode = signal<boolean>(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly message = signal<string>('');
  protected readonly mdrStatusOptions = ['Draft', 'Awaiting Request', 'Request', 'Submit', 'Resubmit', 'In Review', 'Approved', 'Rejected', 'Closed'];

  private readonly transitions: Record<string, string[]> = {
    Draft: ['Awaiting Request', 'Request'],
    'Awaiting Request': ['Request', 'Closed'],
    Request: ['Submit', 'Resubmit', 'Closed'],
    Submit: ['In Review', 'Resubmit', 'Closed'],
    Resubmit: ['Submit', 'In Review', 'Closed'],
    'In Review': ['Approved', 'Rejected', 'Resubmit', 'Closed'],
    Approved: ['Closed'],
    Rejected: ['Resubmit', 'Closed'],
    Closed: [],
  };

  protected readonly awaiting = computed(() => this.mdrCases().filter((x) => x.status === 'Awaiting Request'));
  protected readonly requestQ = computed(() => this.mdrCases().filter((x) => x.status === 'Request'));
  protected readonly submitQ = computed(() => this.mdrCases().filter((x) => x.status === 'Submit'));
  protected readonly resubmitQ = computed(() => this.mdrCases().filter((x) => x.status === 'Resubmit'));

  protected form: CreateMdrCaseInput = {
    panelId: null,
    mdrNumber: null,
    mdrVersion: null,
    subject: null,
    status: 'Draft',
    submittedBy: null,
    requestDate: null,
    needDate: null,
    approved: false,
  };

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const aircraft = await firstValueFrom(this.svc.listAircraft());
    this.aircraft.set(aircraft);
    if (aircraft[0]) {
      this.selectedAircraftId.set(aircraft[0].id);
      await this.onAircraftChange(aircraft[0].id);
    }
    this.loading.set(false);
  }

  async onAircraftChange(id: number): Promise<void> {
    this.loading.set(true);
    this.selectedAircraftId.set(Number(id));
    const panels = await firstValueFrom(this.svc.listPanels(Number(id)));
    this.panels.set(panels);
    const first = panels[0];
    if (first) {
      this.selectedPanelId.set(first.id);
      await this.onPanelChange(first.id);
    } else {
      this.mdrCases.set([]);
    }
    this.resetForm();
    this.loading.set(false);
  }

  async onPanelChange(id: number): Promise<void> {
    this.loading.set(true);
    this.selectedPanelId.set(Number(id));
    this.mdrCases.set(await firstValueFrom(this.svc.listMdrCases(Number(id))));
    this.resetForm();
    this.loading.set(false);
  }

  startCreate(): void {
    this.resetForm();
    this.creatingMode.set(true);
  }

  startEdit(row: MdrCase): void {
    this.creatingMode.set(false);
    this.editingId.set(row.id);
    this.form = {
      panelId: row.panelId,
      mdrNumber: row.mdrNumber,
      mdrVersion: row.mdrVersion,
      subject: row.subject,
      status: row.status,
      submittedBy: row.submittedBy,
      requestDate: row.requestDate,
      needDate: row.needDate,
      approved: row.approved,
    };
    this.message.set('');
  }

  resetForm(): void {
    this.creatingMode.set(false);
    this.editingId.set(null);
    const panel = this.panels().find((p) => p.id === this.selectedPanelId());
    this.form = {
      panelId: this.selectedPanelId(),
      mdrNumber: null,
      mdrVersion: null,
      subject: panel ? `Panel ${panel.panelNumber}` : null,
      status: 'Draft',
      submittedBy: null,
      requestDate: null,
      needDate: null,
      approved: false,
    };
    this.message.set('');
  }

  async save(): Promise<void> {
    const panelId = this.selectedPanelId();
    if (!panelId) return;

    const payload: CreateMdrCaseInput = { ...this.form, panelId };

    try {
      if (this.editingId()) {
        await firstValueFrom(this.svc.updateMdrCase(this.editingId()!, payload));
        this.message.set('MDR case gewijzigd ✅');
      } else {
        await firstValueFrom(this.svc.createMdrCase(payload));
        this.message.set('MDR case aangemaakt ✅');
      }
      await this.onPanelChange(panelId);
      this.creatingMode.set(false);
      this.editingId.set(null);
    } catch (e: any) {
      this.message.set(`Opslaan mislukt ❌ ${e?.error?.detail ?? ''}`.trim());
    }
  }

  async transition(id: number, toStatus: string): Promise<void> {
    try {
      await firstValueFrom(this.svc.transitionMdrCase(id, toStatus));
      const panelId = this.selectedPanelId();
      if (panelId) await this.onPanelChange(panelId);
      this.message.set(`Status bijgewerkt naar ${toStatus} ✅`);
    } catch (e: any) {
      this.message.set(`Transitie mislukt ❌ ${e?.error?.detail ?? ''}`.trim());
    }
  }

  nextStatuses(status: string | null): string[] {
    return this.transitions[status ?? 'Draft'] ?? [];
  }

  caseLabel(m: MdrCase): string {
    return `#${m.id} ${m.mdrNumber ?? '(zonder nummer)'} — ${m.subject ?? '(zonder subject)'}`;
  }

  async deleteMdr(id: number): Promise<void> {
    if (!confirm('MDR case verwijderen?')) return;
    await firstValueFrom(this.svc.deleteMdrCase(id));
    const panelId = this.selectedPanelId();
    if (panelId) await this.onPanelChange(panelId);
  }
}
