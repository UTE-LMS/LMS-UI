import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ASSESSMENT_STATUS_DISPLAY } from '@constants/assessment-display.constant';
import { UrlConstant } from '@constants/url.constant';
import { IAssessment, IAssessmentScoreItem } from '@models/assessment/assessment.model';
import { IUserError } from '@models/common/user-error.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { toUserError } from '@services/common/api-error.util';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { BloomLevelLabelComponent } from '@widget/level-label/bloom-level-label.component';
import { TestDataFlagComponent } from '@widget/test-data-flag/test-data-flag.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { catchError, forkJoin, of } from 'rxjs';
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

@Component({
  selector: 'app-assessment-scores',
  templateUrl: './assessment-scores.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, DecimalPipe, FormsModule, RouterLink,
    NzButtonModule, NzTableModule, NzTagModule,
    BloomLevelLabelComponent, DisplayChipComponent, ErrorStateComponent, TestDataFlagComponent,
  ],
})
export class AssessmentScoresComponent implements OnInit {
  private readonly assessmentSvc = inject(AssessmentService);

  readonly id = input.required<string>();

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly statusDisplay = ASSESSMENT_STATUS_DISPLAY;
  protected readonly formatNumber = formatNumber;

  readonly assessment = signal<IAssessment | null>(null);
  readonly scores = signal<IAssessmentScoreItem[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal<IUserError | null>(null);

  readonly searchText = signal('');
  readonly viewMode = signal<ScoreViewMode>('MATRIX');

  readonly filteredScores = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    const list = this.scores();
    if (!q) {
      return list;
    }
    return list.filter(s => s.studentCode.toLowerCase().includes(q)
      || (s.studentName ?? '').toLowerCase().includes(q)
      || s.itemCode.toLowerCase().includes(q)
      || s.cloCode.toLowerCase().includes(q));
  });

  /** Các cột câu hỏi + CLO theo thứ tự xuất hiện ổn định. */
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

  /** Bảng tổng hợp theo từng sinh viên (lọc theo MSSV hoặc họ tên). */
  readonly studentRows = computed<IStudentScoreRow[]>(() => {
    const cols = this.matrixColumns();
    const grouped = new Map<string, IStudentScoreRow>();
    const q = this.searchText().trim().toLowerCase();

    for (const s of this.scores()) {
      const name = s.studentName ?? '';
      if (q && !s.studentCode.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) {
        continue;
      }
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

  readonly uniqueStudentCount = computed(() => new Set(this.scores().map(s => s.studentId)).size);

  readonly averagePercentage = computed<number | null>(() => {
    const rows = this.studentRows().filter(r => r.percentage !== null);
    if (rows.length === 0) {
      return null;
    }
    const sum = rows.reduce((acc, r) => acc + (r.percentage ?? 0), 0);
    return sum / rows.length;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    const assessmentId = this.id();
    forkJoin({
      assessment: this.assessmentSvc.getAssessment(assessmentId).pipe(catchError(() => of(null))),
      scores: this.assessmentSvc.getScores(assessmentId),
    }).subscribe({
      next: ({ assessment, scores }) => {
        this.assessment.set(assessment);
        this.scores.set(scores ?? []);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  exportCsv(): void {
    const cols = this.matrixColumns();
    const rows = this.studentRows();
    if (rows.length === 0) {
      return;
    }
    const escapeCell = (val: string): string => {
      const safe = /^[=+\-@]/.test(val) ? `'${val}` : val;
      return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const headers = [
      'MSSV',
      'Họ tên',
      ...cols.map(c => `${c.itemCode} - ${c.cloCode} (Max: ${c.maxScore})`),
      'Tổng điểm',
      'Tổng tối đa',
      'Tỷ lệ (%)',
    ];
    const lines = rows.map(r => [
      r.studentCode,
      r.studentName,
      ...cols.map(c => (r.cells[c.key] !== null && r.cells[c.key] !== undefined ? String(r.cells[c.key]) : '')),
      String(Number(r.totalRaw.toFixed(2))),
      String(Number(r.totalMax.toFixed(2))),
      r.percentage !== null ? r.percentage.toFixed(1) : '',
    ].map(escapeCell).join(','));

    const csv = `\uFEFF${headers.map(escapeCell).join(',')}\n${lines.join('\n')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.assessment()?.code ?? 'assessment'}-scores.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
