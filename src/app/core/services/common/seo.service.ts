import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private dom = inject<Document>(DOCUMENT);

  /**
   * Create canonical link.
   * More value: https://www.w3schools.com/tags/att_link_rel.asp
   * Eg: createLink('canonical', '${fe_domain}/product/${product_type}')
   */
  createLink(rel: string, href: string) {
    const link: HTMLLinkElement = this.dom.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('href', href);
    this.dom.head.appendChild(link);
  }

  /**
   * Add script that show list product directly in google search result
   *
   * @param data Linked-Data object of structured data,
   * see more: https://schema.org/docs/full.html
   */
  addScript(data: Record<string, unknown>) {
    const el: HTMLScriptElement = this.dom.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.textContent = JSON.stringify(data);
    this.dom.head.appendChild(el);
  }

  /**
   * Change page's title
   *
   * @param title string
   *
   * @deprecated You must import and use "Title" service
   * from '@angular/platform-browser' directly.
   * From Angular 14, you can directly set page title in router config,
   * Priority is TitleSvc in comp > Child router cfg > Parent router cfg
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setTitle() { }

  /**
   * Update page's tag
   *
   * @param tag Tag data: { name: string; content: string; }
   *
   * @deprecated You must import and use "Meta" service
   * from '@angular/platform-browser' directly
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  updateTag() { }
}
