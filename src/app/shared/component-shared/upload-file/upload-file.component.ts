import { HttpEvent, HttpEventType, HttpProgressEvent } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, TemplateRef, effect, inject, input, linkedSignal, output, signal } from '@angular/core';
import { ViewFileComponent } from '@component-shared/view-file/view-file.component';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { IFileInfo, IListFilesPatchFileInfo, IListFilesPatchId, IUnifiedFileInfo } from '@models/common/file.model';
import { FileService } from '@services/common/file.service';
import { GetFileInfoDirective } from '@widget/directives/get-file-info.directive';
import { NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

export const pluginsModules = [
  NzModalModule,
  NzPopconfirmModule,
  GetFileInfoDirective,
  ViewFileComponent,
];

@Component({
  selector: 'app-upload-file',
  templateUrl: './upload-file.component.html',
  imports: pluginsModules,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadFileComponent {
  private alert = inject(ToastrService);
  private spinner = inject(NgxSpinnerService);
  private fileSvc = inject(FileService);
  private nzModalSvc = inject(NzModalService);

  // 1. Cấu hình kiểu dữ liệu mà Component Cha muốn nhận lại
  readonly returnType = input.required<'id' | 'fileInfo'>();

  // 2. Chấp nhận cả 2 kiểu dữ liệu đầu vào thông qua Union Type
  readonly listFilesPatch = input<(IListFilesPatchId | IListFilesPatchFileInfo)[]>([]);

  readonly acceptFilesExtension = input('.jpg,.jpeg,.png,.pdf,.ppt,.pptx,.doc,.docx,.zip,.rar');
  readonly subFolderOnServer = input('');
  readonly isUploadMultiFile = input(false);
  readonly isDisableUpload = input(false);
  readonly isDisableView = input(false);
  readonly isDisableDelete = input(false);
  readonly isDownloadable = input(false);
  readonly deleteNoConfirm = input(false);

  readonly isUploading = output<boolean>();
  readonly returnedListId = output<(IListFilesPatchId | IListFilesPatchFileInfo)[]>();

  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).SHARED.UPLOAD_FILE;

  viewModalRef!: NzModalRef;
  uploadRef!: Subscription;

  isStartUpload = signal(false);
  uploadingProgress = signal(0);
  selectedFileIdForView = signal('');
  defaultFolder = 'chua-phan-loai';

  listFiles = linkedSignal<IUnifiedFileInfo[]>(() => {
    const patchData = this.listFilesPatch();
    if (!patchData || patchData.length === 0) {
      return [];
    }

    return patchData.map(item => {
      const isFileInfoType = 'fileInfo' in item;

      if (isFileInfoType) {
        const infoItem = item;
        return {
          id: infoItem.id,
          filename: infoItem.fileInfo?.fileName ?? '',
          fileInfo: infoItem.fileInfo,
        };
      } else {
        const idItem = item as IListFilesPatchId;
        return {
          id: idItem.id,
          filename: idItem.filename ?? '',
          fileInfo: null,
        };
      }
    });
  });

  constructor() {
    // Tự động đồng bộ và chuẩn hóa dữ liệu ngay khi cha thay đổi giá trị Input
    effect(() => {
      const patchData = this.listFilesPatch();
      if (patchData && patchData.length > 0) {
        const normalizedData: IUnifiedFileInfo[] = patchData.map(item => {
          // Type Guard: Kiểm tra xem item có thuộc kiểu IListFilesPatchFileInfo không
          const isFileInfoType = 'fileInfo' in item;

          if (isFileInfoType) {
            const infoItem = item;
            return {
              id: infoItem.id,
              filename: infoItem.fileInfo?.fileName ?? '',
              fileInfo: infoItem.fileInfo,
            };
          } else {
            const idItem = item as IListFilesPatchId;
            return {
              id: idItem.id,
              filename: idItem.filename ?? '',
              fileInfo: null,
            };
          }
        });
        this.listFiles.set(normalizedData);
      } else {
        this.listFiles.set([]);
      }
    });
  }

  // Ép kiểu an toàn (Strict Type) thay thế cho $any($event) ở HTML
  onFileChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      this.uploadFile(inputElement.files);
      inputElement.value = ''; // Reset input để có thể up lại cùng 1 file nếu cần
    }
  }

  uploadFile(files: FileList) {
    this.uploadingProgress.set(0);
    this.isStartUpload.set(true);
    this.isUploading.emit(true);

    if (this.isUploadMultiFile()) {
      const allFileSize = Array.from(files).reduce((total, cur) => total + cur.size, 0);
      this.uploadRef = this.fileSvc.uploadMultiFile(files, this.subFolderOnServer() || this.defaultFolder)
        .subscribe({
          next: (resArr) => {
            if (resArr?.length) {
              const newFiles = resArr
                .filter(x => x.type === HttpEventType.Response)
                .map(x => {
                  const body = x.body as IFileInfo;
                  return {
                    id: body?.id ?? '',
                    filename: body?.fileName ?? '',
                    fileInfo: body,
                  };
                });

              // Trộn danh sách cũ với file mới tải lên, loại bỏ trùng lặp
              const merged = [...this.listFiles(), ...newFiles];
              const unique = [...new Map(merged.map(item => [item.id, item])).values()];
              this.listFiles.set(unique);
            }

            if (resArr?.some(x => !x || (x.type === HttpEventType.ResponseHeader && !x.ok))) {
              this.emitResult();
              this.isStartUpload.set(false);
              this.isUploading.emit(false);
            } else {
              resArr?.filter((x: HttpEvent<IFileInfo>) => x.type === HttpEventType.UploadProgress)
                .forEach(x => {
                  this.uploadingProgress.set(Math.round(100 * (x as HttpProgressEvent).loaded / allFileSize));
                });
            }
          },
          complete: () => {
            this.emitResult();
            this.isStartUpload.set(false);
            this.isUploading.emit(false);
          },
        });
    } else {
      this.uploadRef = this.fileSvc.uploadFile(files[0], this.subFolderOnServer() || this.defaultFolder)
        .subscribe({
          next: (res) => {
            if (res.type === HttpEventType.Response) {
              const body = res.body as IFileInfo;
              this.listFiles.set([{
                id: body?.id ?? '',
                filename: body?.fileName ?? '',
                fileInfo: body,
              }]);
              this.emitResult();
              this.isStartUpload.set(false);
              this.isUploading.emit(false);
              this.uploadRef.unsubscribe();
            } else if (res.type === HttpEventType.UploadProgress) {
              if (res.total) {
                this.uploadingProgress.set(Math.round(100 * res.loaded / res.total));
              } else {
                this.uploadingProgress.set(Math.round(100 * res.loaded / files[0].size));
              }
            }
          },
          error: () => {
            this.isStartUpload.set(false);
            this.isUploading.emit(false);
            this.uploadRef.unsubscribe();
          },
        });
    }
  }

  onRemove(index: number): void {
    const list = [...this.listFiles()];
    list.splice(index, 1);
    this.listFiles.set(list);
    this.emitResult();
  }

  // Tự động điều phối kiểu dữ liệu bắn ra theo cấu hình của Component Cha
  private emitResult(): void {
    const currentList = this.listFiles();
    if (this.returnType() === 'id') {
      const result: IListFilesPatchId[] = currentList.map(x => ({ id: x.id, filename: x.filename }));
      this.returnedListId.emit(result);
    } else {
      const result: IListFilesPatchFileInfo[] = currentList.map(x => ({ id: x.id, fileInfo: x.fileInfo }));
      this.returnedListId.emit(result);
    }
  }

  // Hàm được gọi ngầm bởi directive appGetFileInfo
  setFileName(fileInfoData: IFileInfo | undefined, itemIndex: number): void {
    const currentList = [...this.listFiles()];
    const item = currentList[itemIndex];
    if (item) {
      item.filename = fileInfoData?.fileName ?? this.langData['LOI'];
      item.fileInfo = fileInfoData;
      this.listFiles.set(currentList);
      this.emitResult(); // Đồng bộ tên file mới về lại Component cha
    }
  }

  openModalViewFile(template: TemplateRef<unknown>, fileId: string | undefined): void {
    if (!fileId) return;
    this.selectedFileIdForView.set(fileId);
    this.viewModalRef = this.nzModalSvc.create({
      nzStyle: { top: '20px', width: '100%', maxWidth: '80vw' },
      nzTitle: undefined,
      nzMaskClosable: false,
      nzContent: template,
      nzOnOk: () => this.viewModalRef.close(),
      nzCancelText: null,
    });
  }

  hideModalViewFile(): void {
    this.viewModalRef.close();
  }

  onTerminateUploading(): void {
    if (this.uploadRef) {
      this.uploadRef.unsubscribe();
    }
    this.isStartUpload.set(false);
    this.isUploading.emit(false);
  }

  downloadFile(fileId: string | undefined): void {
    if (!fileId) return;
    this.spinner.show();

    // Tận dụng tên file đã lấy được từ nội bộ để không phải gọi API getFileInfo nữa
    const existingItem = this.listFiles().find(x => x.id === fileId);
    const knownFileName = existingItem?.filename;

    this.fileSvc.downloadFile(fileId).subscribe({
      next: res => {
        if (res.body) {
          const finalName = res.headers.get('filename') ?? knownFileName ?? 'file';
          this.fileSvc.blobToDownloadFile(res.body, finalName);
        } else {
          this.alert.error(this.langData['CO_LOI_XAY_RA']);
        }
        this.spinner.hide();
      },
      error: () => {
        this.spinner.hide();
      },
    });
  }
}

/*
# FOR AI-ARGENT: UNIFIED FILE UPLOAD COMPONENT INTEGRATION RULES
The project has a single, unified uploading component named `app-upload-file`. Whenever you need to implement a file upload field, strictly follow these implementation rules.

1. Component Selector
- ALWAYS use `<app-upload-file>`.
- DO NOT use closing tags like `<app-upload-file></app-upload-file>`. Use self-closing tags instead: `<app-upload-file />`.

2. Return Type Configuration
- If the form control stores a string ID or array of string IDs, set `returnType="id"`.
- If the form control stores an `IFileInfo` object or array of `IFileInfo` objects, set `returnType="fileInfo"`.

3. Data Binding Rules (HTML Template)
- For `returnType="id"` Single File
  - Input: `[listFilesPatch]="fileSvc.extractFileFromListId([form.get('controlName')?.value ?? ''].flat())"`
  - Output: `(returnedListId)="fileSvc.setIdFileToForm($any($event), 'controlName', form)"`
- For `returnType="id"` Multiple Files (`[isUploadMultiFile]="true"`)
  - Input: `[listFilesPatch]="fileSvc.extractFileFromListId([form.get('controlName')?.value ?? ''].flat())"`
  - Output: `(returnedListId)="fileSvc.setListIdFileToForm($any($event), 'controlName', form)"`
- For `returnType="fileInfo"` Single File
  - Input: `[listFilesPatch]="fileSvc.extractFileFromListFileInfo([form.get('controlName')?.value ?? undefined].flat())"`
  - Output: `(returnedListId)="fileSvc.setFileInfoToForm($any($event), 'controlName', form)"`
- For `returnType="fileInfo"` Multiple Files (`[isUploadMultiFile]="true"`)
  - Input: `[listFilesPatch]="fileSvc.extractFileFromListFileInfo([form.get('controlName')?.value ?? undefined].flat())"`
  - Output: `(returnedListId)="fileSvc.setListFileInfoToForm($any($event), 'controlName', form)"`

4. Common Attributes
- Bind `subFolderOnServer` to a specific folder name string, which is parent component name (e.g., /abc/list-and-form-component/*.{ts,html} then `subFolderOnServer="abc"`).
- Set `[isUploadMultiFile]="true"` if it is an array field.
- Optional boolean flags `[isDisableUpload]`, `[isDisableView]`, `[isDisableDelete]`, `[isDownloadable]`, `[deleteNoConfirm]` can be applied dynamically based on the form status.
*/
