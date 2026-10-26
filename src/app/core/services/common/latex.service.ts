
import { DOCUMENT, Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class LatexService {
  /**
   * Online editor and copy Latex code:
   * https://demo.wiris.com/mathtype/en/developers.php#:~:text=Compatible%20with%20MathML%20and%20LaTeX
   */

  private doc = inject<Document>(DOCUMENT);
  private sanitizer = inject(DomSanitizer);


  loadScript(reload?: boolean) {
    const oldElement = this.doc.getElementById('load-latex') as HTMLScriptElement | null;
    if (!reload && oldElement) {
      // console.log('Already loaded!');
      return;
    }

    const script = this.doc.createElement('script');
    script.setAttribute('id', 'load-latex');
    script.type = 'module';
    script.innerHTML = 'import { LaTeXJSComponent } from "./assets/libs/latex/latex.mjs"; if (!customElements.get("la-tex")) { customElements.define("la-tex", LaTeXJSComponent) }';

    if (oldElement) {
      oldElement.replaceWith(script);
    } else {
      this.doc.head.appendChild(script);
    }
  }

  renderHtml(htmlCode: string) {
    // /(<la-tex[\S\s][^>]*<\/la-tex>)/
    const listParts: (SafeHtml)[] = htmlCode.split(/(&lt;la-tex&gt;[\s\S]*&lt;\/la-tex&gt;)/);
    listParts.forEach((part, index) => {
      if (typeof part === 'string' && /(&lt;la-tex&gt;[\s\S]*&lt;\/la-tex&gt;)/.test(part)) {
        listParts[index] = this.sanitizer.bypassSecurityTrustHtml(part.replaceAll('&lt;', '<').replaceAll('&gt;', '>'));
      }
    });
    return listParts;
  }
}

