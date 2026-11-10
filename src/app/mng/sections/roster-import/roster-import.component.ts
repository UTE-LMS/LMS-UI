import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SECTION_STATUS_DISPLAY, TERM_STATUS_DISPLAY } from '@constants/academic-display.constant';
import { UrlConstant } from '@constants/url.constant';
import { IEnrollmentImportResult, ISection } from '@models/course/section.model';
import { ITerm } from '@models/course/term.model';
import { toUserError } from '@services/common/api-error.util';
import { EnrollmentService } from '@services/course/enrollment.service';
import { SectionService } from '@services/course/section.service';
import { TermService } from '@services/course/term.service';
import { ActionDockComponent, DockTone } from '@widget/action-dock/action-dock.component';
import { TestDataFlagComponent } from '@widget/test-data-flag/test-data-flag.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { catchError, of } from 'rxjs';
import {
  buildRosterErrorCsv, IRosterRowError, ROSTER_TEMPLATE_CSV, toRosterRowErrors, validateRosterFile,
} from '../sections.util';

type ImportStep = 'PICK' | 'DONE';

/**
 * Nhập danh sách lớp từ CSV (F05a US-20). API là MỘT thao tác thống nhất (D7): có dòng lỗi thì không ghi gì và
 * trả 422 kèm `fieldErrors[]` theo dòng; không có bước xem trước riêng. Vì vậy màn hình chỉ có hai bước thật:
 * chọn tệp rồi ghi danh, và kết quả hiện ngay sau khi ghi (hoặc danh sách dòng lỗi để sửa tệp rồi tải lại).
 */
@Component({
  selector: 'app-roster-import',
  templateUrl: './roster-import.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NzButtonModule, NzTableModule, ActionDockComponent, TestDataFlagComponent],
})
export class RosterImportComponent implements OnInit {
  private readonly sectionSvc = inject(SectionService);
  private readonly termSvc = inject(TermService);
  private readonly enrollmentSvc = inject(EnrollmentService);

  readonly sectionId = input.required<string>();
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;

  readonly section = signal<ISection | null>(null);
  readonly term = signal<ITerm | null>(null);
  readonly step = signal<ImportStep>('PICK');
  readonly file = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  /** Lỗi chung của lần ghi (lớp/học kỳ đã đóng, không đủ quyền, tệp sai định dạng...). */
  readonly submitError = signal<string | null>(null);
  readonly rowErrors = signal<IRosterRowError[]>([]);
  readonly result = signal<IEnrollmentImportResult | null>(null);

  /** Lớp hoặc học kỳ không còn OPEN: backend sẽ trả 422; báo trước để người dùng khỏi chọn tệp vô ích. */
  readonly frozenReason = computed<string | null>(() => {
    const section = this.section();
    const term = this.term();
    if (section && section.status !== 'OPEN') {
      return `Lớp đang ở trạng thái "${SECTION_STATUS_DISPLAY[section.status].label}": danh sách ghi danh bị đóng băng, không nhập được.`;
    }
    if (term && term.status !== 'OPEN') {
      return `Học kỳ ${term.code} đang ở trạng thái "${TERM_STATUS_DISPLAY[term.status].label}": danh sách ghi danh bị đóng băng, không nhập được.`;
    }
    return null;
  });

  readonly dock = computed<{ tone: DockTone; message: string; }>(() => {
    if (this.step() === 'DONE') {
      return { tone: 'info', message: 'Đã ghi danh xong.' };
    }
    const frozen = this.frozenReason();
    if (frozen) {
      return { tone: 'warning', message: frozen };
    }
    const errors = this.rowErrors().length;
    if (errors > 0) {
      return { tone: 'error', message: `${errors} dòng lỗi: sửa tệp rồi chọn lại. Chưa có sinh viên nào được ghi danh.` };
    }
    const problem = this.fileError() ?? this.submitError();
    if (problem) {
      return { tone: 'error', message: problem };
    }
    return this.file()
      ? { tone: 'neutral', message: 'Sẵn sàng ghi danh. Hệ thống ghi tất cả hoặc không ghi gì.' }
      : { tone: 'neutral', message: 'Chọn tệp CSV danh sách lớp để bắt đầu.' };
  });

  ngOnInit(): void {
    this.sectionSvc.getSection(this.sectionId()).pipe(catchError(() => of(null))).subscribe(section => {
      this.section.set(section);
      if (section) {
        this.termSvc.getTermById(section.termId).pipe(catchError(() => of(null))).subscribe(t => this.term.set(t));
      }
    });
  }

  onFileSelected(event: Event): void {
    const picked = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.rowErrors.set([]);
    this.submitError.set(null);
    if (!picked) {
      return;
    }
    const problem = validateRosterFile(picked);
    this.fileError.set(problem);
    this.file.set(problem ? null : picked);
  }

  chooseAnother(): void {
    this.file.set(null);
    this.fileError.set(null);
    this.submitError.set(null);
    this.rowErrors.set([]);
    const input = this.fileInput()?.nativeElement;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  submit(): void {
    const picked = this.file();
    if (!picked || this.isSubmitting() || this.frozenReason()) {
      return;
    }
    this.isSubmitting.set(true);
    this.submitError.set(null);
    this.rowErrors.set([]);
    this.enrollmentSvc.importEnrollments(this.sectionId(), picked).subscribe({
      next: result => {
        this.isSubmitting.set(false);
        this.result.set(result);
        this.step.set('DONE');
      },
      error: err => {
        this.isSubmitting.set(false);
        const userError = toUserError(err);
        if (userError.fieldErrors.length > 0) {
          this.rowErrors.set(toRosterRowErrors(userError.fieldErrors));
        } else {
          this.submitError.set(userError.message);
        }
      },
    });
  }

  downloadErrors(): void {
    this.download(buildRosterErrorCsv(this.rowErrors()), 'danh-sach-lop-bao-loi.csv');
  }

  downloadTemplate(): void {
    this.download(ROSTER_TEMPLATE_CSV, 'danh-sach-lop-mau.csv');
  }

  private download(content: string, fileName: string): void {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
