import { Directive, OnInit, inject, input, output } from '@angular/core';
import { IFileInfo } from '@models/common/file.model';
import { FileService } from '@services/common/file.service';

@Directive({
  selector: '[appGetFileInfo]',
})
export class GetFileInfoDirective implements OnInit {
  private fileSvc = inject(FileService);

  readonly idFile = input.required<string>();
  readonly infoFile = output<IFileInfo | undefined>();

  ngOnInit(): void {
    this.fileSvc.getFileInfo(this.idFile()).subscribe({
      next: res => this.infoFile.emit(res),
      error: () => this.infoFile.emit(undefined),
    });
  }
}
