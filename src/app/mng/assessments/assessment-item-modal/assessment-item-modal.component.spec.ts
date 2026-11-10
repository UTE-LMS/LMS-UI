import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IAssessmentItem } from '@models/assessment/assessment.model';
import { IClo } from '@models/course/clo.model';
import { AssessmentItemModalComponent } from './assessment-item-modal.component';

/** DỮ LIỆU THỬ NGHIỆM: CLO, mã câu và điểm giả; kỳ vọng tính tay. */
describe('AssessmentItemModalComponent (F04 US-15, US-16)', () => {
  let fixture: ComponentFixture<AssessmentItemModalComponent>;
  let component: AssessmentItemModalComponent;
  let saved: IAssessmentItem[];

  const clos: IClo[] = [
    { id: 'clo1', syllabusId: 's1', courseId: 'c1', code: 'CLO1', bloomLevel: 2 },
    { id: 'clo2', syllabusId: 's1', courseId: 'c1', code: 'CLO2', bloomLevel: 3 },
    { id: 'clo3', syllabusId: 's1', courseId: 'c1', code: 'CLO3', bloomLevel: 4 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AssessmentItemModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(AssessmentItemModalComponent);
    component = fixture.componentInstance;
    saved = [];
    component.saved.subscribe(item => saved.push(item));
    fixture.componentRef.setInput('clos', clos);
    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();
  });

  function setMapping(index: number, cloId: string, weight: number | null): void {
    while (component.form.controls.mappings.length <= index) {
      component.addMapping();
    }
    component.form.controls.mappings.at(index).patchValue({ cloId, weight });
  }

  function fillValid(): void {
    component.form.patchValue({ code: 'C1', title: 'Câu 1', maxScore: 3, bloomLevel: 4 });
    setMapping(0, 'clo1', 1);
  }

  it('mở thêm mới: sinh mã gợi ý C1, loại Câu hỏi, đúng một dòng CLO trống', () => {
    expect(component.form.controls.code.value).toBe('C1');
    expect(component.form.controls.kind.value).toBe('QUESTION');
    expect(component.form.controls.mappings.length).toBe(1);
    expect(component.showRubric()).toBe(false);
  });

  it('US-15/AC-1: câu hợp lệ phát ra đúng cấu trúc (CLO duy nhất, phần điểm 1, Bloom 4)', () => {
    fillValid();
    component.save();
    expect(component.issues()).toEqual([]);
    expect(saved).toEqual([{
      code: 'C1', title: 'Câu 1', kind: 'QUESTION', maxScore: 3, bloomLevel: 4, topic: undefined, externalRef: undefined,
      outcomeMappings: [{ cloId: 'clo1', weight: 1 }], rubric: undefined,
    }]);
  });

  it('US-15/AC-2: nhiều CLO với phần điểm 0,5 + 0,5 hợp lệ', () => {
    fillValid();
    setMapping(0, 'clo1', 0.5);
    setMapping(1, 'clo2', 0.5);
    component.save();
    expect(saved[0].outcomeMappings).toEqual([{ cloId: 'clo1', weight: 0.5 }, { cloId: 'clo2', weight: 0.5 }]);
  });

  it('US-15/AC-2 (ca âm): tổng phần điểm 0,9 bị chặn và nêu rõ tổng', () => {
    fillValid();
    setMapping(0, 'clo1', 0.5);
    setMapping(1, 'clo2', 0.4);
    component.save();
    expect(saved).toEqual([]);
    expect(component.issues().join(' ')).toContain('Tổng phần điểm là 0,9, cần bằng 1');
    expect(component.weightSumInvalid()).toBe(true);
  });

  it('US-15/AC-2 (ca âm): tổng 1,01 cũng bị chặn', () => {
    fillValid();
    setMapping(0, 'clo1', 0.51);
    setMapping(1, 'clo2', 0.5);
    component.save();
    expect(saved).toEqual([]);
  });

  it('US-15/AC-2 (ca âm): CLO khai báo hai lần trong một phần tử bị chặn', () => {
    fillValid();
    setMapping(0, 'clo1', 0.5);
    setMapping(1, 'clo1', 0.5);
    expect(component.issues().join(' ')).toContain('chỉ được khai báo một lần');
  });

  it('ca âm: chưa chọn CLO nào thì báo mỗi phần tử phải đo ít nhất một CLO', () => {
    component.form.patchValue({ code: 'C1', maxScore: 1 });
    expect(component.issues().join(' ')).toContain('ít nhất một CLO');
  });

  it('ca âm: phần điểm 0 hoặc lớn hơn 1 bị chặn (phải trong (0, 1])', () => {
    fillValid();
    setMapping(0, 'clo1', 0);
    expect(component.issues().join(' ')).toContain('lớn hơn 0 và không quá 1');
    setMapping(0, 'clo1', 1.5);
    expect(component.issues().join(' ')).toContain('lớn hơn 0 và không quá 1');
  });

  it('ca âm: điểm tối đa 0, âm hoặc để trống bị chặn', () => {
    fillValid();
    for (const value of [0, -1, null]) {
      component.form.patchValue({ maxScore: value });
      expect(component.issues().join(' ')).toContain('Điểm tối đa phải lớn hơn 0');
    }
  });

  it('ca âm: mã trống, sai định dạng, hoặc trùng mã phần tử khác (không phân biệt hoa thường)', () => {
    fillValid();
    component.form.patchValue({ code: '' });
    expect(component.issues().join(' ')).toContain('Nhập mã');
    component.form.patchValue({ code: 'C 1' });
    expect(component.issues().join(' ')).toContain('chỉ gồm chữ, số');
    fixture.componentRef.setInput('otherCodes', ['c1']);
    component.form.patchValue({ code: 'C1' });
    expect(component.issues().join(' ')).toContain('đã dùng cho phần tử khác');
  });

  it('US-16/AC-1: tiêu chí có rubric chỉ lưu các mức có điểm; mức bỏ trống bị lược', () => {
    fillValid();
    component.form.patchValue({ kind: 'CRITERION' });
    component.form.controls.rubric.at(0).patchValue({ score: 1, description: 'Yếu' });
    component.form.controls.rubric.at(3).patchValue({ score: 3, description: 'Tốt' });
    expect(component.showRubric()).toBe(true);
    component.save();
    expect(saved[0].rubric).toEqual({ levels: [
      { level: 1, score: 1, description: 'Yếu' },
      { level: 4, score: 3, description: 'Tốt' },
    ] });
  });

  it('US-16/AC-1 (ca âm): điểm mức rubric vượt điểm tối đa bị chặn; bằng điểm tối đa thì được (biên)', () => {
    fillValid();
    component.form.patchValue({ kind: 'CRITERION' });
    component.form.controls.rubric.at(3).patchValue({ score: 3.5 });
    expect(component.issues().join(' ')).toContain('mức rubric 4 vượt điểm tối đa 3');
    component.form.controls.rubric.at(3).patchValue({ score: 3 });
    expect(component.issues()).toEqual([]);
  });

  it('ca âm: mức rubric có mô tả mà thiếu điểm bị chặn', () => {
    fillValid();
    component.form.patchValue({ kind: 'CRITERION' });
    component.form.controls.rubric.at(1).patchValue({ description: 'Khá' });
    expect(component.issues().join(' ')).toContain('có mô tả nhưng thiếu điểm');
  });

  it('US-16/AC-2: mức Bloom và mức rubric là hai trường độc lập (Bloom 2 với rubric mức 4 giữ nguyên cả hai)', () => {
    fillValid();
    component.form.patchValue({ kind: 'CRITERION', bloomLevel: 2 });
    component.form.controls.rubric.at(3).patchValue({ score: 2 });
    component.save();
    expect(saved[0].bloomLevel).toBe(2);
    expect(saved[0].rubric?.levels[0].level).toBe(4);
  });

  it('đổi sang Câu hỏi (chưa có rubric từ trước) thì ô rubric ẩn và rubric không được gửi', () => {
    fillValid();
    component.form.patchValue({ kind: 'CRITERION' });
    component.form.controls.rubric.at(0).patchValue({ score: 1 });
    component.form.patchValue({ kind: 'QUESTION' });
    expect(component.showRubric()).toBe(false);
    component.save();
    expect(saved[0].rubric).toBeUndefined();
  });

  it('sửa phần tử có sẵn: nạp đủ dữ liệu, giữ id, và rubric của câu hỏi cũ không bị mất âm thầm', () => {
    const existing: IAssessmentItem = {
      id: '671dcba5f123456789abcd51', code: 'Q9', title: 'Câu 9', kind: 'QUESTION', maxScore: 2, bloomLevel: 3,
      topic: 'Kế thừa', externalRef: 'MD-9',
      outcomeMappings: [{ cloId: 'clo2', weight: 0.6 }, { cloId: 'clo3', weight: 0.4 }],
      rubric: { levels: [{ level: 2, description: 'Đạt', score: 1 }] },
    };
    fixture.componentRef.setInput('isVisible', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('item', existing);
    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();

    expect(component.form.controls.code.value).toBe('Q9');
    expect(component.form.controls.mappings.length).toBe(2);
    expect(component.showRubric()).toBe(true);
    component.save();
    expect(saved[0]).toEqual({ ...existing, rubric: { levels: [{ level: 2, description: 'Đạt', score: 1 }] } });
    expect(saved[0].id).toBe('671dcba5f123456789abcd51');
  });

  it('bài đã khóa (disabled): không phát ra gì dù dữ liệu hợp lệ', () => {
    fixture.componentRef.setInput('disabled', true);
    fillValid();
    component.save();
    expect(saved).toEqual([]);
  });

  it('đề cương chưa có CLO: báo rõ và không cho thêm CLO', () => {
    fixture.componentRef.setInput('clos', []);
    fixture.detectChanges();
    expect(document.body.textContent ?? '').toContain('Đề cương chưa có CLO nào');
  });

  it('chỉ còn một dòng CLO thì không bỏ được dòng cuối', () => {
    component.removeMapping(0);
    expect(component.form.controls.mappings.length).toBe(1);
  });
});
