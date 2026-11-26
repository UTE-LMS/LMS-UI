import { PaginatedSelect } from '@builder/paginated-select.builder';
import { IPagedResults } from '@models/common/response-data.model';
import { ICourse, IProgramCourse } from '@models/course/course.model';
import { ISection } from '@models/course/section.model';

/** Chuyển trang `IProgramCourse` sang trang `ICourse` để tái sử dụng trong dropdown học phần. */
export function mapProgramCoursesToCoursePage(res: IPagedResults<IProgramCourse>): IPagedResults<ICourse> {
  return {
    ...res,
    content: (res.content ?? []).map(pc => (
      pc.course ?? { id: pc.courseId, code: pc.courseId, name: '' }
    )),
  };
}

/** Định dạng nhãn hiển thị học phần (`mã · tên` hoặc chỉ `mã`). */
export function formatCourseOptionLabel(course: ICourse): string {
  const name = course.name?.trim();
  if (name) {
    return `${course.code} · ${name}`;
  }
  return course.code;
}

/** Định dạng nhãn lớp học phần kèm mã học phần và học kỳ nếu có. */
export function formatSectionOptionLabel(section: ISection): string {
  const parts = [
    section.code.trim(),
    section.courseCode?.trim(),
    section.termCode?.trim(),
  ].filter((v): v is string => Boolean(v));
  return parts.length > 0 ? parts.join(' · ') : section.code;
}

/** Làm mới dropdown khi bộ lọc cha thay đổi nhưng vẫn giữ lazy-load nếu chưa từng mở. */
export function invalidatePaginatedSelect<T>(select: PaginatedSelect<T>): void {
  if (select.initialized()) {
    select.reload(true);
  } else {
    select.reset();
  }
}
