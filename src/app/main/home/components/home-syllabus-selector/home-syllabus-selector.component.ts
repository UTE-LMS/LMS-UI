import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IProgramCourse } from '@models/course/course.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { IFaculty } from '@models/faculty/faculty.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { IProgram } from '@models/program/program.model';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-home-syllabus-selector',
  templateUrl: './home-syllabus-selector.component.html',
  styleUrl: './home-syllabus-selector.component.css',
  imports: [CommonModule, FormsModule, NzSelectModule, StatusChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeSyllabusSelectorComponent {
  readonly faculties = input<IFaculty[]>([]);
  readonly selectedFacultyId = input<string | null>(null);
  readonly isLoadingFaculties = input<boolean>(false);

  readonly programs = input<IProgram[]>([]);
  readonly selectedProgramId = input<string | null>(null);
  readonly isLoadingPrograms = input<boolean>(false);

  readonly filteredVersions = input<IProgramVersion[]>([]);
  readonly selectedVersionId = input<string | null>(null);
  readonly isLoadingVersions = input<boolean>(false);

  readonly programCourses = input<IProgramCourse[]>([]);
  readonly selectedCourseId = input<string | null>(null);
  readonly isLoadingCourses = input<boolean>(false);

  readonly syllabi = input<ISyllabus[]>([]);
  readonly selectedSyllabusId = input<string | null>(null);

  readonly facultyChange = output<string | null>();
  readonly programChange = output<string | null>();
  readonly versionChange = output<string | null>();
  readonly courseChange = output<string | null>();
  readonly syllabusChange = output<string | null>();

  readonly courseSearch = signal<string>('');

  readonly filteredProgramCourses = computed<IProgramCourse[]>(() => {
    const query = this.courseSearch().trim().toLowerCase();
    const list = this.programCourses();
    if (!query) {
      return list;
    }
    return list.filter(pc => {
      const code = (pc.course?.code ?? pc.courseId).toLowerCase();
      const name = (pc.course?.name ?? '').toLowerCase();
      return code.includes(query) || name.includes(query);
    });
  });
}
