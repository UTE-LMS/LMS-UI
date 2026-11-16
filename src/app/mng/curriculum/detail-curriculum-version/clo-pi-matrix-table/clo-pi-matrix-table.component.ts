import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ICloPiLinkCell, ICloPiMatrix } from '@models/course/clo.model';
import { IProgramCourse } from '@models/course/course.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { CloService } from '@services/course/clo.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { BloomLevelLabelComponent } from '@widget/level-label/bloom-level-label.component';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-clo-pi-matrix-table',
  templateUrl: './clo-pi-matrix-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    StatusChipComponent,
    BloomLevelLabelComponent,
  ],
})
export class CloPiMatrixTableComponent {
  private readonly syllabusSvc = inject(SyllabusService);
  private readonly cloSvc = inject(CloService);

  readonly versionId = input.required<string>();
  readonly programCourses = input<IProgramCourse[]>([]);
  readonly initialCourseId = input<string | null>(null);
  readonly canManageLinks = input<boolean>(false);

  readonly selectedCourseId = signal<string>('');
  readonly syllabi = signal<ISyllabus[]>([]);
  readonly selectedSyllabusId = signal<string>('');
  readonly matrix = signal<ICloPiMatrix | null>(null);

  readonly isLoading = signal(false);
  readonly hasError = signal(false);

  readonly selectedSyllabus = computed(
    () => this.syllabi().find(s => s.id === this.selectedSyllabusId()) ?? null,
  );

  readonly matrixClos = computed(() => this.matrix()?.clos ?? []);
  readonly matrixPis = computed(() => this.matrix()?.pis ?? []);

  constructor() {
    effect(() => {
      const pcs = this.programCourses();
      const preferred = this.initialCourseId();
      untracked(() => {
        if (preferred && pcs.some(p => p.courseId === preferred)) {
          if (this.selectedCourseId() !== preferred) {
            this.onSelectCourse(preferred);
          }
        } else if (!this.selectedCourseId() && pcs.length > 0) {
          this.onSelectCourse(pcs[0].courseId);
        }
      });
    });
  }

  onSelectCourse(courseId: string): void {
    this.selectedCourseId.set(courseId);
    this.selectedSyllabusId.set('');
    this.matrix.set(null);
    if (!courseId) {
      this.syllabi.set([]);
      return;
    }

    this.syllabusSvc.getSyllabiByCourse(courseId).subscribe({
      next: list => {
        const items = list || [];
        this.syllabi.set(items);
        // Ưu tiên chọn bản CONFIRMED hoặc bản đầu tiên
        const preferred = items.find(s => s.status === 'CONFIRMED') ?? items[0];
        if (preferred) {
          this.onSelectSyllabus(preferred.id);
        }
      },
      error: () => {
        this.syllabi.set([]);
      },
    });
  }

  onSelectSyllabus(syllabusId: string): void {
    this.selectedSyllabusId.set(syllabusId);
    if (!syllabusId) {
      this.matrix.set(null);
      return;
    }
    this.loadMatrix(syllabusId);
  }

  loadMatrix(syllabusId = this.selectedSyllabusId()): void {
    const pvId = this.versionId();
    if (!syllabusId || !pvId) {
      return;
    }
    this.isLoading.set(true);
    this.hasError.set(false);
    this.cloSvc.getCloPiMatrix(syllabusId, pvId).subscribe({
      next: res => {
        this.isLoading.set(false);
        this.matrix.set(res);
      },
      error: () => {
        this.isLoading.set(false);
        this.hasError.set(true);
      },
    });
  }

  getLinkCell(cloId: string, piId: string): ICloPiLinkCell | undefined {
    return this.matrix()?.links?.find(l => l.cloId === cloId && l.piId === piId);
  }
}
