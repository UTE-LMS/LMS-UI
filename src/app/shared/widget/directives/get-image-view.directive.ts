import { AfterViewInit, Directive, ElementRef, inject, input } from '@angular/core';
import { FileService } from '@services/common/file.service';

@Directive({
  selector: '[appGetImageView]',
})
export class GetImageViewDirective implements AfterViewInit {
  private elSvc = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private fileSvc = inject(FileService);

  // Use in <img> tag: <img appGetImageView [idFile]="...">

  readonly idFile = input.required<string>();

  ngAfterViewInit(): void {
    this.fileSvc.viewFile(this.idFile()).subscribe({
      next: res => {
        if (res.body) {
          const blobFile = new Blob([res.body], { type: 'image/*' });
          this.fileSvc.blobToB64(blobFile, 'data:image/jpeg;base64,').then(b64 => {
            this.elSvc.nativeElement.src = b64;
          });
        }
      },
      error: () => this.elSvc.nativeElement.src = '',
    });
  }
}
