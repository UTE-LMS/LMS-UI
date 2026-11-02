import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BloomLevelLabelComponent } from './bloom-level-label.component';
import { RubricLevelLabelComponent } from './rubric-level-label.component';

describe('Nhãn mức rubric (1–4) và Bloom (1–6): hai loại khác nhau, không quy đổi', () => {
  const text = (fixture: ComponentFixture<unknown>): string => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ').trim();
  const chip = (fixture: ComponentFixture<unknown>): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector('.status-chip');
  const icon = (fixture: ComponentFixture<unknown>): string => (fixture.nativeElement as HTMLElement).querySelector('i')?.className ?? '';

  const renderRubric = (level: number | null | undefined): ComponentFixture<RubricLevelLabelComponent> => {
    const fixture = TestBed.createComponent(RubricLevelLabelComponent);
    fixture.componentRef.setInput('level', level);
    fixture.detectChanges();
    return fixture;
  };
  const renderBloom = (level: number | null | undefined): ComponentFixture<BloomLevelLabelComponent> => {
    const fixture = TestBed.createComponent(BloomLevelLabelComponent);
    fixture.componentRef.setInput('level', level);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [RubricLevelLabelComponent, BloomLevelLabelComponent] }));

  it('rubric mức 3 hiện "Rubric: mức 3/4", Bloom mức 3 hiện "Bloom: mức 3/6" (cùng số, khác nhãn)', () => {
    expect(text(renderRubric(3))).toContain('Rubric: mức 3/4');
    expect(text(renderBloom(3))).toContain('Bloom: mức 3/6');
  });

  it('rubric và Bloom khác nhau về biểu tượng, sắc thái và kiểu viền (không chỉ khác chữ)', () => {
    const rubric = renderRubric(2);
    const bloom = renderBloom(2);
    expect(icon(rubric)).not.toBe(icon(bloom));
    expect(chip(rubric)?.getAttribute('data-tone')).not.toBe(chip(bloom)?.getAttribute('data-tone'));
    expect(chip(rubric)?.getAttribute('data-line')).not.toBe(chip(bloom)?.getAttribute('data-line'));
  });

  it('chú thích nói rõ đây không phải điểm và không quy đổi sang loại kia', () => {
    expect(text(renderRubric(1))).toContain('Không phải mức Bloom, không phải điểm số');
    expect(text(renderBloom(1))).toContain('Không phải điểm số, không quy đổi sang mức rubric');
  });

  it.each([1, 2, 3, 4])('rubric mức hợp lệ %i', level => {
    expect(text(renderRubric(level))).toContain(`Rubric: mức ${level}/4`);
  });

  it.each([1, 2, 3, 4, 5, 6])('Bloom mức hợp lệ %i', level => {
    expect(text(renderBloom(level))).toContain(`Bloom: mức ${level}/6`);
  });

  it.each([0, 5, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY])('rubric %d ngoài thang 1–4: "Không hợp lệ", không hiện như một mức', level => {
    const fixture = renderRubric(level);
    expect(text(fixture)).toContain('Rubric: Không hợp lệ');
    expect(text(fixture)).not.toMatch(/mức \d+\/4/);
    expect(chip(fixture)?.getAttribute('data-tone')).toBe('danger');
  });

  it.each([0, 7, -1, 3.2, Number.NaN])('Bloom %d ngoài thang 1–6: "Không hợp lệ"', level => {
    const fixture = renderBloom(level);
    expect(text(fixture)).toContain('Bloom: Không hợp lệ');
    expect(text(fixture)).not.toMatch(/mức \d+\/6/);
  });

  it('mức 5 là hợp lệ với Bloom nhưng không hợp lệ với rubric (hai thang khác nhau)', () => {
    expect(text(renderBloom(5))).toContain('mức 5/6');
    expect(text(renderRubric(5))).toContain('Không hợp lệ');
  });

  it.each([null, undefined])('thiếu mức (%s): "Chưa có", KHÔNG hiện 0', value => {
    for (const fixture of [renderRubric(value), renderBloom(value)]) {
      expect(text(fixture)).toContain('Chưa có');
      expect(text(fixture)).not.toMatch(/(^|\s|:)0(\s|\/|$)/);
      expect(chip(fixture)?.getAttribute('data-tone')).toBe('neutral');
    }
  });
});
