import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TinymceEditorComponent } from '@component-shared/tinymce-editor/tinymce-editor.component';
import { UploadFileComponent } from '@component-shared/upload-file/upload-file.component';
import { UrlConstant } from '@constants/url.constant';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { IFileInfo } from '@models/common/file.model';
import { FileService } from '@services/common/file.service';
import { LatexService } from '@services/common/latex.service';
import { BreadCrumb } from '@widget/breadcrumb/breadcrumb.model';
import { BreadcrumbComponent } from '@widget/breadcrumb/breadcumb.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzModalModule } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NzGridModule,
    NzModalModule,
    NzButtonModule,
    FormsModule,
    ReactiveFormsModule,
    BreadcrumbComponent,
    UploadFileComponent,
    TinymceEditorComponent,
  ],
})
export class DashboardComponent implements OnInit {
  private fbd = inject(FormBuilder);
  protected fileSvc = inject(FileService);
  latexSvc = inject(LatexService);

  // Ngon ngu hien thi //////////
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).MNG.DASHBOARD;
  ///////////////////////////////

  breadcrumbObj: BreadCrumb = new BreadCrumb({
    heading: this.langData.DASHBOARD,
    listBreadcrumb: [
      {
        title: this.langData.DANH_MUC,
        link: UrlConstant.ROUTE.MANAGEMENT.CATEGORIES,
      },
    ],
  });

  editorData = signal('đề bài: &lt;la-tex&gt;\\( \\exp \\biggl( 2x \\biggl( 1 - \\frac{\\hat{r}}{2x\\mu} - \\log \\frac{\\hat{r}}{2x\\mu} \\biggl) \\biggl) \\)&lt;/la-tex&gt;');

  exampleForm!: FormGroup;

  constructor() {
    this.latexSvc.loadScript();
  }

  // Prevent reaload page
  // @HostListener('window:beforeunload')
  // beforeUnloadHander(e: BeforeUnloadEvent) {
  //   const confirmationMessage = '-';
  //   e.returnValue = confirmationMessage;
  //   return confirmationMessage;
  // }
  // // Prevent change router
  // canDeactivate(): Promise<boolean> {
  //   return new Promise(resolve => {
  //     this.nzModalSvc.confirm({
  //       nzTitle: 'Are you sure to leave this page?<br>Changes you made may not be saved.',
  //       nzOnOk: () => resolve(true),
  //       nzOnCancel: () => resolve(false),
  //     });
  //   });
  // }

  ngOnInit(): void {
    this.exampleForm = this.fbd.group({
      fieldOneFileId: ['1', [Validators.required]],
      fieldMultiFileId: [['1', '2'], [Validators.required]],

      fieldOneFileInfo: [{ id: '1', fileType: 'pdf', fileName: 'file1.pdf', fileNameEn: 'file1.pdf', fileSize: 1024, location: '/files/file1.pdf' }, [Validators.required]],

      fieldMultiFileInfo: [[
        { id: '1', fileType: 'pdf', fileName: 'file1.pdf', fileNameEn: 'file1.pdf', fileSize: 1024, location: '/files/file1.pdf' },
        { id: '2', fileType: 'docx', fileName: 'file2.docx', fileNameEn: 'file2.docx', fileSize: 2048, location: '/files/file2.docx' },
      ] as IFileInfo[], [Validators.required]],

      editorData: [''],
    });
  }

  viewFormValue() {
    console.log('FORM VALUE', this.exampleForm.value);
  }

  patchFormValue() {
    this.exampleForm.patchValue({
      editorData: 'New Editor data',
    });
  }
}
