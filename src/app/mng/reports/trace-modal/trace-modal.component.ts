import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, model, effect, signal } from '@angular/core';
import {
  ScoreTraceResponse,
  StudentResultTraceResponse,
} from '@models/measurement/measurement.model';
import { ReportService } from '@services/measurement/report.service';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-trace-modal',
  standalone: true,
  imports: [
    CommonModule,
    NzModalModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzSpinModule,
    NzAlertModule,
    NzDescriptionsModule,
  ],
  templateUrl: './trace-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TraceModalComponent {
  private reportSvc = inject(ReportService);

  visible = model<boolean>(false);
  studentResultId = input<string | null>(null);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly traceChain = signal<StudentResultTraceResponse[]>([]);
  readonly scoreTrace = signal<ScoreTraceResponse | null>(null);

  constructor() {
    effect(() => {
      const isOpen = this.visible();
      const id = this.studentResultId();
      if (isOpen && id) {
        this.loadInitialTrace(id);
      }
    });
  }

  private loadInitialTrace(id: string): void {
    this.traceChain.set([]);
    this.scoreTrace.set(null);
    this.drillDownStudentResult(id);
  }

  drillDownStudentResult(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportSvc.traceStudentResult(id).subscribe({
      next: res => {
        this.traceChain.update(chain => {
          const idx = chain.findIndex(c => c.id === res.id);
          return idx >= 0 ? chain.slice(0, idx + 1) : [...chain, res];
        });
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const msg = (err.error as { message?: string; } | null)?.message;
        this.error.set(msg ?? 'Không thể truy vết kết quả này.');
        this.loading.set(false);
      },
    });
  }

  drillDownScore(scoreId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportSvc.traceScore(scoreId).subscribe({
      next: res => {
        this.scoreTrace.set(res);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const msg = (err.error as { message?: string; } | null)?.message;
        this.error.set(msg ?? 'Không thể truy vết điểm gốc.');
        this.loading.set(false);
      },
    });
  }

  close(): void {
    this.visible.set(false);
  }
}
