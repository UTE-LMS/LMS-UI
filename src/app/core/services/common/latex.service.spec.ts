import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { LatexService } from './latex.service';

const SCRIPT_ID = 'load-latex';

describe('NT-UI/AC-8: LatexService', () => {
  afterEach(() => {
    document.getElementById(SCRIPT_ID)?.remove();
  });

  it('loadScript chèn đúng một thẻ script module vào head', () => {
    TestBed.inject(LatexService).loadScript();
    const script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    expect(script?.type).toBe('module');
    expect(script?.innerHTML).toContain('assets/libs/latex/latex.mjs');
  });

  it('gọi loadScript lần nữa không chèn trùng (ca biên)', () => {
    const service = TestBed.inject(LatexService);
    service.loadScript();
    const first = document.getElementById(SCRIPT_ID);
    service.loadScript();
    expect(document.querySelectorAll(`#${SCRIPT_ID}`)).toHaveLength(1);
    expect(document.getElementById(SCRIPT_ID)).toBe(first);
  });

  it('loadScript(true) thay thế thẻ script cũ bằng thẻ mới', () => {
    const service = TestBed.inject(LatexService);
    service.loadScript();
    const first = document.getElementById(SCRIPT_ID);
    service.loadScript(true);
    expect(document.querySelectorAll(`#${SCRIPT_ID}`)).toHaveLength(1);
    expect(document.getElementById(SCRIPT_ID)).not.toBe(first);
  });

  it('renderHtml chỉ tin tưởng phần <la-tex> đã được mã hóa; phần còn lại giữ nguyên là chuỗi', () => {
    const service = TestBed.inject(LatexService);
    const sanitizer = TestBed.inject(DomSanitizer);
    const bypass = vi.spyOn(sanitizer, 'bypassSecurityTrustHtml');
    const parts = service.renderHtml('truoc &lt;la-tex&gt;x^2&lt;/la-tex&gt; sau');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('truoc ');
    expect(parts[2]).toBe(' sau');
    expect(bypass).toHaveBeenCalledTimes(1);
    expect(bypass).toHaveBeenCalledWith('<la-tex>x^2</la-tex>');
  });

  it('văn bản không chứa la-tex không bị bypass bảo mật (ca âm: chống chèn mã)', () => {
    const service = TestBed.inject(LatexService);
    const bypass = vi.spyOn(TestBed.inject(DomSanitizer), 'bypassSecurityTrustHtml');
    const parts = service.renderHtml('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(parts).toEqual(['&lt;script&gt;alert(1)&lt;/script&gt;']);
    expect(bypass).not.toHaveBeenCalled();
  });
});
