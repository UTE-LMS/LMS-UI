import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { IPi, IPiRequest, IPlo, IPloRequest } from '@models/program/plo-pi.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { FormCurriculumVersionComponent } from './form-curriculum-version.component';

describe('FormCurriculumVersionComponent (F02 US-05, US-06 UI.pdf Trang 9, 10)', () => {
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
  ];

  const versionSvc = {
    getProgramVersionById: vi.fn(() => of(mockVersion)),
    updateProgramVersion: vi.fn(() => of(mockVersion)),
  };

  const ploPiSvc = {
    getPlos: vi.fn(() => of(mockPlos)),
    getPis: vi.fn(() => of(mockPis)),
    createPlo: vi.fn((pvId: string, req: IPloRequest) => of({ id: 'plo_new', programVersionId: pvId, code: req.code, displayOrder: req.displayOrder })),
    updatePlo: vi.fn((pvId: string, id: string, req: IPloRequest) => of({ id, programVersionId: pvId, code: req.code, displayOrder: req.displayOrder })),
    deletePlo: vi.fn(() => of(undefined)),
    createPi: vi.fn((pvId: string, req: IPiRequest) => of({ id: 'pi_new', programVersionId: pvId, ploId: req.ploId, code: req.code, displayOrder: req.displayOrder })),
    updatePi: vi.fn((pvId: string, id: string, req: IPiRequest) => of({ id, programVersionId: pvId, ploId: req.ploId, code: req.code, displayOrder: req.displayOrder })),
    deletePi: vi.fn(() => of(undefined)),
  };

  const alertSvc = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
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

  it('khởi tạo và tải dữ liệu form phiên bản, PLO, PI thành công', () => {
    expect(component).toBeTruthy();
    expect(component.versionForm.get('version')?.value).toBe('BM7A-2.8-Draft');
    expect(component.ploForms().length).toBe(1);
    expect(component.ploForms()[0].pis.length).toBe(1);
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

    // Thử gán mã sai định dạng
    newPlo.form.get('code')?.setValue('PLO0');
    expect(newPlo.form.get('code')?.valid).toBe(false);

    // Gán mã đúng
    newPlo.form.get('code')?.setValue('PLO2');
    expect(newPlo.form.get('code')?.valid).toBe(true);
  });

  it('thêm PI mới validate đúng regex PI', () => {
    component.addPi(0);
    const plo = component.ploForms()[0];
    expect(plo.pis.length).toBe(2);
    const newPi = plo.pis[1];
    expect(newPi.isPersisted).toBe(false);
    expect(newPi.form.get('code')?.enabled).toBe(true);

    // Thử mã sai định dạng
    newPi.form.get('code')?.setValue('PI1');
    expect(newPi.form.get('code')?.valid).toBe(false);

    // Mã đúng
    newPi.form.get('code')?.setValue('PI1.2');
    expect(newPi.form.get('code')?.valid).toBe(true);
  });

  it('lưu form thành công sẽ gọi API update và chuyển hướng về detail', () => {
    component.saveChanges();
    expect(versionSvc.updateProgramVersion).toHaveBeenCalled();
    expect(ploPiSvc.updatePlo).toHaveBeenCalled();
    expect(ploPiSvc.updatePi).toHaveBeenCalled();
    expect(alertSvc.success).toHaveBeenCalledWith(
      expect.stringContaining('Lưu chương trình đào tạo & Chuẩn đầu ra thành công'),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/mng/curriculum/versions', '671dcba5f123456789abcdef']);
  });
});
