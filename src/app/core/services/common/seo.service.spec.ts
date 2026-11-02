import { TestBed } from '@angular/core/testing';
import { SeoService } from './seo.service';

describe('NT-UI/AC-8: SeoService', () => {
  afterEach(() => {
    document.head.querySelectorAll('link[rel="canonical"], script[type="application/ld+json"]')
      .forEach(el => el.remove());
  });

  it('createLink thêm thẻ link với rel và href vào head', () => {
    TestBed.inject(SeoService).createLink('canonical', 'https://example.org/trang');
    const link = document.head.querySelector('link[rel="canonical"]');
    expect(link?.getAttribute('href')).toBe('https://example.org/trang');
  });

  it('addScript ghi dữ liệu có cấu trúc dạng JSON-LD, không thực thi như mã', () => {
    TestBed.inject(SeoService).addScript({ '@type': 'WebSite', name: 'LOMS' });
    const script = document.head.querySelector('script[type="application/ld+json"]');
    expect(JSON.parse(script?.textContent ?? '')).toEqual({ '@type': 'WebSite', name: 'LOMS' });
  });
});
