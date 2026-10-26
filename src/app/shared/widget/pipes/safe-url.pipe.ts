import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Pipe({
  name: 'safeUrl',
})
export class SafeUrlPipe implements PipeTransform {
  private sanitizedSvc = inject(DomSanitizer);


  transform(value: string): SafeUrl {
    return this.sanitizedSvc.bypassSecurityTrustUrl(value);
  }
}
