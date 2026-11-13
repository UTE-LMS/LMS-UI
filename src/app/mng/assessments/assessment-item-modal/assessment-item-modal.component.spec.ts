import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IAssessmentItem } from '@models/assessment/assessment.model';
import { IClo } from '@models/course/clo.model';
import { AssessmentItemModalComponent } from './assessment-item-modal.component';

/** DỮ LIỆU THỬ NGHIỆM: CLO, mã câu và điểm giả; kỳ vọng tính tay. */
describe('AssessmentItemModalComponent (F04 US-15, US-16, ADR 0014)', () => {
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

  function setMapping(index: number, cloId: string, maxScore: number | null): void {
    while (component.form.controls.mappings.length <= index) {
      component.addMapping();
    }
    component.form.controls.mappings.at(index).patchValue({ cloId, maxScore });
  }

  function fillValid(): void {
    component.form.patchValue({ code: 'C1', bloomLevel: 4 });
    setMapping(0, 'clo1', 2.5);
  }

  it('mở thêm mới: sinh mã gợi ý C1, mức Bloom 3, một dòng CLO', () => {
    expect(component.form.controls.code.value).toBe('C1');
    expect(component.form.controls.bloomLevel.value).toBe(3);
    expect(component.form.controls.mappings.length).toBe(1);
    expect(component.form.controls.mappings.at(0).controls.cloId.value).toBe('clo1');
  });

  it('câu hợp lệ phát ra đúng cấu trúc (CLO duy nhất, maxScore 2.5, Bloom 4)', () => {
    fillValid();
    component.handleSave();
    expect(saved.length).toBe(1);
    expect(saved[0]).toEqual({
      code: 'C1',
      orderIndex: null,
      bloomLevel: 4,
      outcomeMappings: [{ cloId: 'clo1', maxScore: 2.5 }],
    });
  });

  it('tổng điểm câu hỏi bằng tổng maxScore của các CLO', () => {
    component.form.patchValue({ code: 'C1', bloomLevel: 3 });
    setMapping(0, 'clo1', 1.5);
    component.addMapping();
    setMapping(1, 'clo2', 2.0);
    expect(component.totalItemScore()).toBe(3.5);
  });

  it('ca âm: trùng mã với câu hỏi khác bị chặn', () => {
    fixture.componentRef.setInput('otherCodes', ['C1', 'C2']);
    fixture.detectChanges();
    component.form.patchValue({ code: 'C1', bloomLevel: 3 });
    setMapping(0, 'clo1', 1.0);
    component.handleSave();
    expect(component.duplicateCode()).toBe(true);
    expect(saved.length).toBe(0);
  });

  it('ca âm: trùng CLO trong cùng câu hỏi bị chặn', () => {
    fillValid();
    component.addMapping();
    setMapping(1, 'clo1', 1.0);
    component.handleSave();
    expect(component.duplicateClo()).toBe(true);
    expect(saved.length).toBe(0);
  });

  it('ca âm: maxScore <= 0 bị chặn', () => {
    component.form.patchValue({ code: 'C1', bloomLevel: 3 });
    setMapping(0, 'clo1', 0);
    component.handleSave();
    expect(component.hasMissingCloOrScore()).toBe(true);
    expect(saved.length).toBe(0);
  });

  it('sửa phần tử có sẵn: nạp đủ dữ liệu, giữ id', () => {
    fixture.componentRef.setInput('item', {
      id: 'item-99',
      code: 'C2',
      orderIndex: 2,
      bloomLevel: 5,
      outcomeMappings: [{ cloId: 'clo2', maxScore: 3.0 }],
    });
    fixture.detectChanges();

    expect(component.form.controls.code.value).toBe('C2');
    expect(component.form.controls.bloomLevel.value).toBe(5);
    expect(component.form.controls.mappings.at(0).controls.maxScore.value).toBe(3.0);

    component.handleSave();
    expect(saved.length).toBe(1);
    expect(saved[0].id).toBe('item-99');
    expect(saved[0].orderIndex).toBe(2);
  });

  it('bài đã khóa (disabled): không phát ra gì khi lưu', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    fillValid();
    component.handleSave();
    expect(saved.length).toBe(0);
  });

  it('chỉ còn một dòng CLO thì không bỏ được dòng cuối', () => {
    expect(component.mappings.length).toBe(1);
    component.removeMapping(0);
    expect(component.mappings.length).toBe(1);
  });
});
