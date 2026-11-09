import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { ICourseImportResultResponse } from '@models/course/course.model';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';

/**
 * Modal nạp danh mục học phần hàng loạt từ tệp CSV (F03 US-09/AC-4, ADR 0010 - Quản trị viên).
 */
@Component({
  selector: 'app-course-import-modal',
  templateUrl: './course-import-modal.component.html',
  styleUrl: './course-import-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzModalModule, NzButtonModule, NzTableModule],
})
export class CourseImportModalComponent {
  private readonly courseSvc = inject(CourseService);
  private readonly alert = inject(ToastrService);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  readonly isVisible = input<boolean>(false);
  readonly isVisibleChange = output<boolean>();
  readonly importSuccess = output<void>();

  readonly selectedFile = signal<File | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isDragging = signal<boolean>(false);
  readonly importResult = signal<ICourseImportResultResponse | null>(null);
  readonly errorMessage = signal<string | null>(null);

  handleCancel(): void {
    if (this.isLoading()) {
      return;
    }
    this.resetState();
    this.isVisibleChange.emit(false);
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.handleCancel();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isLoading()) {
      this.isDragging.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    if (this.isLoading()) {
      return;
    }

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.validateAndSetFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      this.validateAndSetFile(inputEl.files[0]);
    }
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
    this.errorMessage.set(null);
    this.importResult.set(null);
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  downloadTemplate(): void {
    const csvContent =
      '\uFEFFcode,name,credits\n' +
      'MATH1301,Toán rời rạc,3\n' +
      'ITEC2401,Lập trình nâng cao,3\n' +
      'INSE3302,"Công nghệ phần mềm nâng cao, hướng dịch vụ",4\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'courses_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  submitImport(): void {
    const file = this.selectedFile();
    if (!file) {
      this.errorMessage.set('Vui lòng chọn tệp CSV trước khi nạp dữ liệu.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.courseSvc.importCourses(file).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.importResult.set(res);

        if (res.successCount > 0) {
          this.alert.success(`Đã nạp thành công ${res.successCount}/${res.totalRows} học phần!`);
          this.importSuccess.emit();
        } else {
          this.alert.warning('Không có học phần nào được thêm mới.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const apiErr = toApiError(err);
        this.errorMessage.set(apiErr?.message ?? 'Đã xảy ra lỗi trong quá trình nạp tệp CSV.');
        this.alert.error(this.errorMessage()!);
      },
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private validateAndSetFile(file: File): void {
    this.importResult.set(null);
    this.errorMessage.set(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.errorMessage.set('Định dạng tệp không hợp lệ! Vui lòng chỉ chọn tệp CSV (.csv).');
      this.selectedFile.set(null);
      return;
    }

    if (file.size === 0) {
      this.errorMessage.set('Tệp CSV đã chọn rỗng, không có dữ liệu.');
      this.selectedFile.set(null);
      return;
    }

    // Tối đa 10MB
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage.set('Kích thước tệp vượt quá giới hạn cho phép (10MB).');
      this.selectedFile.set(null);
      return;
    }

    this.selectedFile.set(file);
  }

  private resetState(): void {
    this.selectedFile.set(null);
    this.isLoading.set(false);
    this.isDragging.set(false);
    this.importResult.set(null);
    this.errorMessage.set(null);
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }
}
