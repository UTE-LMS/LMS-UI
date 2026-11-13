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
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IClo, ICloPiLinkCell, ICloPiMatrix } from '@models/course/clo.model';
import { IProgramCourse } from '@models/course/course.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { IPi } from '@models/program/plo-pi.model';
import { VerificationStatus } from '@models/program/program-verification.model';
import { toApiError } from '@services/common/api-error.util';
import { CloService } from '@services/course/clo.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { BloomLevelLabelComponent } from '@widget/level-label/bloom-level-label.component';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { VerificationBadgeComponent } from '@widget/verification-badge/verification-badge.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ToastrService } from 'ngx-toastr';

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
          @if (syl.status !== 'DRAFT') {
          <span class="text-amber-800 font-medium">
            <i class="fa-solid fa-lock mr-1"></i>Đề cương đã khóa sửa đổi cấu trúc liên kết CLO–PI (TD-27).
          </span>
          } @else if (canMutateMatrix()) {
          <span class="text-blue-700 font-medium">
            * Click vào ô trống (—) để thiết lập liên kết CLO → PI
          </span>
          }
          @if (isQaOfficer()) {
          <span class="text-indigo-700 font-medium ml-3">
            * QA Officer: Click nút "Thẩm định" tại từng ô liên kết để xác nhận ĐBCL (US-12/AC-3)
          </span>
          }
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

                  <app-verification-badge
                    [status]="cell.verification?.status"
                    [note]="cell.verification?.note"
                  />

                  <div class="flex items-center gap-2 mt-0.5">
                    @if (isQaOfficer()) {
                    <button
                      type="button"
                      class="text-[11px] font-semibold text-indigo-600 hover:underline bg-transparent border-0 cursor-pointer"
                      (click)="openVerifyModal(cell, clo, pi)"
                    >
                      Thẩm định
                    </button>
                    }
                    @if (canMutateMatrix()) {
                    <button
                      type="button"
                      class="text-[11px] font-semibold text-rose-600 hover:underline bg-transparent border-0 cursor-pointer"
                      (click)="deleteLink(cell)"
                    >
                      Xóa
                    </button>
                    }
                  </div>
                </div>
                } @else {
                  @if (canMutateMatrix()) {
                  <button
                    type="button"
                    class="w-full py-3 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-colors cursor-pointer bg-transparent"
                    (click)="openCreateLinkModal(clo, pi)"
                    title="Click để tạo liên kết CLO → PI"
                  >
                    — (Nối)
                  </button>
                  } @else {
                  <span class="text-slate-400" title="Chưa có liên kết (không quy đổi thành 0)">—</span>
                  }
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

    <!-- Modal Tạo Liên kết CLO -> PI -->
    <nz-modal
      [nzVisible]="isCreateLinkModalVisible()"
      nzTitle="Thiết lập Liên kết Chuẩn đầu ra (CLO → PI)"
      [nzWidth]="480"
      (nzOnCancel)="isCreateLinkModalVisible.set(false)"
      (nzOnOk)="submitCreateLink()"
      [nzOkLoading]="isSubmitting()"
      nzOkText="Tạo liên kết"
      nzCancelText="Hủy"
    >
      <ng-container *nzModalContent>
        <div class="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 mb-4 space-y-1">
          <div><strong>CLO học phần:</strong> {{ pendingClo()?.code }} — {{ pendingClo()?.contentOriginal || '—' }}</div>
          <div><strong>Chỉ số PI CTĐT:</strong> {{ pendingPi()?.code }} — {{ pendingPi()?.contentShort || pendingPi()?.contentOriginal || '—' }}</div>
        </div>

        <form [formGroup]="linkForm" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzFor="linkWeight">Trọng số đóng góp weight ∈ (0, 1] (Tùy chọn - Q22)</nz-form-label>
            <nz-form-control nzErrorTip="Nếu nhập, trọng số phải lớn hơn 0 và nhỏ hơn hoặc bằng 1">
              <input
                nz-input
                type="number"
                step="0.05"
                min="0.01"
                max="1"
                id="linkWeight"
                formControlName="weight"
                placeholder="Để trống (null) nếu chưa có quy tắc trọng số Q22"
              />
            </nz-form-control>
          </nz-form-item>
        </form>
      </ng-container>
    </nz-modal>

    <!-- Modal Thẩm định ĐBCL Liên kết CLO-PI dành cho QA Officer (US-12/AC-3) -->
    <nz-modal
      [nzVisible]="isVerifyModalVisible()"
      nzTitle="Thẩm định Liên kết CLO–PI (QA Officer)"
      [nzWidth]="520"
      (nzOnCancel)="isVerifyModalVisible.set(false)"
      (nzOnOk)="submitVerifyLink()"
      [nzOkLoading]="isSubmitting()"
      nzOkText="Lưu kết quả thẩm định"
      nzCancelText="Hủy"
    >
      <ng-container *nzModalContent>
        <div class="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 mb-4">
          <strong>Cặp liên kết:</strong> {{ pendingClo()?.code }} → {{ pendingPi()?.code }}
        </div>

        <form [formGroup]="verifyForm" nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired>Trạng thái xác nhận ĐBCL</nz-form-label>
            <nz-form-control>
              <nz-radio-group formControlName="status" class="flex flex-col gap-2">
                <label nz-radio nzValue="VERIFIED" class="text-emerald-700 font-medium">
                  ĐÃ XÁC NHẬN (VERIFIED — Đủ điều kiện tính chính thức F06)
                </label>
                <label nz-radio nzValue="NEEDS_CLARIFICATION" class="text-amber-700 font-medium">
                  CẦN LÀM RÕ (NEEDS_CLARIFICATION — Yêu cầu rà soát lại)
                </label>
                <label nz-radio nzValue="UNVERIFIED" class="text-slate-600">
                  CHƯA XÁC NHẬN (UNVERIFIED)
                </label>
              </nz-radio-group>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzFor="verifyNote">Ghi chú thẩm định</nz-form-label>
            <nz-form-control>
              <textarea
                nz-input
                id="verifyNote"
                rows="3"
                formControlName="note"
                placeholder="Nhập nhận xét đối chiếu ma trận đề cương và CTĐT..."
              ></textarea>
            </nz-form-control>
          </nz-form-item>
        </form>
      </ng-container>
    </nz-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NzSelectModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzRadioModule,
    StatusChipComponent,
    VerificationBadgeComponent,
    BloomLevelLabelComponent,
  ],
})
export class CloPiMatrixTableComponent {
  private readonly syllabusSvc = inject(SyllabusService);
  private readonly cloSvc = inject(CloService);
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);

  readonly versionId = input.required<string>();
  readonly programCourses = input<IProgramCourse[]>([]);
  readonly initialCourseId = input<string | null>(null);
  readonly canManageLinks = input<boolean>(false);
  readonly isQaOfficer = input<boolean>(false);

  readonly selectedCourseId = signal<string>('');
  readonly syllabi = signal<ISyllabus[]>([]);
  readonly selectedSyllabusId = signal<string>('');
  readonly matrix = signal<ICloPiMatrix | null>(null);

  readonly isLoading = signal(false);
  readonly hasError = signal(false);

  /** Modal tạo liên kết & Modal QA thẩm định */
  readonly isCreateLinkModalVisible = signal(false);
  readonly isVerifyModalVisible = signal(false);
  readonly isSubmitting = signal(false);

  readonly pendingClo = signal<IClo | null>(null);
  readonly pendingPi = signal<IPi | null>(null);
  readonly pendingCell = signal<ICloPiLinkCell | null>(null);

  readonly selectedSyllabus = computed(
    () => this.syllabi().find(s => s.id === this.selectedSyllabusId()) ?? null,
  );

  /** Bất biến TD-27: Chỉ cho phép tạo/xóa liên kết khi đề cương đang ở DRAFT và người dùng có quyền quản lý */
  readonly canMutateMatrix = computed(
    () => this.canManageLinks() && this.selectedSyllabus()?.status === 'DRAFT',
  );

  readonly matrixClos = computed(() => this.matrix()?.clos ?? []);
  readonly matrixPis = computed(() => this.matrix()?.pis ?? []);

  readonly linkForm: FormGroup = this.fb.group({
    weight: [null as number | null, [Validators.min(0.0001), Validators.max(1)]],
  });

  readonly verifyForm: FormGroup = this.fb.group({
    status: ['VERIFIED' as VerificationStatus, [Validators.required]],
    note: [''],
  });

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

  openCreateLinkModal(clo: IClo, pi: IPi): void {
    if (!this.canMutateMatrix()) {
      return;
    }
    this.pendingClo.set(clo);
    this.pendingPi.set(pi);
    this.linkForm.reset({ weight: null });
    this.isCreateLinkModalVisible.set(true);
  }

  submitCreateLink(): void {
    const clo = this.pendingClo();
    const pi = this.pendingPi();
    const sylId = this.selectedSyllabusId();
    if (!clo || !pi || !sylId || !this.canMutateMatrix()) {
      return;
    }
    if (this.linkForm.invalid) {
      return;
    }

    const raw = this.linkForm.getRawValue() as { weight: number | string | null; };
    const weightVal =
      raw.weight !== null && raw.weight !== '' && raw.weight !== undefined
        ? Number(raw.weight)
        : null;

    this.isSubmitting.set(true);
    this.cloSvc
      .createCloPiLink(sylId, {
        programVersionId: this.versionId(),
        cloId: clo.id,
        piId: pi.id,
        weight: weightVal ?? 1.0,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isCreateLinkModalVisible.set(false);
          this.alert.success(`Đã thiết lập liên kết ${clo.code} → ${pi.code}`);
          this.loadMatrix(sylId);
        },
        error: err => {
          this.isSubmitting.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể tạo liên kết CLO–PI');
        },
      });
  }

  deleteLink(cell: ICloPiLinkCell): void {
    if (!this.canMutateMatrix()) {
      return;
    }
    this.cloSvc.deleteCloPiLink(cell.linkId).subscribe({
      next: () => {
        this.alert.success('Đã xóa liên kết CLO–PI');
        this.loadMatrix();
      },
      error: err => {
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không thể xóa liên kết CLO–PI');
      },
    });
  }

  openVerifyModal(cell: ICloPiLinkCell, clo: IClo, pi: IPi): void {
    if (!this.isQaOfficer()) {
      return;
    }
    this.pendingCell.set(cell);
    this.pendingClo.set(clo);
    this.pendingPi.set(pi);
    this.verifyForm.reset({
      status: cell.verification?.status ?? 'VERIFIED',
      note: cell.verification?.note ?? '',
    });
    this.isVerifyModalVisible.set(true);
  }

  submitVerifyLink(): void {
    const cell = this.pendingCell();
    if (!cell || !this.isQaOfficer()) {
      return;
    }
    const raw = this.verifyForm.getRawValue() as { status: VerificationStatus; note: string; };
    this.isSubmitting.set(true);
    this.cloSvc
      .verifyCloPiLink(cell.linkId, {
        status: raw.status,
        note: raw.note?.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isVerifyModalVisible.set(false);
          this.alert.success('Đã cập nhật kết quả thẩm định liên kết CLO–PI');
          this.loadMatrix();
        },
        error: err => {
          this.isSubmitting.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể thẩm định liên kết CLO–PI');
        },
      });
  }
}
