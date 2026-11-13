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
  template: `
    <div class="section-card">
      <div class="section-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 class="section-title text-base font-bold text-slate-900 m-0">
            Ma trận Liên kết Chuẩn đầu ra Học phần (CLO × PI) & Thẩm định ĐBCL (US-12)
          </h2>
          <div class="section-description text-xs text-slate-500 mt-0.5">
            Khung liên kết chính thức giữa CLO của đề cương học phần và PI của phiên bản CTĐT. Chỉ các liên kết đã VERIFIED mới được dùng tính toán chính thức (F06).
          </div>
        </div>
      </div>

      <!-- Bộ chọn Học phần thuộc CTĐT (TD-28) & Phiên bản Đề cương -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-4">
        <div>
          <label for="matrixCourseSelect" class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            1. Học phần thuộc Phiên bản CTĐT (TD-28)
          </label>
          <nz-select
            id="matrixCourseSelect"
            class="w-full"
            nzShowSearch
            nzPlaceHolder="Chọn học phần trong CTĐT..."
            [ngModel]="selectedCourseId()"
            (ngModelChange)="onSelectCourse($event)"
          >
            @for (pc of programCourses(); track pc.id) {
            <nz-option
              [nzValue]="pc.courseId"
              [nzLabel]="(pc.course?.code ?? pc.courseId) + ' — ' + (pc.course?.name ?? '')"
            />
            }
          </nz-select>
        </div>

        <div>
          <label for="matrixSyllabusSelect" class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            2. Phiên bản Đề cương Học phần
          </label>
          <nz-select
            id="matrixSyllabusSelect"
            class="w-full"
            nzPlaceHolder="Chọn phiên bản đề cương..."
            [ngModel]="selectedSyllabusId()"
            (ngModelChange)="onSelectSyllabus($event)"
          >
            @for (syl of syllabi(); track syl.id) {
            <nz-option
              [nzValue]="syl.id"
              [nzLabel]="syl.version + ' (' + syl.status + ')'"
            />
            }
          </nz-select>
        </div>
      </div>

      @if (selectedSyllabus(); as syl) {
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4 px-3 py-2 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-slate-700">
        <div class="flex items-center gap-2">
          <span>Trạng thái đề cương đang chọn:</span>
          @if (syl.status === 'CONFIRMED') {
          <app-status-chip label="Đã duyệt (CONFIRMED)" tone="success" icon="fa-circle-check" />
          } @else if (syl.status === 'DRAFT') {
          <app-status-chip label="Bản nháp (DRAFT)" tone="warning" icon="fa-pen-ruler" lineStyle="dashed" />
          } @else {
          <app-status-chip label="Lưu trữ (ARCHIVED)" tone="neutral" icon="fa-box-archive" />
          }
        </div>
        <div>
          <span class="text-slate-600">
            Ma trận liên kết CLO–PI chỉ xem (cập nhật thông qua Import CSV Đề cương).
          </span>
        </div>
      </div>
      }

      @if (isLoading()) {
      <div class="py-10 text-center text-slate-500">
        <i class="fa-solid fa-spinner fa-spin text-xl mb-2 text-blue-600"></i>
        <p class="m-0 text-sm">Đang tải ma trận liên kết CLO × PI...</p>
      </div>
      } @else if (hasError()) {
      <div class="py-8 text-center" role="alert">
        <p class="text-rose-600 mb-2">Không tải được ma trận liên kết CLO × PI.</p>
        <button nz-button type="button" (click)="loadMatrix()">Thử lại</button>
      </div>
      } @else if (!selectedSyllabusId()) {
      <div class="py-10 text-center text-slate-400">
        Vui lòng chọn học phần và phiên bản đề cương để xem ma trận liên kết CLO × PI.
      </div>
      } @else {
      <div class="overflow-x-auto border border-slate-200 rounded-xl">
        <table class="w-full border-collapse text-xs">
          <thead>
            <tr class="bg-slate-100 text-slate-800 border-b border-slate-200">
              <th class="p-3 text-left min-w-64 border-r border-slate-200">
                Chuẩn đầu ra Học phần (CLO)
              </th>
              @for (pi of matrixPis(); track pi.id) {
              <th class="p-3 text-center min-w-36 border-r border-slate-200">
                <div class="font-bold text-blue-900">{{ pi.code }}</div>
                <div class="text-[11px] font-normal text-slate-500 line-clamp-1" [title]="pi.contentShort || pi.contentOriginal">
                  {{ pi.contentShort || pi.contentOriginal || '—' }}
                </div>
              </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (clo of matrixClos(); track clo.id) {
            <tr class="border-b border-slate-200 hover:bg-slate-50/70">
              <td class="p-3 border-r border-slate-200 align-top">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="font-bold text-slate-900 text-sm">{{ clo.code }}</span>
                  <app-bloom-level-label [level]="clo.bloomLevel" />
                </div>
                <div class="text-slate-600 leading-snug">
                  {{ clo.contentOriginal || '—' }}
                </div>
              </td>
              @for (pi of matrixPis(); track pi.id) {
              <td class="p-2.5 text-center border-r border-slate-200 align-middle">
                @if (getLinkCell(clo.id, pi.id); as cell) {
                <div class="flex flex-col items-center gap-1.5 p-1.5 rounded-lg bg-blue-50/50 border border-blue-200">
                  <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold" title="Đã liên kết">
                      ✓
                    </span>
                    <span class="text-slate-700 font-medium" title="Trọng số đóng góp (Q22)">
                      W: {{ cell.weight !== null && cell.weight !== undefined ? cell.weight : '—' }}
                    </span>
                  </div>
                </div>
                } @else {
                  <span class="text-slate-400" title="Chưa có liên kết (không quy đổi thành 0)">—</span>
                }
              </td>
              }
            </tr>
            } @empty {
            <tr>
              <td [attr.colspan]="matrixPis().length + 1" class="text-center py-8 text-slate-400">
                Đề cương đang chọn chưa có chuẩn đầu ra học phần (CLO) nào.
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>
      }

      <div class="mt-3 text-xs text-slate-500">
        * Bất biến nghiệp vụ (Q22): Ô chưa có liên kết hoặc trọng số (<code>weight</code>) để trống sẽ hiển thị <strong>—</strong>, tuyệt đối không hiển thị số 0.
      </div>
    </div>
  `,
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
