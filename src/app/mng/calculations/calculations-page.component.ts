import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ISection } from '@models/course/section.model';
import { ITerm } from '@models/course/term.model';
import {
  AggregateResultResponse,
  CalculationRunRequest,
  CalculationRunResponse,
  CalculationScope,
  ResultLevel,
  StudentResultResponse,
} from '@models/measurement/measurement.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { TraceModalComponent } from '@mng/reports/trace-modal/trace-modal.component';
import { SectionService } from '@services/course/section.service';
import { TermService } from '@services/course/term.service';
import { CalculationService } from '@services/measurement/calculation.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-calculations-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzButtonModule,
    NzSelectModule,
    NzInputModule,
    NzCheckboxModule,
    NzTableModule,
    NzTagModule,
    NzTabsModule,
    NzAlertModule,
    TraceModalComponent,
  ],
  templateUrl: './calculations-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalculationsPageComponent implements OnInit {
  private calcSvc = inject(CalculationService);
  private pvSvc = inject(ProgramVersionService);
  private sectionSvc = inject(SectionService);
  private termSvc = inject(TermService);
  private toastr = inject(ToastrService);

  readonly runs = signal<CalculationRunResponse[]>([]);
  readonly programVersions = signal<IProgramVersion[]>([]);
  readonly sections = signal<ISection[]>([]);
  readonly terms = signal<ITerm[]>([]);

  readonly selectedScope = signal<CalculationScope>('SECTION');
  readonly selectedProgramVersionId = signal<string | null>(null);
  readonly selectedSectionIds = signal<string[]>([]);
  readonly selectedTermId = signal<string | null>(null);
  readonly cohortsText = signal<string>('');
  readonly isOfficial = signal<boolean>(true);
  readonly running = signal<boolean>(false);

  readonly selectedRun = signal<CalculationRunResponse | null>(null);
  readonly selectedLevel = signal<ResultLevel | ''>('');
  readonly aggregateResults = signal<AggregateResultResponse[]>([]);
  readonly studentResults = signal<StudentResultResponse[]>([]);
  readonly loadingDetails = signal<boolean>(false);

  readonly traceVisible = signal<boolean>(false);
  readonly traceStudentResultId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.calcSvc.getCalculationRuns().subscribe({
      next: list => {
        this.runs.set(list);
        if (list.length > 0 && !this.selectedRun()) {
          this.selectRun(list[0]);
        }
      },
      error: () => this.toastr.error('Không thể tải danh sách lượt tính toán'),
    });

    this.pvSvc.getProgramVersions(0, 100).subscribe({
      next: res => this.programVersions.set(res.content ?? []),
      error: () => undefined,
    });

    this.sectionSvc.getSections().subscribe({
      next: list => this.sections.set(list),
      error: () => undefined,
    });

    this.termSvc.getTerms().subscribe({
      next: list => this.terms.set(list),
      error: () => undefined,
    });
  }

  triggerRun(): void {
    const scope = this.selectedScope();
    if (scope === 'SECTION' && this.selectedSectionIds().length === 0) {
      this.toastr.warning('Vui lòng chọn ít nhất một lớp học phần cho phạm vi SECTION');
      return;
    }

    const cohorts = this.cohortsText()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const request: CalculationRunRequest = {
      scope,
      programVersionId: this.selectedProgramVersionId(),
      sectionIds: this.selectedSectionIds(),
      termId: this.selectedTermId(),
      cohorts,
      official: this.isOfficial(),
    };

    this.running.set(true);
    this.calcSvc.triggerCalculation(request).subscribe({
      next: run => {
        this.toastr.success('Chạy đo lường 4 cấp độ thành công');
        this.running.set(false);
        this.runs.update(prev => [run, ...prev]);
        this.selectRun(run);
      },
      error: (err: HttpErrorResponse) => {
        const msg = (err.error as { message?: string; } | null)?.message;
        this.toastr.error(msg ?? 'Lỗi khi chạy tính toán đo lường');
        this.running.set(false);
      },
    });
  }

  selectRun(run: CalculationRunResponse): void {
    this.selectedRun.set(run);
    this.loadRunDetails();
  }

  onLevelFilterChange(level: ResultLevel | ''): void {
    this.selectedLevel.set(level);
    this.loadRunDetails();
  }

  loadRunDetails(): void {
    const run = this.selectedRun();
    if (!run) return;
    const level = this.selectedLevel() || undefined;
    this.loadingDetails.set(true);

    this.calcSvc.getAggregateResults(run.id, level).subscribe({
      next: res => this.aggregateResults.set(res),
      error: () => this.aggregateResults.set([]),
    });

    this.calcSvc.getStudentResults(run.id, level).subscribe({
      next: res => {
        this.studentResults.set(res);
        this.loadingDetails.set(false);
      },
      error: () => {
        this.studentResults.set([]);
        this.loadingDetails.set(false);
      },
    });
  }

  openTrace(studentResultId: string): void {
    this.traceStudentResultId.set(studentResultId);
    this.traceVisible.set(true);
  }
}
