import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { IAssessment } from '@models/assessment/assessment.model';
import {
  IImportBatch,
  IImportColumnMapping,
  IImportRowError,
  ImportSourceSystem,
  ReimportPolicy,
} from '@models/assessment/score-import.model';
import { toUserError } from '@services/common/api-error.util';
import { AssessmentService } from '@services/assessment/assessment.service';
import { ScoreImportService } from '@services/assessment/score-import.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';

export type ScoreImportStep = 'UPLOAD' | 'PREVIEW';

@Component({
  selector: 'app-score-import',
  templateUrl: './score-import.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzSelectModule,
    NzTableModule,
  ],
})
export class ScoreImportComponent implements OnInit {
  readonly id = input.required<string>();

  private readonly assessmentSvc = inject(AssessmentService);
  private readonly scoreImportSvc = inject(ScoreImportService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;

  readonly assessment = signal<IAssessment | null>(null);
  readonly currentBatch = signal<IImportBatch | null>(null);
  readonly errors = signal<IImportRowError[]>([]);
  readonly file = signal<File | null>(null);
  readonly csvHeaders = signal<string[]>([]);
  readonly studentColumn = signal<string>('MSSV');
  readonly reimportPolicy = signal<ReimportPolicy>('REJECT_ON_CONFLICT');
  readonly sourceSystem = signal<ImportSourceSystem>('CSV');
  readonly isTemplateFormat = signal<boolean>(false);
  readonly isDownloadingTemplate = signal<boolean>(false);
  readonly itemMappings = signal<{
    column: string;
    itemId: string;
    itemCode: string;
    cloId?: string;
    maxScore?: number;
    multiClo?: boolean;
  }[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly step = signal<ScoreImportStep>('UPLOAD');
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAssessment();
  }

  loadAssessment(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.assessmentSvc.getAssessment(this.id()).subscribe({
      next: (a: IAssessment) => {
        this.assessment.set(a);
        this.isLoading.set(false);
        this.initItemMappings(a);
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.errorMessage.set(toUserError(err).message);
      },
    });
  }

  private initItemMappings(a: IAssessment): void {
    const mappings: {
      column: string;
      itemId: string;
      itemCode: string;
      cloId?: string;
      maxScore?: number;
      multiClo?: boolean;
    }[] = [];

    for (const item of a.items ?? []) {
      const itemId = item.id ?? item.code;
      const outcomes = item.outcomeMappings ?? [];
      if (outcomes.length > 0) {
        const multiClo = outcomes.length > 1;
        for (const om of outcomes) {
          mappings.push({
            column: '',
            itemId,
            itemCode: item.code,
            cloId: om.cloId,
            maxScore: om.maxScore,
            multiClo,
          });
        }
      } else {
        mappings.push({
          column: '',
          itemId,
          itemCode: item.code,
        });
      }
    }
    this.itemMappings.set(mappings);
  }

  downloadTemplateCsv(): void {
    const currentAss = this.assessment();
    if (!currentAss) {
      return;
    }
    this.isDownloadingTemplate.set(true);
    this.errorMessage.set(null);
    this.scoreImportSvc.downloadTemplateCsv(currentAss.id).subscribe({
      next: (blob: Blob) => {
        this.isDownloadingTemplate.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentAss.code || 'assessment'}-scores-template.csv`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        this.isDownloadingTemplate.set(false);
        this.errorMessage.set(toUserError(err).message);
      },
    });
  }

  onFileChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (!inputEl.files || inputEl.files.length === 0) {
      return;
    }
    const selectedFile = inputEl.files[0];
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      this.errorMessage.set('Vui lòng chọn tệp định dạng .csv');
      return;
    }
    this.file.set(selectedFile);
    this.errorMessage.set(null);

    // Đọc header của CSV để tự động ánh xạ (loại bỏ UTF-8 BOM nếu có)
    const reader = new FileReader();
    reader.onload = e => {
      const text = (e.target?.result as string) ?? '';
      const firstLine = (text.split(/\r?\n/)[0] ?? '').replace(/^\uFEFF/, '');
      const headers = firstLine
        .split(',')
        .map(h => h.trim().replace(/^"|"$/g, ''))
        .filter(h => h.length > 0);

      this.csvHeaders.set(headers);
      this.autoMapHeaders(headers);
    };
    reader.readAsText(selectedFile, 'UTF-8');
  }

  private autoMapHeaders(headers: string[]): void {
    // Tìm cột MSSV
    const foundStudentCol = headers.find(h => /^(mssv|studentcode|ma_sv|masv|student_code|id)$/i.test(h));
    if (foundStudentCol) {
      this.studentColumn.set(foundStudentCol);
    } else if (headers.length > 0) {
      this.studentColumn.set(headers[0]);
    }

    const templateCols = headers.filter(h => / - .+ \(Max:\s*[\d.]+\)$/i.test(h));
    const looksLikeTemplate =
      foundStudentCol?.toLowerCase() === 'masv' && templateCols.length >= this.itemMappings().length && templateCols.length > 0;
    this.isTemplateFormat.set(looksLikeTemplate);

    // Tự động map các câu hỏi (theo cặp item + CLO nếu dùng tệp mẫu)
    const usedHeaders = new Set<string>();
    const currentMappings = this.itemMappings();
    const updated = currentMappings.map(m => {
      const lowerCode = m.itemCode.toLowerCase();
      const matched = headers.find(h => {
        if (usedHeaders.has(h)) {
          return false;
        }
        const lowerH = h.toLowerCase();
        if (lowerH.startsWith(`${lowerCode} - `)) {
          if (m.maxScore !== undefined && lowerH.includes('(max:')) {
            return lowerH.includes(`(max: ${m.maxScore})`) || lowerH.includes(`(max: ${Number(m.maxScore)})`);
          }
          return true;
        }
        return (
          lowerH === lowerCode ||
          lowerH.includes(lowerCode) ||
          (m.itemCode.replace(/[^0-9]/g, '').length > 0 &&
            h.replace(/[^0-9]/g, '') === m.itemCode.replace(/[^0-9]/g, ''))
        );
      });
      if (matched) {
        usedHeaders.add(matched);
      }
      return {
        ...m,
        column: matched ?? '',
      };
    });
    this.itemMappings.set(updated);
  }

  uploadAndValidate(): void {
    const currentFile = this.file();
    const currentAss = this.assessment();
    if (!currentFile || !currentAss?.sectionId) {
      this.errorMessage.set('Thiếu thông tin tệp hoặc lớp học phần');
      return;
    }

    let columnMapping: IImportColumnMapping | undefined;
    if (!this.isTemplateFormat()) {
      const unmapped = this.itemMappings().find(m => !m.column);
      if (unmapped) {
        this.errorMessage.set(`Vui lòng chọn cột trong tệp CSV cho câu "${unmapped.itemCode}"`);
        return;
      }

      columnMapping = {
        studentColumn: this.studentColumn(),
        items: this.itemMappings().map(m => ({
          column: m.column,
          item: m.itemId,
          ...(m.cloId ? { cloId: m.cloId } : {}),
        })),
      };
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.scoreImportSvc
      .createBatch(
        currentAss.sectionId,
        currentAss.id,
        currentFile,
        columnMapping,
        this.reimportPolicy(),
        this.sourceSystem(),
      )
      .subscribe({
        next: (batch: IImportBatch) => {
          // Tự động kích hoạt validate batch
          this.scoreImportSvc.validateBatch(batch.id).subscribe({
            next: (validatedBatch: IImportBatch) => {
              this.currentBatch.set(validatedBatch);
              this.isSubmitting.set(false);
              this.step.set('PREVIEW');

              if (validatedBatch.status === 'HAS_ERRORS') {
                this.loadErrors(validatedBatch.id);
              }
            },
            error: (err: unknown) => {
              this.isSubmitting.set(false);
              this.errorMessage.set(toUserError(err).message);
            },
          });
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(toUserError(err).message);
        },
      });
  }

  loadErrors(batchId: string): void {
    this.scoreImportSvc.getErrors(batchId, 0, 100).subscribe({
      next: page => {
        this.errors.set(page.content);
      },
    });
  }

  confirmImport(): void {
    const batch = this.currentBatch();
    if (!batch) {
      return;
    }

    this.isSubmitting.set(true);
    this.scoreImportSvc.confirmBatch(batch.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastr.success('Đã xác nhận và ghi nhận điểm thành công vào bài đánh giá!');
        this.router.navigate([this.urlConst.ASSESSMENT_DETAIL(this.id())]);
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(toUserError(err).message);
      },
    });
  }

  cancelBatch(): void {
    const batch = this.currentBatch();
    if (!batch) {
      this.step.set('UPLOAD');
      return;
    }

    this.isSubmitting.set(true);
    this.scoreImportSvc.rollbackBatch(batch.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.currentBatch.set(null);
        this.errors.set([]);
        this.file.set(null);
        this.step.set('UPLOAD');
        this.toastr.info('Đã hủy bỏ lô nhập điểm');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.step.set('UPLOAD');
      },
    });
  }
}
