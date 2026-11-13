import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IProgramCourse } from '@models/course/course.model';
import {
  ICoursePiContribution,
  IPi,
  IPiRequest,
  IPlo,
  IPloRequest,
  PiContributionType,
  PloCategory,
} from '@models/program/plo-pi.model';
import { IProgramVersion, IProgramVersionUpdateRequest } from '@models/program/program-version.model';
import { toApiError } from '@services/common/api-error.util';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProgramCoursesTableComponent } from '../detail-curriculum-version/program-courses-table/program-courses-table.component';

export interface IPiFormItem {
  id?: string;
  isPersisted: boolean;
  form: FormGroup;
}

export interface IPloFormItem {
  id?: string;
  isPersisted: boolean;
  form: FormGroup;
  pis: IPiFormItem[];
}

interface IPloFormValue {
  code: string;
  displayOrder: number;
  category: PloCategory;
  capabilityLevelRaw?: number | null;
  passThreshold: number;
  contentSummary?: string | null;
  contentOriginal?: string | null;
}

interface IPiFormValue {
  code: string;
  displayOrder: number;
  capabilityLevelRaw?: number | null;
  targetPassRatePercent?: number | null;
  weight: number;
  passThreshold: number;
  contentShort?: string | null;
  contentOriginal?: string | null;
}

@Component({
  selector: 'app-form-curriculum-version',
  templateUrl: './form-curriculum-version.component.html',
  styleUrl: './form-curriculum-version.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    NzStepsModule,
    NzTableModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzButtonModule,
    ProgramCoursesTableComponent,
  ],
})
export class FormCurriculumVersionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly versionSvc = inject(ProgramVersionService);
  private readonly ploPiSvc = inject(PloPiService);
  private readonly alert = inject(ToastrService);

  /** Bước hiện tại của Wizard: 0 = CĐR, 1 = Kế hoạch Học phần, 2 = Ma trận I/R/M, 3 = Review */
  readonly currentStep = signal(0);

  readonly versionId = signal<string>('');
  readonly version = signal<IProgramVersion | null>(null);

  readonly isSubmitting = signal(false);
  readonly validationErrorMessage = signal<string | null>(null);

  readonly deletedPloIds = signal<string[]>([]);
  readonly deletedPiIds = signal<string[]>([]);

  versionForm!: FormGroup;
  readonly ploForms = signal<IPloFormItem[]>([]);

  /** Dữ liệu nạp từ API phục vụ các bước Wizard */
  readonly plos = signal<IPlo[]>([]);
  readonly pis = signal<IPi[]>([]);
  readonly courses = signal<IProgramCourse[]>([]);
  readonly contributions = signal<ICoursePiContribution[]>([]);
  readonly isCoursesLoading = signal(false);
  readonly isContributionsLoading = signal(false);

  readonly sortedPlos = computed(() => [...this.plos()].sort((a, b) => a.displayOrder - b.displayOrder));

  readonly coveredPiIds = computed(() => {
    const contribs = this.contributions();
    return new Set(contribs.map(c => c.piId));
  });

  readonly coveredPiCount = computed(() => {
    const covered = this.coveredPiIds();
    return this.pis().filter(pi => covered.has(pi.id)).length;
  });

  readonly totalPiCount = computed(() => this.pis().length);

  readonly uncoveredPis = computed(() => {
    const covered = this.coveredPiIds();
    return this.pis().filter(pi => !covered.has(pi.id));
  });

  readonly coveragePercent = computed(() => {
    const total = this.totalPiCount();
    if (total === 0) {
      return 0;
    }
    return Math.round((this.coveredPiCount() / total) * 100);
  });

  readonly totalCourseCredits = computed(() => {
    return this.courses().reduce((sum, c) => sum + (c.course?.credits ?? 0), 0);
  });

  ngOnInit(): void {
    this.initVersionForm();
    const id = this.route.snapshot.paramMap.get('versionId');
    if (id) {
      this.versionId.set(id);
      this.loadData();
    }
  }

  private initVersionForm(): void {
    this.versionForm = this.fb.group({
      version: ['', [Validators.required, Validators.maxLength(100)]],
      applicableCohorts: [[]],
      totalCredits: [null, [Validators.min(0)]],
      durationYears: [null, [Validators.min(0)]],
    });
  }

  loadData(onDone?: () => void): void {
    const vId = this.versionId();
    if (!vId) {
      return;
    }

    this.versionSvc.getProgramVersionById(vId).subscribe({
      next: ver => {
        this.version.set(ver);
        this.versionForm.patchValue({
          version: ver.version,
          applicableCohorts: ver.applicableCohorts ?? [],
          totalCredits: ver.totalCredits ?? null,
          durationYears: ver.durationYears ?? null,
        });

        // Tải đồng thời PLO, PI, Danh sách học phần và Ma trận I/R/M
        forkJoin({
          plos: this.ploPiSvc.getPlos(vId).pipe(catchError(() => of([]))),
          pis: this.ploPiSvc.getPis(vId).pipe(catchError(() => of([]))),
          courses: this.ploPiSvc.getProgramCourses(vId).pipe(catchError(() => of([]))),
          contributions: this.ploPiSvc.getContributions(vId).pipe(catchError(() => of([]))),
        }).subscribe(({ plos, pis, courses, contributions }) => {
          this.plos.set(plos);
          this.pis.set(pis);
          this.courses.set(courses);
          this.contributions.set(contributions);
          this.buildPloPiForms(plos, pis);
          onDone?.();
        });
      },
      error: err => {
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không tìm thấy phiên bản CTĐT');
      },
    });
  }

  loadCourses(): void {
    const vId = this.versionId();
    if (!vId) {
      return;
    }
    this.isCoursesLoading.set(true);
    this.ploPiSvc.getProgramCourses(vId).subscribe({
      next: res => {
        this.courses.set(res || []);
        this.isCoursesLoading.set(false);
      },
      error: () => {
        this.isCoursesLoading.set(false);
      },
    });
  }

  loadContributions(): void {
    const vId = this.versionId();
    if (!vId) {
      return;
    }
    this.isContributionsLoading.set(true);
    this.ploPiSvc.getContributions(vId).subscribe({
      next: res => {
        this.contributions.set(res || []);
        this.isContributionsLoading.set(false);
      },
      error: () => {
        this.isContributionsLoading.set(false);
      },
    });
  }

  private buildPloPiForms(plos: IPlo[], pis: IPi[]): void {
    const sorted = [...plos].sort((a, b) => a.displayOrder - b.displayOrder);
    const formItems: IPloFormItem[] = sorted.map(plo => {
      const ploForm = this.createPloFormGroup(plo);
      const subPis = pis
        .filter(p => p.ploId === plo.id)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const piItems: IPiFormItem[] = subPis.map(pi => ({
        id: pi.id,
        isPersisted: true,
        form: this.createPiFormGroup(pi),
      }));

      return {
        id: plo.id,
        isPersisted: true,
        form: ploForm,
        pis: piItems,
      };
    });

    this.ploForms.set(formItems);
  }

  private createPloFormGroup(plo?: IPlo): FormGroup {
    const group = this.fb.group({
      code: [
        plo?.code ?? '',
        [Validators.required, Validators.pattern(/^PLO[1-9][0-9]*$/)],
      ],
      displayOrder: [plo?.displayOrder ?? this.ploForms().length + 1, [Validators.required]],
      category: [plo?.category ?? 'SPECIALIZED', [Validators.required]],
      capabilityLevelRaw: [plo?.capabilityLevelRaw ?? null],
      passThreshold: [
        plo?.passThreshold ?? 0.5,
        [Validators.required, Validators.min(0.01), Validators.max(1.0)],
      ],
      contentSummary: [plo?.contentSummary ?? '', [Validators.maxLength(2000)]],
      contentOriginal: [plo?.contentOriginal ?? '', [Validators.maxLength(2000)]],
    });

    if (plo?.id) {
      group.get('code')?.disable();
    }
    return group;
  }

  private createPiFormGroup(pi?: IPi): FormGroup {
    const passRatePercent =
      pi?.targetPassRate != null ? Math.round(pi.targetPassRate * 100) : null;

    const group = this.fb.group({
      code: [
        pi?.code ?? '',
        [Validators.required, Validators.pattern(/^PI[1-9][0-9]*(\.[1-9][0-9]*)+$/)],
      ],
      displayOrder: [pi?.displayOrder ?? 1, [Validators.required]],
      capabilityLevelRaw: [pi?.capabilityLevelRaw ?? null],
      targetPassRatePercent: [passRatePercent, [Validators.min(0), Validators.max(100)]],
      weight: [
        pi?.weight ?? 1.0,
        [Validators.required, Validators.min(0.01), Validators.max(1.0)],
      ],
      passThreshold: [
        pi?.passThreshold ?? 0.5,
        [Validators.required, Validators.min(0.01), Validators.max(1.0)],
      ],
      contentShort: [pi?.contentShort ?? '', [Validators.maxLength(2000)]],
      contentOriginal: [pi?.contentOriginal ?? '', [Validators.maxLength(2000)]],
    });

    if (pi?.id) {
      group.get('code')?.disable();
    }
    return group;
  }

  addPlo(): void {
    const nextOrder = this.ploForms().length + 1;
    const newGroup = this.createPloFormGroup({
      id: '',
      programVersionId: this.versionId(),
      code: `PLO${nextOrder}`,
      displayOrder: nextOrder,
      category: 'SPECIALIZED',
    });

    const item: IPloFormItem = {
      isPersisted: false,
      form: newGroup,
      pis: [],
    };
    this.ploForms.update(list => [...list, item]);
  }

  removePlo(index: number): void {
    const target = this.ploForms()[index];
    if (target?.id) {
      this.deletedPloIds.update(ids => [...ids, target.id!]);
      target.pis.forEach(pi => {
        if (pi.id) {
          this.deletedPiIds.update(piIds => [...piIds, pi.id!]);
        }
      });
    }
    this.ploForms.update(list => list.filter((_, idx) => idx !== index));
  }

  addPi(ploIndex: number): void {
    const ploItem = this.ploForms()[ploIndex];
    if (!ploItem) {
      return;
    }
    const ploCode = (ploItem.form.get('code')?.value as string | null) ?? 'PLO1';
    const numPart = ploCode.replace('PLO', '');
    const nextPiOrder = ploItem.pis.length + 1;

    const newPiGroup = this.createPiFormGroup({
      id: '',
      programVersionId: this.versionId(),
      ploId: ploItem.id ?? '',
      code: `PI${numPart}.${nextPiOrder}`,
      displayOrder: nextPiOrder,
    });

    const piItem: IPiFormItem = {
      isPersisted: false,
      form: newPiGroup,
    };

    ploItem.pis = [...ploItem.pis, piItem];
    this.ploForms.update(list => [...list]);
  }

  removePi(ploIndex: number, piIndex: number): void {
    const ploItem = this.ploForms()[ploIndex];
    if (!ploItem) {
      return;
    }
    const targetPi = ploItem.pis[piIndex];
    if (targetPi?.id) {
      this.deletedPiIds.update(ids => [...ids, targetPi.id!]);
    }
    ploItem.pis = ploItem.pis.filter((_, idx) => idx !== piIndex);
    this.ploForms.update(list => [...list]);
  }

  /**
   * Lưu thông tin Step 0 (Version + PLO + PI)
   */
  saveStep0(onSuccess?: () => void): void {
    this.validationErrorMessage.set(null);

    // Kiểm tra version form
    if (this.versionForm.invalid) {
      this.validationErrorMessage.set('Vui lòng kiểm tra lại thông tin phiên bản');
      return;
    }

    // Kiểm tra PLO và PI forms
    let hasInvalid = false;
    this.ploForms().forEach(plo => {
      if (plo.form.invalid) {
        hasInvalid = true;
      }
      plo.pis.forEach(pi => {
        if (pi.form.invalid) {
          hasInvalid = true;
        }
      });
    });

    if (hasInvalid) {
      this.validationErrorMessage.set(
        'Vui lòng kiểm tra lại mã PLO (dạng PLO1, PLO2...) hoặc mã PI (dạng PI1.1, PI6.2...) và các trường bắt buộc',
      );
      return;
    }

    this.isSubmitting.set(true);
    const vId = this.versionId();
    const vFormVal = this.versionForm.getRawValue() as {
      version: string;
      applicableCohorts?: string[];
      totalCredits?: number | null;
      durationYears?: number | null;
    };

    const updateVersionReq: IProgramVersionUpdateRequest = {
      version: vFormVal.version.trim(),
      totalCredits: vFormVal.totalCredits != null ? Number(vFormVal.totalCredits) : undefined,
      durationYears: vFormVal.durationYears != null ? Number(vFormVal.durationYears) : undefined,
      applicableCohorts: vFormVal.applicableCohorts ?? [],
    };

    // 1. Cập nhật version trước
    this.versionSvc.updateProgramVersion(vId, updateVersionReq).subscribe({
      next: () => {
        // 2. Xóa các PLO và PI bị remove
        this.executeDeletes(vId, () => {
          // 3. Lưu danh sách PLO và PI
          this.executeSavePlosAndPis(vId, () => {
            this.isSubmitting.set(false);
            this.alert.success('Lưu cấu trúc phiên bản & Chuẩn đầu ra thành công');
            // Tải lại dữ liệu mới nhất (gán id cho các PLO/PI mới)
            this.loadData(() => {
              if (onSuccess) {
                onSuccess();
              }
            });
          });
        });
      },
      error: err => {
        this.isSubmitting.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không thể cập nhật phiên bản');
      },
    });
  }

  private executeDeletes(vId: string, onComplete: () => void): void {
    const deleteObservables = [
      ...this.deletedPiIds().map(piId => this.ploPiSvc.deletePi(vId, piId).pipe(catchError(() => of(undefined)))),
      ...this.deletedPloIds().map(ploId => this.ploPiSvc.deletePlo(vId, ploId).pipe(catchError(() => of(undefined)))),
    ];

    if (deleteObservables.length === 0) {
      onComplete();
      return;
    }

    forkJoin(deleteObservables).subscribe({
      next: () => onComplete(),
      error: () => onComplete(),
    });
  }

  private executeSavePlosAndPis(vId: string, onDone: () => void): void {
    const ploItems = this.ploForms();
    if (ploItems.length === 0) {
      onDone();
      return;
    }

    this.savePloSequential(vId, ploItems, 0, () => {
      onDone();
    });
  }

  private savePloSequential(
    vId: string,
    ploItems: IPloFormItem[],
    index: number,
    onAllComplete: () => void,
  ): void {
    if (index >= ploItems.length) {
      onAllComplete();
      return;
    }

    const item = ploItems[index];
    const rawVal = item.form.getRawValue() as IPloFormValue;
    const ploReq: IPloRequest = {
      code: rawVal.code.trim().toUpperCase(),
      displayOrder: Number(rawVal.displayOrder),
      category: rawVal.category,
      capabilityLevelRaw: rawVal.capabilityLevelRaw ? Number(rawVal.capabilityLevelRaw) : undefined,
      passThreshold: Number(rawVal.passThreshold),
      contentSummary: rawVal.contentSummary ? rawVal.contentSummary.trim() : undefined,
      contentOriginal: rawVal.contentOriginal ? rawVal.contentOriginal.trim() : undefined,
    };

    const savePlo$ = item.id
      ? this.ploPiSvc.updatePlo(vId, item.id, ploReq)
      : this.ploPiSvc.createPlo(vId, ploReq);

    savePlo$.subscribe({
      next: savedPlo => {
        const ploId = savedPlo.id;
        // Lưu các PI của PLO này
        this.savePisOfPlo(vId, ploId, item.pis, () => {
          this.savePloSequential(vId, ploItems, index + 1, onAllComplete);
        });
      },
      error: err => {
        this.isSubmitting.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? `Lỗi lưu PLO ${rawVal.code}`);
      },
    });
  }

  private savePisOfPlo(
    vId: string,
    ploId: string,
    piItems: IPiFormItem[],
    onComplete: () => void,
  ): void {
    if (piItems.length === 0) {
      onComplete();
      return;
    }

    const piCalls = piItems.map(piItem => {
      const piVal = piItem.form.getRawValue() as IPiFormValue;
      const targetRate =
        piVal.targetPassRatePercent != null ? Number(piVal.targetPassRatePercent) / 100 : undefined;

      const piReq: IPiRequest = {
        ploId,
        code: piVal.code.trim().toUpperCase(),
        displayOrder: Number(piVal.displayOrder),
        capabilityLevelRaw: piVal.capabilityLevelRaw ? Number(piVal.capabilityLevelRaw) : undefined,
        targetPassRate: targetRate,
        weight: Number(piVal.weight),
        passThreshold: Number(piVal.passThreshold),
        contentShort: piVal.contentShort ? piVal.contentShort.trim() : undefined,
        contentOriginal: piVal.contentOriginal ? piVal.contentOriginal.trim() : undefined,
      };

      return piItem.id
        ? this.ploPiSvc.updatePi(vId, piItem.id, piReq)
        : this.ploPiSvc.createPi(vId, piReq);
    });

    forkJoin(piCalls).subscribe({
      next: () => onComplete(),
      error: err => {
        this.isSubmitting.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Lỗi khi lưu các PI');
      },
    });
  }

  saveChanges(): void {
    this.saveStep0();
  }

  saveAndGoToStep1(): void {
    this.saveStep0(() => {
      this.loadCourses();
      this.currentStep.set(1);
    });
  }

  goToStep(step: number): void {
    this.onStepIndexChange(step);
  }

  onStepIndexChange(targetStep: number): void {
    if (this.currentStep() === 0 && targetStep > 0) {
      this.saveStep0(() => {
        if (targetStep === 1) {
          this.loadCourses();
        } else if (targetStep === 2) {
          this.loadContributions();
        }
        this.currentStep.set(targetStep);
      });
    } else {
      if (targetStep === 1) {
        this.loadCourses();
      } else if (targetStep === 2) {
        this.loadContributions();
      }
      this.currentStep.set(targetStep);
    }
  }

  finishWizard(): void {
    this.alert.success('Hoàn tất cấu hình phiên bản CTĐT');
    this.router.navigate(['/mng/curriculum/versions', this.versionId()]);
  }

  cancelChanges(): void {
    this.router.navigate(['/mng/curriculum/versions', this.versionId()]);
  }

  // ========== Logic Ma trận I/R/M (Step 2 & Step 3) ==========

  getPisOfPlo(ploId: string): IPi[] {
    return this.pis()
      .filter(pi => pi.ploId === ploId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  getContribution(courseId: string, piId: string): ICoursePiContribution | undefined {
    return this.contributions().find(c => c.courseId === courseId && c.piId === piId);
  }

  onCellClick(courseId: string, piId: string): void {
    const current = this.getContribution(courseId, piId);
    const vId = this.versionId();

    if (!current) {
      // Trống -> I
      this.ploPiSvc
        .createContribution(vId, { courseId, piId, contribution: 'I' })
        .subscribe({
          next: created => {
            this.contributions.update(list => [...list, created]);
          },
          error: err => {
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể cập nhật đóng góp I/R/M');
          },
        });
    } else if (current.contribution === 'I') {
      // I -> R
      this.cycleContribution(current, 'R');
    } else if (current.contribution === 'R') {
      // R -> M
      this.cycleContribution(current, 'M');
    } else {
      // M -> Xóa (về Trống)
      this.ploPiSvc.deleteContribution(vId, current.id).subscribe({
        next: () => {
          this.contributions.update(list => list.filter(c => c.id !== current.id));
        },
        error: err => {
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể xóa đóng góp I/R/M');
        },
      });
    }
  }

  private cycleContribution(oldContrib: ICoursePiContribution, nextType: PiContributionType): void {
    const vId = this.versionId();
    this.ploPiSvc.deleteContribution(vId, oldContrib.id).subscribe({
      next: () => {
        this.ploPiSvc
          .createContribution(vId, {
            courseId: oldContrib.courseId,
            piId: oldContrib.piId,
            contribution: nextType,
          })
          .subscribe({
            next: created => {
              this.contributions.update(list => [
                ...list.filter(c => c.id !== oldContrib.id),
                created,
              ]);
            },
            error: err => {
              const apiErr = toApiError(err);
              this.alert.error(apiErr?.message ?? 'Không thể cập nhật đóng góp I/R/M');
            },
          });
      },
      error: err => {
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không thể cập nhật đóng góp I/R/M');
      },
    });
  }

  formatCohorts(cohorts?: string[]): string {
    if (!cohorts || cohorts.length === 0) {
      return '—';
    }
    return cohorts.join(', ');
  }

  getCourseCode(pc: IProgramCourse): string {
    return pc.course?.code ?? pc.courseId;
  }

  getCourseName(pc: IProgramCourse): string {
    return pc.course?.name ?? '—';
  }
}
