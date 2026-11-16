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
import { ICsvImportResultResponse } from '@models/common/response-data.model';
import { toApiError } from '@services/common/api-error.util';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-csv-import-modal',
  templateUrl: './csv-import-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzModalModule, NzButtonModule, NzTableModule],
})
export class CsvImportModalComponent {
  private readonly alert = inject(ToastrService);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  readonly isVisible = input<boolean>(false);
  readonly nzTitle = input.required<string>();
  readonly guideTitle = input<string>('Quy cách tệp CSV');
  readonly guideText = input<string>('');
  readonly templateFileName = input.required<string>();
  readonly keyColumnLabel = input<string>('Mã');
  readonly entityLabel = input<string>('bản ghi');
  readonly downloadTemplateFn = input.required<() => Observable<Blob>>();
  readonly importFileFn = input.required<(file: File) => Observable<ICsvImportResultResponse>>();

  readonly isVisibleChange = output<boolean>();
  readonly importSuccess = output<ICsvImportResultResponse>();

  readonly selectedFile = signal<File | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isDragging = signal<boolean>(false);
  readonly importResult = signal<ICsvImportResultResponse | null>(null);
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
    this.downloadTemplateFn()().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', this.templateFileName());
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không thể tải tệp mẫu CSV');
      },
    });
  }

  submitImport(): void {
    const file = this.selectedFile();
    if (!file) {
      this.errorMessage.set('Vui lòng chọn tệp CSV trước khi import.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.importFileFn()(file).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.importResult.set(res);
        if (res.successCount > 0) {
          this.alert.success(`Đã import thành công ${res.successCount}/${res.totalRows} ${this.entityLabel()}!`);
          this.importSuccess.emit(res);
        } else {
          this.alert.warning(`Không có ${this.entityLabel()} nào được import thành công.`);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const apiErr = toApiError(err);
        this.errorMessage.set(apiErr?.message ?? 'Đã xảy ra lỗi trong quá trình import tệp CSV.');
        this.alert.error(this.errorMessage()!);
      },
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
