import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createAnonymousAuthService,
  createMockCloPiMatrix,
  createMockCourse,
  createMockFaculty,
  createMockFacultyList,
  createMockPi,
  createMockPlo,
  createMockProgram,
  createMockProgramVersion,
  getRootElement,
  IFaculty,
  IProgram,
  IProgramCourse,
  IProgramVersion,
  PublicHomepageHarnessComponent,
} from './test-helpers';

describe('Tier 1 Opaque-Box: Public Homepage & Cascading Exploration (F1 - F5)', () => {
  let fixture: ComponentFixture<PublicHomepageHarnessComponent>;
  let component: PublicHomepageHarnessComponent;

  const mockFaculties: IFaculty[] = createMockFacultyList();
  const mockPrograms: (IProgram & { facultyId: string; isActive: boolean; })[] = [
    createMockProgram({ id: 'prog_se', facultyId: 'fac_cntt_01', code: '7480103', name: 'Kỹ thuật Phần mềm', isActive: true }),
    createMockProgram({ id: 'prog_cs', facultyId: 'fac_cntt_01', code: '7480101', name: 'Khoa học Máy tính', isActive: true }),
    createMockProgram({ id: 'prog_inactive', facultyId: 'fac_cntt_01', code: '7480199', name: 'Ngành cũ dừng tuyển sinh', isActive: false }),
    createMockProgram({ id: 'prog_me', facultyId: 'fac_ckct_02', code: '7520103', name: 'Kỹ thuật Cơ khí', isActive: true }),
  ];

  const mockVersions: IProgramVersion[] = [
    createMockProgramVersion({ id: 'ver_se_2024', programId: 'prog_se', version: '2024-v1', applicableCohort: '2024' }),
    createMockProgramVersion({ id: 'ver_se_2023', programId: 'prog_se', version: '2023-v1', applicableCohort: '2023' }),
    createMockProgramVersion({ id: 'ver_cs_2024', programId: 'prog_cs', version: '2024-v1', applicableCohort: '2024' }),
  ];

  const mockCourses: IProgramCourse[] = [
    {
      id: 'pc_1',
      programVersionId: 'ver_se_2024',
      courseId: 'crs_oop',
      course: createMockCourse({ id: 'crs_oop', code: 'OOPR230279', name: 'Lập trình hướng đối tượng', credits: 3 }),
      semester: 2,
      credits: 3,
      type: 'COMPULSORY',
      prerequisiteCourseIds: ['crs_intro_prg'],
    },
    {
      id: 'pc_2',
      programVersionId: 'ver_se_2024',
      courseId: 'crs_dsa',
      course: createMockCourse({ id: 'crs_dsa', code: 'DSAA230379', name: 'Cấu trúc dữ liệu và giải thuật', credits: 4 }),
      semester: 3,
      credits: 4,
      type: 'COMPULSORY',
      prerequisiteCourseIds: ['crs_oop'],
    },
    {
      id: 'pc_3',
      programVersionId: 'ver_se_2024',
      courseId: 'crs_web',
      course: createMockCourse({ id: 'crs_web', code: 'WEBP230479', name: 'Lập trình Web nâng cao', credits: 3 }),
      semester: 4,
      credits: 3,
      type: 'ELECTIVE',
      prerequisiteCourseIds: [],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicHomepageHarnessComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicHomepageHarnessComponent);
    component = fixture.componentInstance;

    // Load initial public mock data
    component.faculties.set(mockFaculties);
    component.programs.set(mockPrograms);
    component.versions.set(mockVersions);
    component.versionCourses.set(mockCourses);

    fixture.detectChanges();
  });

  // ==========================================================================
  // Feature F1: Public Anonymous Access & Youth Layout
  // ==========================================================================
  describe('F1: Public Anonymous Access & Youth Layout', () => {
    it('T1-F1-01: khách vãng lai truy cập công khai không yêu cầu token và xem được header trường', () => {
      const auth = createAnonymousAuthService();
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getRoles()).toEqual([]);

      const root = getRootElement(fixture);
      expect(root.querySelector('.youth-hero')?.textContent).toContain('CỔNG THÔNG TIN CHƯƠNG TRÌNH ĐÀO TẠO');
      expect(root.querySelector('.youth-hero')?.textContent).toContain('HCMUTE');
    });

    it('T1-F1-02: hiển thị các khối số liệu tổng quan (metrics counters) lấy từ dữ liệu hệ thống', () => {
      const root = getRootElement(fixture);
      const metricFac = root.querySelector('#metricFaculties') as HTMLElement;
      expect(metricFac.textContent?.trim()).toBe('4');
    });

    it('T1-F1-03: ban đầu chưa chọn phiên bản thì hiển thị thông báo hướng dẫn tra cứu', () => {
      const root = getRootElement(fixture);
      const prompt = root.querySelector('#selectPrompt') as HTMLElement;
      expect(prompt).not.toBeNull();
      expect(prompt.textContent).toContain('Vui lòng chọn Khoa, Chương trình đào tạo và Phiên bản');
    });

    it('T1-F1-04: giao diện công khai không xuất hiện các nút thêm/sửa/xóa của quản trị viên', () => {
      const root = getRootElement(fixture);
      expect(root.querySelector('#btnCreateFaculty')).toBeNull();
      expect(root.querySelector('#btnDeleteProgram')).toBeNull();
      expect(root.querySelector('#btnManageUsers')).toBeNull();
    });

    it('T1-F1-05: bộ lọc Khoa ban đầu nạp đủ danh sách các khoa công khai', () => {
      const root = getRootElement(fixture);
      const select = root.querySelector('#facultySelect') as HTMLSelectElement;
      expect(select.options.length).toBe(mockFaculties.length + 1);
      expect(select.options[1].textContent).toContain('FIT - Khoa Công nghệ Thông tin');
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F1-06: khi danh sách khoa rỗng, số liệu khoa hiển thị 0 và dropdown chỉ có tùy chọn mặc định', () => {
      component.faculties.set([]);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const metric = root.querySelector('#metricFaculties') as HTMLElement;
      expect(metric.textContent?.trim()).toBe('0');

      const select = root.querySelector('#facultySelect') as HTMLSelectElement;
      expect(select.options.length).toBe(1);
    });

    it('T2-F1-07: hỗ trợ hiển thị danh sách lớn (>50 khoa) không gây tràn layout', () => {
      const largeList = Array.from({ length: 60 }, (_, i) => createMockFaculty({ id: `fac_${i}`, code: `F${i}`, name: `Khoa Thử nghiệm ${i}` }));
      component.faculties.set(largeList);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const select = root.querySelector('#facultySelect') as HTMLSelectElement;
      expect(select.options.length).toBe(61);
    });

    it('T2-F1-08: thao tác chuyển tab khi chưa chọn phiên bản không gây lỗi giao diện', () => {
      component.activeTab.set('matrix');
      fixture.detectChanges();
      const root = getRootElement(fixture);
      const prompt = root.querySelector('#selectPrompt') as HTMLElement;
      expect(prompt).not.toBeNull();
    });

    it('T2-F1-09: tên khoa và CTĐT rất dài tự co giãn an toàn trong select box', () => {
      const longFac = createMockFaculty({
        id: 'fac_long',
        code: 'FLONG',
        name: 'Khoa Kỹ thuật Công nghệ Cao và Đào tạo Liên ngành Hợp tác Quốc tế Trọng điểm',
      });
      component.faculties.set([longFac]);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const select = root.querySelector('#facultySelect') as HTMLSelectElement;
      expect(select.options[1].textContent).toContain('FLONG');
    });

    it('T2-F1-10: khi làm mới bộ lọc về rỗng, metric chương trình quay về 0', () => {
      component.selectedFacultyId.set('fac_cntt_01');
      fixture.detectChanges();
      expect(component.filteredPrograms().length).toBe(2);

      component.onFacultyChange('');
      fixture.detectChanges();
      expect(component.filteredPrograms().length).toBe(0);
    });
  });

  // ==========================================================================
  // Feature F2: Cascading Filters Selector (Khoa -> CTĐT -> Phiên bản -> Môn học)
  // ==========================================================================
  describe('F2: Cascading Filters Selector', () => {
    it('T1-F2-01: chọn Khoa tự động mở khóa và lọc danh sách CTĐT trực thuộc', () => {
      const rootBefore = getRootElement(fixture);
      const progSelectBefore = rootBefore.querySelector('#programSelect') as HTMLSelectElement;
      expect(progSelectBefore.disabled).toBe(true);

      component.onFacultyChange('fac_cntt_01');
      fixture.detectChanges();

      const rootAfter = getRootElement(fixture);
      const progSelectAfter = rootAfter.querySelector('#programSelect') as HTMLSelectElement;
      expect(progSelectAfter.disabled).toBe(false);
      expect(component.filteredPrograms().length).toBe(2);
      expect(component.filteredPrograms().map(p => p.code)).toEqual(['7480103', '7480101']);
    });

    it('T1-F2-02: chọn CTĐT tự động mở khóa và lọc danh sách Phiên bản / Khóa tuyển sinh', () => {
      component.onFacultyChange('fac_cntt_01');
      component.onProgramChange('prog_se');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const verSelect = root.querySelector('#versionSelect') as HTMLSelectElement;
      expect(verSelect.disabled).toBe(false);
      expect(component.filteredVersions().length).toBe(2);
      expect(component.filteredVersions().map(v => v.version)).toEqual(['2024-v1', '2023-v1']);
    });

    it('T1-F2-03: chọn Phiên bản mở khóa dropdown môn học và hiển thị khung nội dung tab', () => {
      component.onFacultyChange('fac_cntt_01');
      component.onProgramChange('prog_se');
      component.onVersionChange('ver_se_2024');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const courseSelect = root.querySelector('#courseSelect') as HTMLSelectElement;
      expect(courseSelect.disabled).toBe(false);

      const tabNav = root.querySelector('.tab-navigation') as HTMLElement;
      expect(tabNav).not.toBeNull();
    });

    it('T1-F2-04: chọn Học phần cập nhật selectedCourseId và giữ nguyên ngữ cảnh phiên bản', () => {
      component.onFacultyChange('fac_cntt_01');
      component.onProgramChange('prog_se');
      component.onVersionChange('ver_se_2024');
      component.onCourseChange('crs_oop');
      fixture.detectChanges();

      expect(component.selectedCourseId()).toBe('crs_oop');
      expect(component.selectedVersionId()).toBe('ver_se_2024');
    });

    it('T1-F2-05: chuỗi liên hoàn 4 bước hoàn thành đồng bộ dữ liệu chuẩn xác', () => {
      component.onFacultyChange('fac_cntt_01');
      component.onProgramChange('prog_se');
      component.onVersionChange('ver_se_2024');
      component.onCourseChange('crs_dsa');
      fixture.detectChanges();

      expect(component.selectedFacultyId()).toBe('fac_cntt_01');
      expect(component.selectedProgramId()).toBe('prog_se');
      expect(component.selectedVersionId()).toBe('ver_se_2024');
      expect(component.selectedCourseId()).toBe('crs_dsa');
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F2-06: thay đổi Khoa sẽ reset toàn bộ các cấp con (CTĐT, Phiên bản, Môn học, Ma trận)', () => {
      component.onFacultyChange('fac_cntt_01');
      component.onProgramChange('prog_se');
      component.onVersionChange('ver_se_2024');
      component.onCourseChange('crs_oop');
      component.matrix.set(createMockCloPiMatrix());

      component.onFacultyChange('fac_ckct_02');
      fixture.detectChanges();

      expect(component.selectedProgramId()).toBe('');
      expect(component.selectedVersionId()).toBe('');
      expect(component.selectedCourseId()).toBe('');
      expect(component.matrix()).toBeNull();
    });

    it('T2-F2-07: thay đổi CTĐT sẽ reset Phiên bản, Môn học và Ma trận', () => {
      component.onFacultyChange('fac_cntt_01');
      component.onProgramChange('prog_se');
      component.onVersionChange('ver_se_2024');
      component.onCourseChange('crs_oop');

      component.onProgramChange('prog_cs');
      fixture.detectChanges();

      expect(component.selectedVersionId()).toBe('');
      expect(component.selectedCourseId()).toBe('');
      expect(component.matrix()).toBeNull();
    });

    it('T2-F2-08: các CTĐT có isActive=false bị ẩn khỏi kết quả lọc công khai', () => {
      component.onFacultyChange('fac_cntt_01');
      fixture.detectChanges();

      const activeCodes = component.filteredPrograms().map(p => p.code);
      expect(activeCodes).not.toContain('7480199');
    });

    it('T2-F2-09: CTĐT không có phiên bản nào thì dropdown phiên bản vẫn mở nhưng không có mục con hợp lệ', () => {
      const progWithoutVer = createMockProgram({ id: 'prog_empty', facultyId: 'fac_cntt_01', code: '7480105', name: 'An toàn thông tin' });
      component.programs.set([...mockPrograms, progWithoutVer]);

      component.onFacultyChange('fac_cntt_01');
      component.onProgramChange('prog_empty');
      fixture.detectChanges();

      expect(component.filteredVersions().length).toBe(0);
    });

    it('T2-F2-10: truyền mã Khoa không tồn tại xử lý nhẹ nhàng không gây crash component', () => {
      component.onFacultyChange('fac_unknown_999');
      fixture.detectChanges();

      expect(component.filteredPrograms().length).toBe(0);
      expect(component.selectedProgramId()).toBe('');
    });
  });

  // ==========================================================================
  // Feature F3: Public PLO / PI Hierarchy Tree
  // ==========================================================================
  describe('F3: Public PLO / PI Hierarchy Tree', () => {
    beforeEach(() => {
      component.onFacultyChange('fac_cntt_01');
      component.onProgramChange('prog_se');
      component.onVersionChange('ver_se_2024');

      const plos = [
        createMockPlo({ id: 'plo_1', code: 'PLO1', contentOriginal: 'Áp dụng kiến thức nền tảng CNTT', category: 'GENERAL' }),
        createMockPlo({ id: 'plo_2', code: 'PLO2', contentOriginal: 'Thiết kế và cài đặt hệ thống phần mềm', category: 'SPECIALIZED' }),
      ];

      const pis = [
        createMockPi({ id: 'pi_1_1', ploId: 'plo_1', code: 'PI1.1', contentShort: 'Toán rời rạc và đại số', capabilityLevelRaw: 3 }),
        createMockPi({ id: 'pi_1_2', ploId: 'plo_1', code: 'PI1.2', contentShort: 'Vật lý điện tử', capabilityLevelRaw: 2 }),
        createMockPi({ id: 'pi_2_1', ploId: 'plo_2', code: 'PI2.1', contentShort: 'Phân tích yêu cầu và kiến trúc', capabilityLevelRaw: 4 }),
      ];

      component.plos.set(plos);
      component.pis.set(pis);
      component.activeTab.set('plo-pi');
      fixture.detectChanges();
    });

    it('T1-F3-01: hiển thị danh sách các thẻ PLO kèm mã và danh mục chuẩn đầu ra', () => {
      const root = getRootElement(fixture);
      const ploCards = root.querySelectorAll('.plo-card');
      expect(ploCards.length).toBe(2);
      expect(ploCards[0].textContent).toContain('PLO1');
      expect(ploCards[0].textContent).toContain('GENERAL');
    });

    it('T1-F3-02: các chỉ số thực hiện (PI) hiển thị lồng cấp bên trong đúng PLO cha', () => {
      const root = getRootElement(fixture);
      const ploCards = root.querySelectorAll('.plo-card');
      const firstPloPis = ploCards[0].querySelectorAll('.pi-item');
      expect(firstPloPis.length).toBe(2);
      expect(firstPloPis[0].textContent).toContain('PI1.1');
      expect(firstPloPis[1].textContent).toContain('PI1.2');

      const secondPloPis = ploCards[1].querySelectorAll('.pi-item');
      expect(secondPloPis.length).toBe(1);
      expect(secondPloPis[0].textContent).toContain('PI2.1');
    });

    it('T1-F3-03: hiển thị huy hiệu Bloom (Level 1..5) cho từng PI', () => {
      const root = getRootElement(fixture);
      const badges = root.querySelectorAll('.bloom-badge');
      expect(badges.length).toBe(3);
      expect(badges[0].textContent).toContain('Level 3');
      expect(badges[1].textContent).toContain('Level 2');
      expect(badges[2].textContent).toContain('Level 4');
    });

    it('T1-F3-04: hiển thị nội dung tóm tắt hoặc chi tiết của PI rõ ràng', () => {
      const root = getRootElement(fixture);
      expect(root.textContent).toContain('Toán rời rạc và đại số');
      expect(root.textContent).toContain('Phân tích yêu cầu và kiến trúc');
    });

    it('T1-F3-05: chuyển tab khác rồi quay lại tab PLO-PI dữ liệu vẫn nguyên vẹn', () => {
      component.activeTab.set('courses');
      fixture.detectChanges();
      const rootCourses = getRootElement(fixture);
      expect(rootCourses.querySelector('#tabPloPiContent')).toBeNull();

      component.activeTab.set('plo-pi');
      fixture.detectChanges();
      const rootPlo = getRootElement(fixture);
      expect(rootPlo.querySelectorAll('.plo-card').length).toBe(2);
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F3-06: phiên bản không có PLO hiển thị thông báo trạng thái rỗng', () => {
      component.plos.set([]);
      component.pis.set([]);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const empty = root.querySelector('.empty-plo-state');
      expect(empty).not.toBeNull();
      expect(empty?.textContent).toContain('Chưa có dữ liệu PLO / PI');
    });

    it('T2-F3-07: PLO không có PI con nào render card với danh sách PI rỗng không crash', () => {
      component.pis.set([]);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const ploCards = root.querySelectorAll('.plo-card');
      expect(ploCards.length).toBe(2);
      expect(ploCards[0].querySelectorAll('.pi-item').length).toBe(0);
    });

    it('T2-F3-08: PI có contentShort rỗng sẽ tự động chuyển sang hiển thị contentOriginal', () => {
      component.pis.set([
        createMockPi({ id: 'pi_no_short', ploId: 'plo_1', code: 'PI1.X', contentShort: '', contentOriginal: 'Nội dung nguyên bản chi tiết đầy đủ' }),
      ]);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      expect(root.textContent).toContain('Nội dung nguyên bản chi tiết đầy đủ');
    });

    it('T2-F3-09: nội dung PLO cực dài được hiển thị đầy đủ không bị cắt đứt logic', () => {
      const longPlo = createMockPlo({
        id: 'plo_long',
        code: 'PLO_LONG',
        contentOriginal: 'A'.repeat(500),
      });
      component.plos.set([longPlo]);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      expect(root.textContent).toContain('A'.repeat(50));
    });

    it('T2-F3-10: hàm getPisForPlo trả về mảng rỗng khi truyền ploId không hợp lệ', () => {
      const result = component.getPisForPlo('plo_not_exist');
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // Feature F4: Public Course Catalog Tab
  // ==========================================================================
  describe('F4: Public Course Catalog Tab', () => {
    beforeEach(() => {
      component.onFacultyChange('fac_cntt_01');
      component.onProgramChange('prog_se');
      component.onVersionChange('ver_se_2024');
      component.activeTab.set('courses');
      fixture.detectChanges();
    });

    it('T1-F4-01: chuyển sang tab Kế hoạch đào tạo hiển thị danh mục môn học dạng bảng', () => {
      const root = getRootElement(fixture);
      const table = root.querySelector('#tabCoursesContent table') as HTMLTableElement;
      expect(table).not.toBeNull();
      const rows = root.querySelectorAll('.course-row');
      expect(rows.length).toBe(3);
    });

    it('T1-F4-02: hiển thị đầy đủ mã học phần, tên học phần và số tín chỉ', () => {
      const root = getRootElement(fixture);
      const firstRow = root.querySelector('.course-row') as HTMLElement;
      expect(firstRow.textContent).toContain('OOPR230279');
      expect(firstRow.textContent).toContain('Lập trình hướng đối tượng');
      expect(firstRow.textContent).toContain('3');
    });

    it('T1-F4-03: hiển thị học kỳ dự kiến (Kỳ 1..8) cho từng môn học', () => {
      const root = getRootElement(fixture);
      const rows = root.querySelectorAll('.course-row');
      expect(rows[0].textContent).toContain('Kỳ 2');
      expect(rows[1].textContent).toContain('Kỳ 3');
      expect(rows[2].textContent).toContain('Kỳ 4');
    });

    it('T1-F4-04: phân biệt loại học phần Bắt buộc (COMPULSORY) và Tự chọn (ELECTIVE)', () => {
      const root = getRootElement(fixture);
      const rows = root.querySelectorAll('.course-row');
      expect(rows[0].textContent).toContain('COMPULSORY');
      expect(rows[2].textContent).toContain('ELECTIVE');
    });

    it('T1-F4-05: hiển thị học phần tiên quyết chính xác theo danh sách mã học phần', () => {
      const root = getRootElement(fixture);
      const rows = root.querySelectorAll('.course-row');
      expect(rows[0].textContent).toContain('crs_intro_prg');
      expect(rows[1].textContent).toContain('crs_oop');
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F4-06: phiên bản không có môn học nào hiển thị hàng thông báo rỗng', () => {
      component.versionCourses.set([]);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const tableText = root.querySelector('#tabCoursesContent table')?.textContent;
      expect(tableText).toContain('Chưa có học phần nào trong kế hoạch');
    });

    it('T2-F4-07: môn học không có điều kiện tiên quyết hiển thị dấu gạch ngang (—)', () => {
      const root = getRootElement(fixture);
      const rows = root.querySelectorAll('.course-row');
      expect(rows[2].textContent).toContain('—');
    });

    it('T2-F4-08: trường hợp course con không có credits riêng thì lấy fallback credits của course', () => {
      const pcFallback: IProgramCourse = {
        id: 'pc_fb',
        programVersionId: 'ver_se_2024',
        courseId: 'crs_fb',
        course: createMockCourse({ id: 'crs_fb', code: 'FB101', name: 'Môn học Fallback', credits: 2 }),
        credits: undefined,
      };
      component.versionCourses.set([pcFallback]);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const row = root.querySelector('.course-row') as HTMLElement;
      expect(row.textContent).toContain('2');
    });

    it('T2-F4-09: học kỳ không xác định mặc định hiển thị Kỳ 1', () => {
      const pcNoSem: IProgramCourse = {
        id: 'pc_nosem',
        programVersionId: 'ver_se_2024',
        courseId: 'crs_nosem',
        course: createMockCourse({ id: 'crs_nosem', code: 'NS101', name: 'Môn chưa xếp kỳ' }),
        semester: undefined,
      };
      component.versionCourses.set([pcNoSem]);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const row = root.querySelector('.course-row') as HTMLElement;
      expect(row.textContent).toContain('Kỳ 1');
    });

    it('T2-F4-10: danh sách 20 môn học hiển thị đủ 20 dòng không phân trang làm mất dữ liệu', () => {
      const bulkCourses: IProgramCourse[] = Array.from({ length: 20 }, (_, i) => ({
        id: `pc_bulk_${i}`,
        programVersionId: 'ver_se_2024',
        courseId: `crs_b_${i}`,
        course: createMockCourse({ id: `crs_b_${i}`, code: `CODE_${i}`, name: `Môn học ${i}`, credits: 3 }),
        semester: (i % 8) + 1,
      }));
      component.versionCourses.set(bulkCourses);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const rows = root.querySelectorAll('.course-row');
      expect(rows.length).toBe(20);
    });
  });

  // ==========================================================================
  // Feature F5: Public CLO-PI Matrix (Invariant Q22 Enforcement)
  // ==========================================================================
  describe('F5: Public CLO-PI Matrix (Invariant Q22 Strict Verification)', () => {
    beforeEach(() => {
      component.onFacultyChange('fac_cntt_01');
      component.onProgramChange('prog_se');
      component.onVersionChange('ver_se_2024');
      component.activeTab.set('matrix');

      const matrix = createMockCloPiMatrix({
        cloCount: 3,
        piCount: 3,
        linkedPairs: [
          { cloIndex: 0, piIndex: 0, weight: 2 },
          { cloIndex: 1, piIndex: 1, weight: null },
        ],
      });
      component.matrix.set(matrix);
      fixture.detectChanges();
    });

    it('T1-F5-01: chuyển sang tab Ma trận CLO × PI hiển thị bảng 2 chiều với CLO làm hàng và PI làm cột', () => {
      const root = getRootElement(fixture);
      const table = root.querySelector('.matrix-table') as HTMLTableElement;
      expect(table).not.toBeNull();

      const ths = table.querySelectorAll('thead th');
      expect(ths.length).toBe(4);
      expect(ths[1].textContent).toContain('PI1.1');
      expect(ths[2].textContent).toContain('PI1.2');
      expect(ths[3].textContent).toContain('PI1.3');
    });

    it('T1-F5-02: ô có liên kết với trọng số cụ thể (weight > 0) hiển thị đúng số trọng số', () => {
      const root = getRootElement(fixture);
      const cell11 = root.querySelector('td.matrix-cell[data-clo="clo_1"][data-pi="pi_1"]') as HTMLElement;
      expect(cell11).not.toBeNull();
      expect(cell11.textContent?.trim()).toBe('2');
    });

    it('T1-F5-03: BẤT BIẾN Q22: ô có liên kết nhưng weight = null BẮT BUỘC hiển thị dấu gạch ngang (—)', () => {
      const root = getRootElement(fixture);
      const cell22 = root.querySelector('td.matrix-cell[data-clo="clo_2"][data-pi="pi_2"]') as HTMLElement;
      expect(cell22).not.toBeNull();
      expect(cell22.textContent?.trim()).toBe('—');
    });

    it('T1-F5-04: BẤT BIẾN Q22: ô KHÔNG có liên kết BẮT BUỘC hiển thị dấu gạch ngang (—)', () => {
      const root = getRootElement(fixture);
      const cell12 = root.querySelector('td.matrix-cell[data-clo="clo_1"][data-pi="pi_2"]') as HTMLElement;
      expect(cell12).not.toBeNull();
      expect(cell12.textContent?.trim()).toBe('—');
      expect(cell12.querySelector('.unlinked-dash')).not.toBeNull();
    });

    it('T1-F5-05: BẤT BIẾN Q22: TUYỆT ĐỐI KHÔNG hiển thị số 0 cho các ô chưa liên kết hoặc trọng số trống', () => {
      const root = getRootElement(fixture);
      const tableText = root.querySelector('.matrix-table')?.textContent ?? '';

      const cell33 = root.querySelector('td.matrix-cell[data-clo="clo_3"][data-pi="pi_3"]') as HTMLElement;
      expect(cell33.textContent?.trim()).not.toBe('0');
      expect(cell33.textContent?.trim()).toBe('—');

      const unlinkedCells = root.querySelectorAll('.unlinked-dash');
      expect(unlinkedCells.length).toBe(7);
      unlinkedCells.forEach((span: Element) => {
        expect(span.textContent?.trim()).toBe('—');
        expect(span.textContent?.trim()).not.toBe('0');
      });
      expect(tableText).not.toMatch(/\b0\b/);
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F5-06: khi matrix=null hiển thị thông báo yêu cầu chọn học phần để tải ma trận', () => {
      component.matrix.set(null);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const empty = root.querySelector('.empty-matrix-state') as HTMLElement;
      expect(empty).not.toBeNull();
      expect(empty.textContent).toContain('Vui lòng chọn học phần để tải ma trận CLO × PI');
    });

    it('T2-F5-07: ma trận dày đặc (full mesh 100% liên kết) hiển thị đầy đủ trọng số các ô', () => {
      const fullMatrix = createMockCloPiMatrix({
        cloCount: 2,
        piCount: 2,
        linkedPairs: [
          { cloIndex: 0, piIndex: 0, weight: 1 },
          { cloIndex: 0, piIndex: 1, weight: 2 },
          { cloIndex: 1, piIndex: 0, weight: 3 },
          { cloIndex: 1, piIndex: 1, weight: 4 },
        ],
      });
      component.matrix.set(fullMatrix);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const unlinked = root.querySelectorAll('.unlinked-dash');
      expect(unlinked.length).toBe(0);

      const linkedWeights = root.querySelectorAll('.linked-weight');
      expect(linkedWeights.length).toBe(4);
    });

    it('T2-F5-08: ma trận hoàn toàn không có liên kết nào (0 links) hiển thị toàn bộ 9 ô đều là (—)', () => {
      const emptyLinksMatrix = createMockCloPiMatrix({
        cloCount: 3,
        piCount: 3,
        linkedPairs: [],
      });
      component.matrix.set(emptyLinksMatrix);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const unlinkedSpans = root.querySelectorAll('.unlinked-dash');
      expect(unlinkedSpans.length).toBe(9);
      unlinkedSpans.forEach((span: Element) => {
        expect(span.textContent?.trim()).toBe('—');
        expect(span.textContent?.trim()).not.toBe('0');
      });
    });

    it('T2-F5-09: tiêu đề hàng hiển thị mã CLO kèm cấp độ Bloom (ví dụ: CLO1 (B1))', () => {
      const root = getRootElement(fixture);
      const rows = root.querySelectorAll('.clo-matrix-row');
      expect(rows[0].textContent).toContain('CLO1 (B1)');
      expect(rows[1].textContent).toContain('CLO2 (B2)');
      expect(rows[2].textContent).toContain('CLO3 (B3)');
    });

    it('T2-F5-10: hàm getLinkCell trả về undefined khi tìm cặp CLO-PI không có liên kết', () => {
      const linked = component.getLinkCell('clo_1', 'pi_1');
      expect(linked).toBeDefined();
      expect(linked?.weight).toBe(2);

      const unlinked = component.getLinkCell('clo_1', 'pi_3');
      expect(unlinked).toBeUndefined();
    });
  });
});
