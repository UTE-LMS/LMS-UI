import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ISection } from '@models/course/section.model';
import {
  CalculationRunResponse,
  ReportCreateRequest,
  ReportResponse,
  ReportType,
} from '@models/measurement/measurement.model';
import { TraceModalComponent } from '@mng/reports/trace-modal/trace-modal.component';
import { SectionService } from '@services/course/section.service';
import { CalculationService } from '@services/measurement/calculation.service';
import { ReportService } from '@services/measurement/report.service';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzButtonModule,
    NzSelectModule,
    NzInputModule,
    NzTableModule,
    NzTagModule,
    NzAlertModule,
    TraceModalComponent,
  ],
  templateUrl: './reports-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPageComponent implements OnInit {
  private reportSvc = inject(ReportService);
  private calcSvc = inject(CalculationService);
  private sectionSvc = inject(SectionService);
  private toastr = inject(ToastrService);

  readonly reports = signal<ReportResponse[]>([]);
  readonly successRuns = signal<CalculationRunResponse[]>([]);
  readonly sections = signal<ISection[]>([]);

  readonly selectedType = signal<ReportType>('PROGRAM_PLO');
  readonly selectedRunId = signal<string | null>(null);
  readonly selectedSectionId = signal<string | null>(null);
  readonly reportTitle = signal<string>('');
  readonly generating = signal<boolean>(false);

  readonly activeReport = signal<ReportResponse | null>(null);
  readonly traceVisible = signal<boolean>(false);
  readonly traceStudentResultId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.reportSvc.listReports().subscribe({
      next: list => {
        this.reports.set(list);
        if (list.length > 0 && !this.activeReport()) {
          this.activeReport.set(list[0]);
        }
      },
      error: () => this.toastr.error('Không thể tải danh sách báo cáo'),
    });

    this.calcSvc.getCalculationRuns().subscribe({
      next: runs => this.successRuns.set(runs.filter(r => r.status === 'SUCCESS')),
      error: () => undefined,
    });

    this.sectionSvc.getSections().subscribe({
      next: list => this.sections.set(list),
      error: () => undefined,
    });
  }

  generate(): void {
    const runId = this.selectedRunId();
    const type = this.selectedType();
    if (!runId) {
      this.toastr.warning('Vui lòng chọn một lượt tính toán đã hoàn tất (SUCCESS)');
      return;
    }
    if (type === 'SECTION_CLO' && !this.selectedSectionId()) {
      this.toastr.warning('Báo cáo SECTION_CLO yêu cầu chọn lớp học phần');
      return;
    }

    const request: ReportCreateRequest = {
      type,
      runId,
      title: this.reportTitle().trim() || undefined,
      sectionId: this.selectedSectionId() ?? undefined,
    };

    this.generating.set(true);
    this.reportSvc.generateReport(request).subscribe({
      next: rep => {
        this.toastr.success('Sinh báo cáo thành công');
        this.generating.set(false);
        this.reports.update(prev => [rep, ...prev]);
        this.activeReport.set(rep);
        this.reportTitle.set('');
      },
      error: (err: HttpErrorResponse) => {
        const msg = (err.error as { message?: string; } | null)?.message;
        this.toastr.error(msg ?? 'Không thể sinh báo cáo');
        this.generating.set(false);
      },
    });
  }

  selectReport(rep: ReportResponse): void {
    this.activeReport.set(rep);
  }

  exportCsv(rep: ReportResponse): void {
    this.reportSvc.exportReportCsv(rep.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report-${rep.id}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        this.toastr.success('Đã xuất tệp CSV báo cáo');
      },
      error: () => this.toastr.error('Không thể xuất tệp CSV'),
    });
  }

  openTrace(studentResultId: string): void {
    this.traceStudentResultId.set(studentResultId);
    this.traceVisible.set(true);
  }
}
