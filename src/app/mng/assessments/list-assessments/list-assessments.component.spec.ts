import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { AssessmentStatus, IAssessment } from '@models/assessment/assessment.model';
import { ISection } from '@models/course/section.model';
import { AssessmentService } from '@services/assessment/assessment.service';
import { AuthService } from '@services/auth/auth.service';
import { CourseService } from '@services/course/course.service';
import { SectionService } from '@services/course/section.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { ListAssessmentsComponent } from './list-assessments.component';

/** DỮ LIỆU THỬ NGHIỆM: ID, mã bài giả. */
describe('ListAssessmentsComponent (F04 US-15, ADR 0014)', () => {
  let fixture: ComponentFixture<ListAssessmentsComponent>;
  let component: ListAssessmentsComponent;

  const section: ISection = {
    id: 'sec1', code: 'TEST101-01', courseId: 'c1', syllabusId: 'syl1', termId: 't1', lecturerIds: ['u1'], enrolledCount: 3, status: 'OPEN',
  };
  const make = (id: string, name: string, status: AssessmentStatus, extra: Partial<IAssessment> = {}): IAssessment => ({
    id, syllabusId: 'syl1', sectionId: 'sec1', code: id.toUpperCase(), name, scope: 'SECTION',
    status, locked: status === 'LOCKED' || status === 'SCORE_ENTERED',
    cloWeights: [{ cloId: 'clo1', weight: 1.0 }],
    items: [{ code: 'C1', bloomLevel: 3, outcomeMappings: [{ cloId: 'clo1', maxScore: 5 }] }], ...extra,
  });
  const list: IAssessment[] = [
    make('gk', 'Giữa kỳ', 'SCORE_ENTERED'),
    make('th', 'Thực hành', 'LOCKED'),
    make('ck', 'Cuối kỳ', 'DRAFT'),
  ];
  const template: IAssessment = make('tpl', 'Khung giữa kỳ', 'DRAFT', { scope: 'SYLLABUS_TEMPLATE', sectionId: null });

  const assessmentSvc = { getSectionAssessments: vi.fn(), getTemplates: vi.fn() };
  const sectionSvc = { getSection: vi.fn() };
  const courseSvc = { getCourseById: vi.fn(() => of({ id: 'c1', code: 'TEST101', name: 'Học phần thử nghiệm' })) };
  const authSvc = { getRoles: vi.fn<() => string[]>(), getUserId: vi.fn(() => 'u1') };

  async function setup(roles: string[], input: { sectionId?: string; syllabusId?: string; } = { sectionId: 'sec1' }): Promise<void> {
    vi.clearAllMocks();
    authSvc.getRoles.mockReturnValue(roles);
    sectionSvc.getSection.mockReturnValue(of(section));
    assessmentSvc.getSectionAssessments.mockReturnValue(of(list));
    assessmentSvc.getTemplates.mockReturnValue(of([template]));
    await TestBed.configureTestingModule({
      imports: [ListAssessmentsComponent],
      providers: [
        provideRouter([]),
        { provide: AssessmentService, useValue: assessmentSvc },
        { provide: SectionService, useValue: sectionSvc },
        { provide: CourseService, useValue: courseSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ListAssessmentsComponent);
    component = fixture.componentInstance;
    if (input.sectionId) {
      fixture.componentRef.setInput('sectionId', input.sectionId);
    }
    if (input.syllabusId) {
      fixture.componentRef.setInput('syllabusId', input.syllabusId);
    }
    fixture.detectChanges();
  }

  it('xem theo lớp: nạp đủ bài đánh giá của lớp và thông tin học phần', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    expect(component.mode()).toBe('SECTION');
    expect(assessmentSvc.getSectionAssessments).toHaveBeenCalledWith('sec1');
    expect(component.assessments().length).toBe(3);
    expect(component.course()?.code).toBe('TEST101');
  });

  it('quyền tạo bài cho lớp: chỉ giảng viên của lớp mới được tạo', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    expect(component.canCreate()).toBe(true);

    authSvc.getUserId.mockReturnValue('u2_other');
    component.ngOnInit();
    expect(component.canCreate()).toBe(false);
  });

  it('structureNote và actionFor phản ánh đúng trạng thái bài', async () => {
    await setup([SystemConstant.ROLE.LECTURER]);
    const draft = list[2];
    expect(component.structureNote(draft)).toContain('Sửa được');
    expect(component.actionFor(draft).label).toBe('Chỉnh sửa');

    const scoreEntered = list[0];
    expect(component.structureNote(scoreEntered)).toContain('Đã nhập điểm');
    expect(component.actionFor(scoreEntered).label).toBe('Chi tiết');
  });
});
