import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ASSESSMENT_STATUS_DISPLAY } from '@constants/assessment-display.constant';
import { UrlConstant } from '@constants/url.constant';
import { IAssessment, IAssessmentScoreItem } from '@models/assessment/assessment.model';
import { IUserError } from '@models/common/user-error.model';
import { AssessmentService, ScoreExportFormat } from '@services/assessment/assessment.service';
import { toUserError } from '@services/common/api-error.util';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { BloomLevelLabelComponent } from '@widget/level-label/bloom-level-label.component';
import { TestDataFlagComponent } from '@widget/test-data-flag/test-data-flag.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ToastrService } from 'ngx-toastr';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, Subject } from 'rxjs';
import { formatNumber } from '../assessments.util';

export interface IScoreColumn {
  key: string;
  itemCode: string;
  cloCode: string;
  maxScore: number;
}

export interface IStudentScoreRow {
  studentId: string;
  studentCode: string;
  studentName: string;
  cells: Record<string, number | null>;
  totalRaw: number;
  totalMax: number;
  percentage: number | null;
}

type ScoreViewMode = 'MATRIX' | 'DETAIL';

function fileNameFromDisposition(header: string | null, fallback: string): string {
  const match = header ? /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header) : null;
  return match ? decodeURIComponent(match[1]) : fallback;
}

@Component({
  selector: 'app-assessment-scores',
  templateUrl: './assessment-scores.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, DecimalPipe, FormsModule, RouterLink,
    NzButtonModule, NzPaginationModule, NzTableModule, NzTagModule,
    BloomLevelLabelComponent, DisplayChipComponent, ErrorStateComponent, TestDataFlagComponent,
  ],
})
export class AssessmentScoresComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly assessmentSvc = inject(AssessmentService);
  private readonly toastr = inject(ToastrService, { optional: true });

  readonly id = input.required<string>();

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly statusDisplay = ASSESSMENT_STATUS_DISPLAY;
  protected readonly formatNumber = formatNumber;

  readonly assessment = signal<IAssessment | null>(null);
  readonly scores = signal<IAssessmentScoreItem[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal<IUserError | null>(null);
  readonly exportingFormat = signal<ScoreExportFormat | null>(null);

  readonly page = signal(0);
  readonly size = signal(20);
  readonly totalStudents = signal(0);

  readonly searchText = signal('');
  readonly viewMode = signal<ScoreViewMode>('MATRIX');

  private readonly searchSubject$ = new Subject<string>();

  /** Các cột câu hỏi + CLO theo thứ tự xuất hiện ổn định trên trang hiện tại. */
  readonly matrixColumns = computed<IScoreColumn[]>(() => {
    const colMap = new Map<string, IScoreColumn>();
    for (const item of this.scores()) {
      const key = `${item.itemId}::${item.cloId}`;
      if (!colMap.has(key)) {
        colMap.set(key, {
          key,
          itemCode: item.itemCode,
          cloCode: item.cloCode,
          maxScore: item.maxScore,
        });
      }
    }
    return Array.from(colMap.values()).sort((a, b) => {
      const byItem = a.itemCode.localeCompare(b.itemCode, undefined, { numeric: true });
      return byItem !== 0 ? byItem : a.cloCode.localeCompare(b.cloCode, undefined, { numeric: true });
    });
  });

  /** Bảng tổng hợp theo từng sinh viên (nhóm từ `content` trang hiện tại do backend đã gom đủ dòng theo sinh viên). */
  readonly studentRows = computed<IStudentScoreRow[]>(() => {
    const cols = this.matrixColumns();
    const grouped = new Map<string, IStudentScoreRow>();

    for (const s of this.scores()) {
      const name = s.studentName ?? '';
      let row = grouped.get(s.studentId);
      if (!row) {
        const emptyCells: Record<string, number | null> = {};
        for (const c of cols) {
          emptyCells[c.key] = null;
        }
        row = {
          studentId: s.studentId,
          studentCode: s.studentCode,
          studentName: name,
          cells: emptyCells,
          totalRaw: 0,
          totalMax: 0,
          percentage: null,
        };
        grouped.set(s.studentId, row);
      }
      const key = `${s.itemId}::${s.cloId}`;
      row.cells[key] = s.rawScore;
      row.totalRaw += s.rawScore;
      row.totalMax += s.maxScore;
    }

    return Array.from(grouped.values())
      .map(r => ({
        ...r,
        percentage: r.totalMax > 0 ? (r.totalRaw / r.totalMax) * 100 : null,
      }))
      .sort((a, b) => a.studentCode.localeCompare(b.studentCode, undefined, { numeric: true }));
  });

  readonly uniqueStudentCount = computed(() => this.totalStudents());

  readonly averagePercentage = computed<number | null>(() => {
    const rows = this.studentRows().filter(r => r.percentage !== null);
    if (rows.length === 0) {
      return null;
    }
    const sum = rows.reduce((acc, r) => acc + (r.percentage ?? 0), 0);
    return sum / rows.length;
  });

  ngOnInit(): void {
    this.searchSubject$
      .pipe(
        map(q => q.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.page.set(0);
        this.loadScores();
      });

    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    const assessmentId = this.id();
    forkJoin({
      assessment: this.assessmentSvc.getAssessment(assessmentId).pipe(catchError(() => of(null))),
      scoresPage: this.assessmentSvc.getScores(
        assessmentId,
        this.searchText().trim() || undefined,
        this.page(),
        this.size(),
      ),
    }).subscribe({
      next: ({ assessment, scoresPage }) => {
        this.assessment.set(assessment);
        this.applyScoresPage(scoresPage);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  loadScores(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.assessmentSvc
      .getScores(
        this.id(),
        this.searchText().trim() || undefined,
        this.page(),
        this.size(),
      )
      .subscribe({
        next: scoresPage => {
          this.applyScoresPage(scoresPage);
          this.isLoading.set(false);
        },
        error: err => {
          this.isLoading.set(false);
          this.loadError.set(toUserError(err));
        },
      });
  }

  onSearchChange(keyword: string): void {
    this.searchText.set(keyword);
    this.searchSubject$.next(keyword);
  }

  onPageIndexChange(page1Indexed: number): void {
    this.page.set(Math.max(0, page1Indexed - 1));
    this.loadScores();
  }

  onPageSizeChange(newSize: number): void {
    this.size.set(newSize);
    this.page.set(0);
    this.loadScores();
  }

  exportScores(format: ScoreExportFormat = 'csv'): void {
    if (this.exportingFormat()) {
      return;
    }
    this.exportingFormat.set(format);
    const assessmentId = this.id();
    const search = this.searchText().trim() || undefined;
    this.assessmentSvc.exportScores(assessmentId, format, search).subscribe({
      next: res => {
        this.exportingFormat.set(null);
        const blob = res.body;
        if (!blob) {
          return;
        }
        const fallback = `${this.assessment()?.code ?? 'assessment'}-scores.${format}`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileNameFromDisposition(res.headers.get('Content-Disposition'), fallback);
        link.click();
        URL.revokeObjectURL(url);
      },
      error: err => {
        this.exportingFormat.set(null);
        this.toastr?.error(toUserError(err).message);
      },
    });
  }

  exportCsv(): void {
    this.exportScores('csv');
  }

  private applyScoresPage(scoresPage: {
    content: IAssessmentScoreItem[];
    page: number;
    size: number;
    totalElements: number;
  }): void {
    const content = scoresPage?.content ?? [];
    this.scores.set(content);
    this.page.set(scoresPage?.page ?? this.page());
    this.size.set(scoresPage?.size ?? this.size());
    this.totalStudents.set(scoresPage?.totalElements ?? new Set(content.map(s => s.studentId)).size);
  }
}
