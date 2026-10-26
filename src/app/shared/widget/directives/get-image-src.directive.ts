import { Directive, OnInit, inject, input, output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FileService } from '@services/common/file.service';

@Directive({
  selector: '[appGetImageSrc]',
})
export class GetImageSrcDirective implements OnInit {
  private fileSvc = inject(FileService);
  private sanitizerSvc = inject(DomSanitizer);

  readonly idFile = input.required<string>();
  readonly returnImageResourceUrl = output<SafeResourceUrl | undefined>();

  ngOnInit(): void {
    this.fileSvc.viewFile(this.idFile()).subscribe({
      next: res => {
        if (res.body) {
          const blobFile = new Blob([res.body], { type: 'image/*' });
          this.returnImageResourceUrl.emit(this.sanitizerSvc.bypassSecurityTrustResourceUrl(URL.createObjectURL(blobFile)));
        }
      },
      error: () => this.returnImageResourceUrl.emit(undefined),
    });
  }
}
