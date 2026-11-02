import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaleWarningComponent } from './stale-warning.component';

describe('StaleWarningComponent - cảnh báo isStale (US-30)', () => {
  let fixture: ComponentFixture<StaleWarningComponent>;
  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (): string => (host().textContent ?? '').replace(/\s+/g, ' ').trim();

  const render = (isStale: boolean | null | undefined, reason?: string | null): void => {
    fixture = TestBed.createComponent(StaleWarningComponent);
    fixture.componentRef.setInput('isStale', isStale);
    fixture.componentRef.setInput('reason', reason);
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [StaleWarningComponent] }));

  it('US-30/AC-1: isStale = true hiện cảnh báo "Điểm đã thay đổi sau lần tính"', () => {
    render(true);
    expect(text()).toContain('Điểm đã thay đổi sau lần tính');
    expect(host().querySelector('[role="status"]')).not.toBeNull();
    expect(host().querySelector('i.fa-clock-rotate-left')).not.toBeNull();
  });

  it.each([false, null, undefined])('isStale = %s: không hiện cảnh báo', value => {
    render(value);
    expect(text()).toBe('');
  });

  it('hiện lý do do API cung cấp', () => {
    render(true, 'Điểm của lớp được sửa lúc 10:15 (ví dụ minh họa)');
    expect(host().querySelector('.stale-reason')?.textContent).toContain('Điểm của lớp được sửa lúc 10:15 (ví dụ minh họa)');
  });

  it.each([null, undefined, '', '   '])('lý do %j: chỉ hiện cảnh báo chung', reason => {
    render(true, reason);
    expect(host().querySelector('.stale-reason')).toBeNull();
    expect(text()).toContain('Điểm đã thay đổi sau lần tính');
  });

  it('lý do rất dài được rút gọn; lý do chứa dấu hiệu chi tiết nội bộ bị loại bỏ', () => {
    render(true, 'Lý do '.repeat(300));
    expect((host().querySelector('.stale-reason')?.textContent ?? '').length).toBeLessThan(400);
    render(true, 'java.lang.NullPointerException at X.java:42');
    expect(host().querySelector('.stale-reason')).toBeNull();
  });
});
