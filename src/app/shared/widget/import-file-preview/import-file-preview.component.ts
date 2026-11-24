import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { IImportFilePreview, parseImportFilePreview } from '@services/common/import-preview.util';

@Component({
  selector: 'app-import-file-preview',
  templateUrl: './import-file-preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportFilePreviewComponent {
  readonly file = input<File | null>(null);
  readonly requiredColumns = input<readonly string[]>([]);
  readonly maxRows = input<number>(10);
  readonly title = input<string>('Xem trước dữ liệu trước khi nhập');

  readonly previewLoaded = output<IImportFilePreview | null>();

  readonly loading = signal<boolean>(false);
  readonly preview = signal<IImportFilePreview | null>(null);

  private requestSeq = 0;

  constructor() {
    effect(() => {
      const currentFile = this.file();
      const required = this.requiredColumns();
      const maxRows = this.maxRows();
      const seq = ++this.requestSeq;

      if (!currentFile) {
        this.loading.set(false);
        this.preview.set(null);
        this.previewLoaded.emit(null);
        return;
      }

      this.loading.set(true);
      void parseImportFilePreview(currentFile, {
        maxPreviewRows: maxRows,
        requiredColumns: required,
      }).then(result => {
        if (seq !== this.requestSeq) {
          return;
        }
        this.preview.set(result);
        this.loading.set(false);
        this.previewLoaded.emit(result);
      });
    });
  }
}
