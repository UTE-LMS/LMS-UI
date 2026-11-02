import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VERIFICATION_DISPLAY } from '@constants/measurement-display.constant';
import { VerificationStatus } from '@models/measurement/verification.model';
import { VerificationBadgeComponent } from './verification-badge.component';

const ALL: VerificationStatus[] = ['UNVERIFIED', 'NEEDS_CLARIFICATION', 'VERIFIED'];

describe('VerificationBadgeComponent - trạng thái xác nhận nghiệp vụ', () => {
  let fixture: ComponentFixture<VerificationBadgeComponent>;
  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (): string => (host().textContent ?? '').replace(/\s+/g, ' ').trim();

  const render = (status: string | null | undefined, note?: string | null): void => {
    fixture = TestBed.createComponent(VerificationBadgeComponent);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('note', note);
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [VerificationBadgeComponent] }));

  it.each(ALL)('%s: nhãn chữ, biểu tượng và chú thích riêng', status => {
    render(status);
    const display = VERIFICATION_DISPLAY[status];
    expect(text()).toContain(display.label);
    expect(host().querySelector('i.fa-solid')?.classList.contains(display.icon)).toBe(true);
    expect(text()).toContain(display.description);
  });

  it('ba trạng thái có ba nhãn và ba biểu tượng khác nhau', () => {
    expect(new Set(ALL.map(s => VERIFICATION_DISPLAY[s].label)).size).toBe(3);
    expect(new Set(ALL.map(s => VERIFICATION_DISPLAY[s].icon)).size).toBe(3);
  });

  it('NEEDS_CLARIFICATION (nội dung PLO/PI chưa đối chiếu bản gốc) hiển thị "Cần làm rõ"', () => {
    render('NEEDS_CLARIFICATION');
    expect(text()).toContain('Cần làm rõ');
    expect(text()).not.toContain('Đã xác nhận');
  });

  it('thiếu hoặc enum lạ không bao giờ hiển thị là "Đã xác nhận"', () => {
    for (const raw of [null, undefined, '', 'APPROVED', 'verified']) {
      render(raw);
      expect(text()).not.toContain('Đã xác nhận');
    }
    render('APPROVED');
    expect(text()).toContain('Không xác định');
  });

  it('ghi chú xác nhận được thêm vào chú thích', () => {
    render('NEEDS_CLARIFICATION', 'Chờ đối chiếu bản gốc (ví dụ minh họa)');
    expect(text()).toContain('Ghi chú: Chờ đối chiếu bản gốc (ví dụ minh họa)');
  });

  it('ghi chú rất dài bị rút gọn; ghi chú rỗng/null bị bỏ qua', () => {
    render('UNVERIFIED', 'N'.repeat(3000));
    expect(text().length).toBeLessThan(600);
    render('UNVERIFIED', '   ');
    expect(text()).not.toContain('Ghi chú');
    render('UNVERIFIED', null);
    expect(text()).not.toContain('Ghi chú');
  });
});
