import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { IProgramCourse } from '@models/course/course.model';
import {
  ICoursePiContribution,
  ICoursePiContributionRequest,
  IPi,
  IPiRequest,
  IPlo,
  IPloRequest,
} from '@models/program/plo-pi.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { FormCurriculumVersionComponent } from './form-curriculum-version.component';

describe('FormCurriculumVersionComponent (Wizard 4 bước US-05, US-06, US-09, US-11)', () => {
  let fixture: ComponentFixture<FormCurriculumVersionComponent>;
  let component: FormCurriculumVersionComponent;
  let router: Router;

  const mockVersion: IProgramVersion = {
    id: '671dcba5f123456789abcdef',
    programId: '671dcba5f123456789abcde1',
    version: 'BM7A-2.8-Draft',
    totalCredits: 132,
    durationYears: 4,
    status: 'DRAFT',
  };

  const mockPlos: IPlo[] = [
    {
      id: 'plo_1',
      programVersionId: '671dcba5f123456789abcdef',
      code: 'PLO1',
      displayOrder: 1,
      capabilityLevelRaw: 3,
      contentSummary: 'Kiến thức cốt lõi',
    },
  ];

  const mockPis: IPi[] = [
    {
      id: 'pi_1_1',
      programVersionId: '671dcba5f123456789abcdef',
      ploId: 'plo_1',
      code: 'PI1.1',
      displayOrder: 1,
      contentShort: 'Toán học',
      capabilityLevelRaw: 3,
      targetPassRate: 0.7,
    },
    {
      id: 'pi_1_2',
      programVersionId: '671dcba5f123456789abcdef',
      ploId: 'plo_1',
      code: 'PI1.2',
      displayOrder: 2,
      contentShort: 'Lập trình cơ sở',
      capabilityLevelRaw: 3,
      targetPassRate: 0.8,
    },
  ];

  const mockCourses: IProgramCourse[] = [
    {
      id: 'pc_1',
      programVersionId: '671dcba5f123456789abcdef',
      courseId: 'c_1',
      semester: 1,
      type: 'COMPULSORY',
      course: {
        id: 'c_1',
        code: 'CS101',
        name: 'Nhập môn lập trình',
        credits: 3,
      },
    },
  ];

  const mockContributions: ICoursePiContribution[] = [
    {
      id: 'contrib_1',
      programVersionId: '671dcba5f123456789abcdef',
      courseId: 'c_1',
      piId: 'pi_1_1',
      contribution: 'I',
    },
  ];

  let versionSvc: {
    getProgramVersionById: ReturnType<typeof vi.fn>;
    updateProgramVersion: ReturnType<typeof vi.fn>;
  };

  let ploPiSvc: {
    getPlos: ReturnType<typeof vi.fn>;
    getPis: ReturnType<typeof vi.fn>;
    createPlo: ReturnType<typeof vi.fn>;
    updatePlo: ReturnType<typeof vi.fn>;
    deletePlo: ReturnType<typeof vi.fn>;
    createPi: ReturnType<typeof vi.fn>;
    updatePi: ReturnType<typeof vi.fn>;
    deletePi: ReturnType<typeof vi.fn>;
    getProgramCourses: ReturnType<typeof vi.fn>;
    getContributions: ReturnType<typeof vi.fn>;
    createContribution: ReturnType<typeof vi.fn>;
    deleteContribution: ReturnType<typeof vi.fn>;
  };

  let alertSvc: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    versionSvc = {
      getProgramVersionById: vi.fn(() => of(mockVersion)),
      updateProgramVersion: vi.fn(() => of(mockVersion)),
    };

    ploPiSvc = {
      getPlos: vi.fn(() => of(mockPlos)),
      getPis: vi.fn(() => of(mockPis)),
      createPlo: vi.fn((pvId: string, req: IPloRequest) => of({ id: 'plo_new', programVersionId: pvId, code: req.code, displayOrder: req.displayOrder })),
      updatePlo: vi.fn((pvId: string, id: string, req: IPloRequest) => of({ id, programVersionId: pvId, code: req.code, displayOrder: req.displayOrder })),
      deletePlo: vi.fn(() => of(undefined)),
      createPi: vi.fn((pvId: string, req: IPiRequest) => of({ id: 'pi_new', programVersionId: pvId, ploId: req.ploId, code: req.code, displayOrder: req.displayOrder })),
      updatePi: vi.fn((pvId: string, id: string, req: IPiRequest) => of({ id, programVersionId: pvId, ploId: req.ploId, code: req.code, displayOrder: req.displayOrder })),
      deletePi: vi.fn(() => of(undefined)),
      getProgramCourses: vi.fn(() => of(mockCourses)),
      getContributions: vi.fn(() => of(mockContributions)),
      createContribution: vi.fn((pvId: string, req: ICoursePiContributionRequest) => of({
        id: 'contrib_new',
        programVersionId: pvId,
        courseId: req.courseId,
        piId: req.piId,
        contribution: req.contribution,
      })),
      deleteContribution: vi.fn(() => of(undefined)),
    };

    alertSvc = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [FormCurriculumVersionComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'versionId' ? '671dcba5f123456789abcdef' : null),
              },
            },
          },
        },
        { provide: ProgramVersionService, useValue: versionSvc },
        { provide: PloPiService, useValue: ploPiSvc },
        { provide: ToastrService, useValue: alertSvc },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(FormCurriculumVersionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('khởi tạo và nạp toàn diện dữ liệu phiên bản, PLO, PI, học phần và ma trận I/R/M', () => {
    expect(component).toBeTruthy();
    expect(component.versionForm.get('version')?.value).toBe('BM7A-2.8-Draft');
    expect(component.ploForms().length).toBe(1);
    expect(component.ploForms()[0].pis.length).toBe(2);
    expect(component.courses().length).toBe(1);
    expect(component.contributions().length).toBe(1);
    expect(component.currentStep()).toBe(0);
  });

  it('khóa trường mã code cho bản ghi PLO và PI đã lưu CSDL', () => {
    const ploItem = component.ploForms()[0];
    expect(ploItem.isPersisted).toBe(true);
    expect(ploItem.form.get('code')?.disabled).toBe(true);

    const piItem = ploItem.pis[0];
    expect(piItem.isPersisted).toBe(true);
    expect(piItem.form.get('code')?.disabled).toBe(true);
  });

  it('thêm PLO mới có mã enabled và validate đúng regex PLO', () => {
    component.addPlo();
    const list = component.ploForms();
    expect(list.length).toBe(2);
    const newPlo = list[1];
    expect(newPlo.isPersisted).toBe(false);
    expect(newPlo.form.get('code')?.enabled).toBe(true);

    // Gán mã sai định dạng
    newPlo.form.get('code')?.setValue('PLO0');
    expect(newPlo.form.get('code')?.valid).toBe(false);

    // Gán mã đúng
    newPlo.form.get('code')?.setValue('PLO2');
    expect(newPlo.form.get('code')?.valid).toBe(true);
  });

  it('thêm PI mới validate đúng regex PI', () => {
    component.addPi(0);
    const plo = component.ploForms()[0];
    expect(plo.pis.length).toBe(3);
    const newPi = plo.pis[2];
    expect(newPi.isPersisted).toBe(false);
    expect(newPi.form.get('code')?.enabled).toBe(true);

    // Mã sai định dạng
    newPi.form.get('code')?.setValue('PI1');
    expect(newPi.form.get('code')?.valid).toBe(false);

    // Mã đúng
    newPi.form.get('code')?.setValue('PI1.3');
    expect(newPi.form.get('code')?.valid).toBe(true);
  });

  it('lưu Step 0 thành công gọi API update và hiển thị thông báo', () => {
    component.saveChanges();
    expect(versionSvc.updateProgramVersion).toHaveBeenCalled();
    expect(ploPiSvc.updatePlo).toHaveBeenCalled();
    expect(ploPiSvc.updatePi).toHaveBeenCalled();
    expect(alertSvc.success).toHaveBeenCalledWith(
      expect.stringContaining('Lưu cấu trúc phiên bản & Chuẩn đầu ra thành công'),
    );
  });

  it('chuyển từ Bước 1 sang Bước 2 (Kế hoạch học phần) qua saveAndGoToStep1', () => {
    component.saveAndGoToStep1();
    expect(versionSvc.updateProgramVersion).toHaveBeenCalled();
    expect(component.currentStep()).toBe(1);
    expect(ploPiSvc.getProgramCourses).toHaveBeenCalled();
  });

  it('chuyển step tự do và tải dữ liệu tương ứng', () => {
    component.goToStep(2);
    expect(component.currentStep()).toBe(2);
    expect(ploPiSvc.getContributions).toHaveBeenCalled();

    component.goToStep(3);
    expect(component.currentStep()).toBe(3);

    component.goToStep(1);
    expect(component.currentStep()).toBe(1);
  });

  it('hoàn tất Wizard sẽ điều hướng về trang chi tiết phiên bản', () => {
    component.finishWizard();
    expect(alertSvc.success).toHaveBeenCalledWith(
      expect.stringContaining('Hoàn tất cấu hình phiên bản CTĐT'),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/mng/curriculum/versions', '671dcba5f123456789abcdef']);
  });

  it('hủy bỏ thay đổi sẽ điều hướng về trang chi tiết phiên bản', () => {
    component.cancelChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/mng/curriculum/versions', '671dcba5f123456789abcdef']);
  });

  describe('Tương tác Ma trận I/R/M (Step 2)', () => {
    it('thêm mới mức I khi click vào ô trống', () => {
      // pi_1_2 chưa có đóng góp
      component.onCellClick('c_1', 'pi_1_2');
      expect(ploPiSvc.createContribution).toHaveBeenCalledWith(
        '671dcba5f123456789abcdef',
        { courseId: 'c_1', piId: 'pi_1_2', contribution: 'I' },
      );
    });

    it('chuyển đổi từ I sang R khi click vào ô có mức I', () => {
      // pi_1_1 đã có mức I (contrib_1)
      component.onCellClick('c_1', 'pi_1_1');
      expect(ploPiSvc.deleteContribution).toHaveBeenCalledWith('671dcba5f123456789abcdef', 'contrib_1');
      expect(ploPiSvc.createContribution).toHaveBeenCalledWith(
        '671dcba5f123456789abcdef',
        { courseId: 'c_1', piId: 'pi_1_1', contribution: 'R' },
      );
    });

    it('chuyển đổi từ R sang M khi click vào ô có mức R', () => {
      component.contributions.set([
        {
          id: 'contrib_r',
          programVersionId: '671dcba5f123456789abcdef',
          courseId: 'c_1',
          piId: 'pi_1_1',
          contribution: 'R',
        },
      ]);
      component.onCellClick('c_1', 'pi_1_1');
      expect(ploPiSvc.deleteContribution).toHaveBeenCalledWith('671dcba5f123456789abcdef', 'contrib_r');
      expect(ploPiSvc.createContribution).toHaveBeenCalledWith(
        '671dcba5f123456789abcdef',
        { courseId: 'c_1', piId: 'pi_1_1', contribution: 'M' },
      );
    });

    it('xóa mức đóng góp khi click vào ô có mức M', () => {
      component.contributions.set([
        {
          id: 'contrib_m',
          programVersionId: '671dcba5f123456789abcdef',
          courseId: 'c_1',
          piId: 'pi_1_1',
          contribution: 'M',
        },
      ]);
      component.onCellClick('c_1', 'pi_1_1');
      expect(ploPiSvc.deleteContribution).toHaveBeenCalledWith('671dcba5f123456789abcdef', 'contrib_m');
    });
  });

  describe('Tính toán thống kê và độ phủ PI (Step 3 Review)', () => {
    it('tính toán chính xác số PI đã phủ, tổng PI, tỷ lệ phần trăm và PI chưa phủ', () => {
      // mockPis có 2 PI: pi_1_1 (đã có contrib_1), pi_1_2 (chưa có contrib)
      expect(component.totalPiCount()).toBe(2);
      expect(component.coveredPiCount()).toBe(1);
      expect(component.coveragePercent()).toBe(50);
      expect(component.uncoveredPis().length).toBe(1);
      expect(component.uncoveredPis()[0].id).toBe('pi_1_2');
      expect(component.totalCourseCredits()).toBe(3);
    });
  });
});
