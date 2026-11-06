import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IPi, IPiRequest, IPlo, IPloRequest, PloCategory } from '@models/program/plo-pi.model';
import { IProgramVersion, IProgramVersionUpdateRequest } from '@models/program/program-version.model';
import { toApiError } from '@services/common/api-error.util';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  contentSummary?: string | null;
  contentOriginal?: string | null;
}

interface IPiFormValue {
  code: string;
  displayOrder: number;
  capabilityLevelRaw?: number | null;
  targetPassRatePercent?: number | null;
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
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzButtonModule,
  ],
})
export class FormCurriculumVersionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly versionSvc = inject(ProgramVersionService);
  private readonly ploPiSvc = inject(PloPiService);
  private readonly alert = inject(ToastrService);

  readonly versionId = signal<string>('');
  readonly version = signal<IProgramVersion | null>(null);

  readonly isSubmitting = signal(false);
  readonly validationErrorMessage = signal<string | null>(null);

  readonly deletedPloIds = signal<string[]>([]);
  readonly deletedPiIds = signal<string[]>([]);

  versionForm!: FormGroup;
  readonly ploForms = signal<IPloFormItem[]>([]);

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

  loadData(): void {
    const vId = this.versionId();
    this.versionSvc.getProgramVersionById(vId).subscribe({
      next: ver => {
        this.version.set(ver);
        this.versionForm.patchValue({
          version: ver.version,
          applicableCohorts: ver.applicableCohorts ?? [],
          totalCredits: ver.totalCredits ?? null,
          durationYears: ver.durationYears ?? null,
        });

        // Tải danh sách PLO và PI
        forkJoin({
          plos: this.ploPiSvc.getPlos(vId).pipe(catchError(() => of([]))),
          pis: this.ploPiSvc.getPis(vId).pipe(catchError(() => of([]))),
        }).subscribe(({ plos, pis }) => {
          this.buildPloPiForms(plos, pis);
        });
      },
      error: err => {
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không tìm thấy phiên bản CTĐT');
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
      displayOrder: [plo?.displayOrder ?? 0, [Validators.required, Validators.min(0)]],
      category: [plo?.category ?? 'UNSPECIFIED'],
      capabilityLevelRaw: [plo?.capabilityLevelRaw ?? null],
      contentSummary: [plo?.contentSummary ?? '', [Validators.maxLength(5000)]],
      contentOriginal: [plo?.contentOriginal ?? '', [Validators.maxLength(5000)]],
    });

    // Nếu đã lưu vào DB -> khóa mã code không cho sửa
    if (plo?.id) {
      group.get('code')?.disable();
    }

    return group;
  }

  private createPiFormGroup(pi?: IPi): FormGroup {
    const ratePercent = pi?.targetPassRate != null ? Math.round(pi.targetPassRate * 100) : null;
    const group = this.fb.group({
      code: [
        pi?.code ?? '',
        [Validators.required, Validators.pattern(/^PI[1-9][0-9]*\.[1-9][0-9]*$/)],
      ],
      displayOrder: [pi?.displayOrder ?? 0, [Validators.required, Validators.min(0)]],
      capabilityLevelRaw: [pi?.capabilityLevelRaw ?? null],
      targetPassRatePercent: [ratePercent, [Validators.min(0), Validators.max(100)]],
      contentShort: [pi?.contentShort ?? '', [Validators.maxLength(2000)]],
      contentOriginal: [pi?.contentOriginal ?? '', [Validators.maxLength(5000)]],
    });

    if (pi?.id) {
      group.get('code')?.disable();
    }

    return group;
  }

  addPlo(): void {
    const currentList = this.ploForms();
    const nextOrder = currentList.length + 1;
    const newForm = this.createPloFormGroup({
      id: '',
      programVersionId: this.versionId(),
      code: `PLO${nextOrder}`,
      displayOrder: nextOrder,
    });

    this.ploForms.update(list => [
      ...list,
      {
        id: undefined,
        isPersisted: false,
        form: newForm,
        pis: [],
      },
    ]);
  }

  removePlo(ploIndex: number): void {
    const list = this.ploForms();
    const target = list[ploIndex];
    if (target.id) {
      this.deletedPloIds.update(ids => [...ids, target.id!]);
      target.pis.forEach(pi => {
        if (pi.id) {
          this.deletedPiIds.update(ids => [...ids, pi.id!]);
        }
      });
    }
    this.ploForms.update(l => l.filter((_, idx) => idx !== ploIndex));
  }

  addPi(ploIndex: number): void {
    const list = this.ploForms();
    const plo = list[ploIndex];
    const nextOrder = plo.pis.length + 1;
    const ploCode = (plo.form.get('code')?.value as string | null) ?? 'PLO1';
    const ploNumberMatch = /PLO(\d+)/.exec(ploCode);
    const ploNum = ploNumberMatch ? ploNumberMatch[1] : '1';

    const newPiForm = this.createPiFormGroup({
      id: '',
      programVersionId: this.versionId(),
      ploId: plo.id ?? '',
      code: `PI${ploNum}.${nextOrder}`,
      displayOrder: nextOrder,
    });

    plo.pis.push({
      id: undefined,
      isPersisted: false,
      form: newPiForm,
    });

    this.ploForms.set([...list]);
  }

  removePi(ploIndex: number, piIndex: number): void {
    const list = this.ploForms();
    const plo = list[ploIndex];
    const targetPi = plo.pis[piIndex];
    if (targetPi.id) {
      this.deletedPiIds.update(ids => [...ids, targetPi.id!]);
    }
    plo.pis = plo.pis.filter((_, idx) => idx !== piIndex);
    this.ploForms.set([...list]);
  }

  cancelChanges(): void {
    this.router.navigate(['/mng/curriculum/versions', this.versionId()]);
  }

  saveChanges(): void {
    this.validationErrorMessage.set(null);

    // Kiểm tra version form
    if (this.versionForm.invalid) {
      this.validationErrorMessage.set('Thông tin phiên bản chưa hợp lệ');
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
          this.executeSavePlosAndPis(vId);
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

  private executeSavePlosAndPis(vId: string): void {
    const ploItems = this.ploForms();
    if (ploItems.length === 0) {
      this.finishSave();
      return;
    }

    // Tuần tự lưu từng PLO, sau đó lưu các PI của PLO đó
    this.savePloSequential(vId, ploItems, 0, () => {
      this.finishSave();
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

  private finishSave(): void {
    this.isSubmitting.set(false);
    this.alert.success('Lưu chương trình đào tạo & Chuẩn đầu ra thành công');
    this.router.navigate(['/mng/curriculum/versions', this.versionId()]);
  }
}
