import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ICloPiMatrix } from '@models/course/clo.model';
import { IProgramCourse } from '@models/course/course.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { CloService } from '@services/course/clo.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { CloPiMatrixTableComponent } from './clo-pi-matrix-table.component';

describe('CloPiMatrixTableComponent (F03 US-12, TD-27, TD-28, Q22)', () => {
  let fixture: ComponentFixture<CloPiMatrixTableComponent>;
  let component: CloPiMatrixTableComponent;

  const pvId = '671dcba5f123456789abcdef';
  const courseId = '671dcba5f123456789abcde1';
  const syllabusId = '671dcba5f123456789abcde2';

  const mockProgramCourses: IProgramCourse[] = [
    {
      id: 'pc_1',
      programVersionId: pvId,
      courseId,
      course: { id: courseId, code: 'OOPR230279', name: 'Lập trình hướng đối tượng' },
    },
  ];

  const mockSyllabi: ISyllabus[] = [
    {
      id: syllabusId,
      courseId,
      version: '2026-v1',
      status: 'DRAFT',
    },
  ];

  const mockMatrix: ICloPiMatrix = {
    syllabusId,
    programVersionId: pvId,
    clos: [
      { id: 'clo_1', syllabusId, courseId, code: 'CLO1', bloomLevel: 3, contentOriginal: 'Áp dụng OOP' },
    ],
    pis: [
      { id: 'pi_1_1', programVersionId: pvId, ploId: 'plo_1', code: 'PI1.1', displayOrder: 1, contentShort: 'Thiết kế PM' },
      { id: 'pi_1_2', programVersionId: pvId, ploId: 'plo_1', code: 'PI1.2', displayOrder: 2, contentShort: 'Kiểm thử PM' },
    ],
    links: [
      {
        cloId: 'clo_1',
        piId: 'pi_1_1',
        linkId: 'link_1',
        weight: null,
        verification: { status: 'UNVERIFIED' },
      },
    ],
  };

  const syllabusSvc = {
    getSyllabiByCourse: vi.fn(() => of(mockSyllabi)),
  };

  const cloSvc = {
    getCloPiMatrix: vi.fn(() => of(mockMatrix)),
    createCloPiLink: vi.fn(() => of({
      id: 'link_2',
      programVersionId: pvId,
      syllabusId,
      cloId: 'clo_1',
      piId: 'pi_1_2',
      weight: null,
    })),
    deleteCloPiLink: vi.fn(() => of(undefined)),
    verifyCloPiLink: vi.fn(() => of({
      id: 'link_1',
      programVersionId: pvId,
      syllabusId,
      cloId: 'clo_1',
      piId: 'pi_1_1',
      weight: null,
      verification: { status: 'VERIFIED' },
    })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [CloPiMatrixTableComponent],
      providers: [
        { provide: SyllabusService, useValue: syllabusSvc },
        { provide: CloService, useValue: cloSvc },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CloPiMatrixTableComponent);
    fixture.componentRef.setInput('versionId', pvId);
    fixture.componentRef.setInput('programCourses', mockProgramCourses);
    fixture.componentRef.setInput('canManageLinks', true);
    fixture.componentRef.setInput('isQaOfficer', true);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('tải ma trận CLO × PI và không hiển thị số 0 cho ô trống hoặc weight = null (Q22)', () => {
    expect(component.matrix()?.links.length).toBe(1);
    const cell1 = component.getLinkCell('clo_1', 'pi_1_1');
    const cell2 = component.getLinkCell('clo_1', 'pi_1_2');
    expect(cell1?.linkId).toBe('link_1');
    expect(cell1?.weight).toBeNull();
    expect(cell2).toBeUndefined();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('W: —');
    expect(compiled.textContent).toContain('— (Nối)');
  });

  it('cho phép tạo liên kết CLO–PI khi đề cương ở trạng thái DRAFT và canManageLinks = true', () => {
    component.openCreateLinkModal(mockMatrix.clos[0], mockMatrix.pis[1]);
    component.submitCreateLink();
    expect(cloSvc.createCloPiLink).toHaveBeenCalledWith(syllabusId, {
      programVersionId: pvId,
      cloId: 'clo_1',
      piId: 'pi_1_2',
      weight: null,
    });
  });

  it('khóa tạo/xóa liên kết khi đề cương ở trạng thái CONFIRMED (TD-27)', () => {
    component.syllabi.set([{ ...mockSyllabi[0], status: 'CONFIRMED' }]);
    fixture.detectChanges();
    expect(component.canMutateMatrix()).toBe(false);
  });

  it('QA_OFFICER thẩm định độc lập từng liên kết CLO–PI (US-12/AC-3)', () => {
    const cell = component.getLinkCell('clo_1', 'pi_1_1')!;
    component.openVerifyModal(cell, mockMatrix.clos[0], mockMatrix.pis[0]);
    component.verifyForm.patchValue({ status: 'VERIFIED', note: 'Khớp đề cương' });
    component.submitVerifyLink();

    expect(cloSvc.verifyCloPiLink).toHaveBeenCalledWith('link_1', {
      status: 'VERIFIED',
      note: 'Khớp đề cương',
    });
  });
});
