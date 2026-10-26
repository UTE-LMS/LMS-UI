import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { EditorModule } from '@tinymce/tinymce-angular';
import { lastValueFrom } from 'rxjs';

interface TinyMceBlobInfo {
  id: () => string;
  name: () => string;
  filename: () => string;
  blob: () => Blob;
  base64: () => string;
  blobUri: () => string;
}
type OnChangeCallback = (value: string) => void;
type OnTouchedCallback = () => void;

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'tinymce-editor',
  imports: [EditorModule, FormsModule],
  template: `<editor [(ngModel)]="value" (ngModelChange)="onEditorChange($event)" [init]="editorConfig" [disabled]="disabled()" (onBlur)="onTouched()"></editor>`,
  styles: `::ng-deep .tox-promotion, ::ng-deep .tox-statusbar__branding { display: none; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TinymceEditorComponent),
      multi: true,
    },
  ],
})
export class TinymceEditorComponent implements ControlValueAccessor {
  private http = inject(HttpClient);

  // Biến lưu trữ giá trị nội bộ của editor
  value = signal('');

  // Các hàm callback của Angular Reactive Forms
  onChange: OnChangeCallback = (_value: string) => { return; };
  onTouched: OnTouchedCallback = () => { return; };
  disabled = signal(false);

  editorConfig = {
    base_url: '/assets/tinymce',
    suffix: '.min',
    plugins: 'advlist lists link image media table code codesample searchreplace directionality charmap emoticons visualblocks visualchars fullscreen insertdatetime nonbreaking pagebreak save help',
    toolbar: 'blocks removeformat align bold italic underline strikethrough subscript superscript forecolor link image media table outdent indent code searchreplace | fontfamily fontsize bullist numlist blockquote charmap codesample undo redo selectall',
    height: 300,
    menubar: true,
    paste_as_text: false,
    paste_block_drop: false,
    paste_data_images: true,
    images_upload_handler: async (blobInfo: TinyMceBlobInfo): Promise<string> => {
      /*
      BE nhận: form-data: file
      BE trả: { location: 'url_ảnh_vừa_upload' }
      */
      const formData = new FormData();
      formData.append('file', blobInfo.blob(), blobInfo.filename());
      const uploadUrl = 'https://api.yourserver.com/upload-endpoint';
      try {
        const response = await lastValueFrom(this.http.post<{ location: string; }>(uploadUrl, formData));
        if (response?.location) {
          return response.location;
        }
        throw new Error('Phản hồi từ Server thiếu trường location');
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(error.message);
        }
        throw error;
      }
    },
  };

  // 1. Hàm này chạy khi form bên ngoài cập nhật giá trị vào editor (ví dụ: patchValue)
  writeValue(val: unknown): void {
    this.value.set(typeof val === 'string' ? val : '');
  }

  // 2. Đăng ký sự kiện khi dữ liệu trong editor thay đổi
  registerOnChange(fn: OnChangeCallback): void {
    this.onChange = fn;
  }

  // 3. Đăng ký sự kiện khi người dùng tương tác xong (blur)
  registerOnTouched(fn: OnTouchedCallback): void {
    this.onTouched = fn;
  }

  // 4. Xử lý khi trạng thái form bên ngoài chuyển thành disabled
  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // Hàm này kích hoạt mỗi khi nội dung editor thay đổi để báo cho Reactive Form biết
  onEditorChange(newValue: string): void {
    this.value.set(newValue);
    this.onChange(newValue); // Đẩy giá trị mới ra Form bên ngoài
  }
}

