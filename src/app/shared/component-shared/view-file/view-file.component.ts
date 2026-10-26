import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { CheckFileTypeService } from '@services/common/check-file-type.service';
import { FileService } from '@services/common/file.service';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { ToastrService } from 'ngx-toastr';

export const pluginsModules = [NgxExtendedPdfViewerModule];
@Component({
  selector: 'app-view-file',
  templateUrl: './view-file.component.html',
  styleUrl: './view-file.component.css',
  imports: pluginsModules,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewFileComponent implements OnInit {
  private alert = inject(ToastrService);
  private fileSvc = inject(FileService);
  private sanitizerSvc = inject(DomSanitizer);
  private checkFileTypeSvc = inject(CheckFileTypeService);

  readonly fileId = input.required<string>();
  readonly viewer = input(''); // imageViewer / pdfViewer / ''
  readonly hideIframe = output<boolean>();

  // Ngon ngu hien thi //////////
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).SHARED.VIEW_FILE;
  //////////////////////////////

  resourceUrl = signal('');
  safeResourceUrl = signal<SafeResourceUrl | null>(null);
  pdfBlob = signal<Blob | null>(null);
  unsupportFileBlob = signal<HttpResponse<Blob> | null>(null);
  extension = signal('');
  degree = signal(0);
  imgW = signal(0);
  imgH = signal(0);
  localViewer = signal('');
  fileType = signal('');

  constructor() {
    this.localViewer.set(this.viewer() ?? '');
  }

  ngOnInit(): void {
    this.fileSvc.downloadFile(this.fileId()).subscribe(res => {
      res.body?.arrayBuffer()
        .then(data => {
          this.checkFileTypeSvc.checkTypeOfBlob(data)
            .subscribe({
              next: (fileType: string) => {
                if (res.body) {
                  if (['jpg', 'png'].includes(fileType)) {
                    this.localViewer.set('imageViewer');
                    const blobImg = new Blob([res.body], { type: 'image/*' });
                    this.safeResourceUrl.set(this.sanitizerSvc.bypassSecurityTrustResourceUrl(URL.createObjectURL(blobImg)));
                  } else if (['pdf'].includes(fileType)) {
                    this.localViewer.set('pdfViewer');
                    this.pdfBlob.set(new Blob([res.body], { type: 'application/pdf' }));
                  } else if (['doc', 'docx'].includes(fileType)) {
                    this.localViewer.set('officeViewer');
                    // this.pdfBlob.set(new Blob([res.body], { type: 'application/pdf' }));
                    // Unsupport view file right now
                    this.unsupportFileBlob.set(res);
                    ///////////////////
                  } else {
                    this.localViewer.set('unsupportViewer');
                    this.unsupportFileBlob.set(res);
                  }
                } else {
                  this.localViewer.set('unsupportViewer');
                  this.unsupportFileBlob.set(res);
                }
              },
            });
        });
    });
  }

  hide(): void {
    this.localViewer.set('');
    this.hideIframe.emit(false);
  }

  getImgSize(): void {
    this.imgW.set(Math.round(document.getElementById('image')?.clientWidth ?? 0));
    this.imgH.set(Math.round(document.getElementById('image')?.clientHeight ?? 0));
  }

  rotateImage(): void {
    this.degree.set(this.degree() + 90 >= 450 ? 90 : this.degree() + 90);

    const tmp = document.getElementById('image');
    if (tmp) {
      if (this.imgW() >= this.imgH()) {
        tmp.style.transform = 'rotate(' + this.degree() + 'deg)';
        // margin top-bot
        const imgRatio = this.imgH() / this.imgW();
        if (this.degree() / 90 % 2 === 1) {
          tmp.style.margin = Math.round((1 - imgRatio) * 50) + '% auto';
        } else {
          tmp.style.margin = 'auto';
        }
      } else {
        tmp.style.transform = 'rotate(' + this.degree() + 'deg)';
      }
    }
  }

  downloadUnsupportedViewFile() {
    const blob = this.unsupportFileBlob();
    if (blob?.body) {
      if (blob.headers.get('filename')) {
        this.fileSvc.blobToDownloadFile(blob.body, blob.headers.get('filename') ?? '');
      } else {
        this.fileSvc.blobToDownloadFile(blob.body, 'no-name' + (this.fileType() ? `.${this.fileType()}` : ''));
      }
    } else {
      this.alert.error(this.langData.CO_LOI_XAY_RA);
    }
  }
}
