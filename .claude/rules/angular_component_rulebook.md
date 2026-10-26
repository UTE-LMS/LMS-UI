# Angular Component Generation Rulebook
## System Instructions for AI Agent — Angular v21 + TailwindCSS 4 + Ng-Zorro

---

## OVERVIEW AND CORE PRINCIPLES

You are generating **List** and **Form** components for an Angular v21 application that strictly follows the patterns documented in this Rulebook. Every generated component **must** conform to all rules below without exception.

**Technology Stack:**
- Angular v21 (Standalone Components, Signals, Control Flow Syntax)
- TailwindCSS 4 (utility classes, custom sizing units)
- Ng-Zorro Ant Design (UI library)
- RxJS (reactive submission streams)
- `ngx-toastr` (toast notifications)

---

## PART 1 — UNIVERSAL RULES (APPLY TO ALL COMPONENTS)

### 1.1 — Angular Architecture
- Every component **must** be standalone (no `NgModule`). Standalone is the default in Angular v21, so do **not** write `standalone: true`; declare `imports: [...]` directly in `@Component`.
- Every component **must** use `changeDetection: ChangeDetectionStrategy.OnPush`.
- All dependencies **must** be injected using `inject()` — **never** use constructor parameter injection. Declare injected dependencies `private readonly` by default; use `protected readonly` only when the template calls the dependency directly.
- Use signals for local UI state that the template reads, such as the active row switch ID. Read signals with `()` in the template.
- Declare component inputs and outputs with the signal APIs: `input()`, `input.required()`, and `output()`. Do not generate `@Input()` or `@Output()` decorators for new components.
- Keep server-lookup results and mutable repeated-row collections in signals when the template reads them. Bridge RxJS into those signals in one setup method and tear the stream down with `takeUntilDestroyed(this.destroyRef)`.
- Mark initialized component references `readonly` when they are never reassigned, including list managers, breadcrumb metadata, signals, subjects, and eager lookup observables. `readonly` protects the reference; signal and manager state remain mutable through their APIs.
- Use Angular v21 **Control Flow** syntax in all templates: `@if`, `@for`, `@switch`. **Never** use `*ngIf`, `*ngFor`, or `*ngSwitch`.
- All `@for` loops **must** include a `track` expression: `@for (item of list; track item.id; let i = $index)`.

### 1.2 — Import Path Conventions
Use path aliases consistently:
```typescript
import { ... } from '@builder/list-mng-no-filter.builder';
import { ... } from '@builder/list-mng-filter.builder';
import { ... } from '@component-shared/upload-file/upload-file.component';
import { ... } from '@constants/system.constant';
import { ... } from '@constants/url.constant';
import { ... } from '@models/common/file.model';
import { ... } from '@models/common/modal-data.model';
import { ... } from '@models/common/make-form.model';
import { ... } from '@models/ke-khai/<model-name>.model';
import { ... } from '@services/danh-muc/<service-name>.service';
import { ... } from '@services/ke-khai/<service-name>.service';
import { ... } from '@services/common/file.service';
import { ... } from '@ke-khai-shared/<feature>/form-<feature>/form-<feature>.component';
import { ... } from '@widget/breadcrumb/breadcrumb.model';
import { ... } from '@widget/breadcrumb/breadcumb.component';
import { ... } from '@widget/paginate/paginate.component';
import { ... } from '@widget/field-error-display/field-error-display.component';
import { ISiderMenu } from '@models/common/sider-menu.model';
import { <featureCamel>MngMenu } from '@mng/<feature>/<feature>.menu';
import { <featureCamel>UserMenu } from '@main/<feature>/<feature>.menu';
```

#### 1.2.1 — Import Formatting

- Keep a named import on one line while it remains readable.
- When a named import becomes too long, split its specifiers compactly across two or three content lines. Keep multiple specifiers on each line; do not put every imported item on its own line.
- Group specifiers by available line width and retain the trailing comma on wrapped lines:

```typescript
import {
  catchError, debounceTime, distinctUntilChanged, EMPTY, exhaustMap,
  filter, of, Subject, switchMap, tap,
} from 'rxjs';
```

- A single-specifier import remains on one line even when its aliased source path is long; do not introduce a multi-line block containing only one imported item.

### 1.3 — Folder, File, Interface, and Class Naming Conventions (Strictly in English)

All directory paths, file names, component classes, and model interfaces **must be in English**. Do not use Vietnamese terms in technical identifiers (e.g., use `academic-rank` instead of `hoc-ham`, `scientific-paper` instead of `bai-bao-khoa-hoc`). Vietnamese is reserved exclusively for user-facing UI text, headings, breadcrumb labels, and notifications.

```
list-<feature-english-kebab>/
  list-<feature-english-kebab>.component.ts
  list-<feature-english-kebab>.component.html
  list-<feature-english-kebab>.component.css   (optional when local styles exist)

form-<feature-english-kebab>/
  form-<feature-english-kebab>.component.ts
  form-<feature-english-kebab>.component.html
  form-<feature-english-kebab>.component.css   (optional when local styles exist)
```

**Naming rules:**
- **Folders:** English in `kebab-case` (e.g. `src/app/mng/academic-ranks/`, `list-academic-ranks/`, `form-academic-ranks/`).
- **Files:** English in `kebab-case` with standard suffixes (`.component.ts`, `.component.html`, `.model.ts`, `.service.ts`).
- **Component Classes:** English in `PascalCase` (e.g. `ListAcademicRanksComponent`, `FormAcademicRanksComponent`).
- **Interfaces & Types:** English in `PascalCase` prefixed with `I` (e.g. `IAcademicRank`, `IAcademicRankDTO`, `IAcademicRankFilter`).
- **Service Classes:** English in `PascalCase` ending in `Service` (e.g. `AcademicRankService`).
- **Backend JSON properties:** Property names in request/response payloads (JSON) must still match the backend schema (even if some backend fields remain Vietnamese, such as `trangThai` or `thuTu`), but all structural containers (folders, files, classes, interfaces) must strictly be in English.

Most screens rely entirely on Tailwind utilities and project-global classes. If no component-local CSS is required, either keep the repository's existing empty CSS convention or omit both the CSS file and `styleUrl`; never point `styleUrl` at a missing file.

### 1.4 — Feature Menu Configuration Convention (`*.menu.ts`)

Navigation menu items must **never** be defined directly or hardcoded inline within the sidebar component classes (`ManagementSidebarComponent` or `MainSidebarComponent`). Instead, each feature/module isolates its navigation configuration in a standalone `<feature-kebab>.menu.ts` file located in the feature root directory, and the sidebar spreads that array into `listMenu`.

#### 1.4.1 — File Location and Export Naming

Place the menu file at the top level of the feature directory:

```
src/app/mng/<feature-kebab>/
  <feature-kebab>.menu.ts

src/app/main/<feature-kebab>/
  <feature-kebab>.menu.ts
```

- Management feature export: `export const <featureCamel>MngMenu: ISiderMenu[] = [ ... ];`
- Main/User feature export: `export const <featureCamel>UserMenu: ISiderMenu[] = [ ... ];`

#### 1.4.2 — Menu Item Properties and Rules

Menu arrays are typed with `ISiderMenu[]` (imported from `@models/common/sider-menu.model`):

```typescript
export interface ISiderMenu {
  icon: string;
  title: string;
  routerLink: string;
  roles: string[];
  listChild: ISiderMenuChild[];
}
```

Rules for each property:

1. **`icon` (Crucial distinction):**
   - **Parent submenu with children (`listChild.length > 0`):** Must use an **Ng-Zorro icon name** (e.g., `'setting'`, `'pic-left'`, `'idcard'`) without any prefix, because the sidebar template binds it to the Ng-Zorro directive `[nzIcon]` on `nz-submenu`.
   - **Child items / Standalone items (`listChild: []`):** Must use a **FontAwesome icon class string** (e.g., `'fa-solid fa-circle'`, `'fa-solid fa-solar-panel'`), because the sidebar template binds it via `<i [class]="'mr-2 ' + item.icon"></i>`.
2. **`title`:** Vietnamese display label for the menu item (or localized string reference if internationalization is used).
3. **`routerLink`:**
   - Parent item containing children: set to empty string `''`.
   - Leaf / Child item: set to the corresponding route constant from `UrlConstant.ROUTE.MANAGEMENT.*` or `UrlConstant.ROUTE.MAIN.*`.
4. **`roles`:** Array of roles allowed to view the item (e.g., `[SystemConstant.MNG_ROLE.ADMIN]`). An empty array `[]` allows all authorized users who pass the shell's role check.
5. **`listChild`:** Array of sub-items typed as `ISiderMenuChild[]`. Set to `[]` when the menu item has no nested submenus.

#### 1.4.3 — Feature Menu Blueprint

```typescript
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ISiderMenu } from '@models/common/sider-menu.model';

export const <featureCamel>MngMenu: ISiderMenu[] = [
  {
    roles: [SystemConstant.MNG_ROLE.ADMIN],
    icon: '<zorro-icon-name>', // Parent with children: MUST be Ng-Zorro icon name
    title: '<Feature Title>',
    routerLink: '',
    listChild: [
      {
        roles: [SystemConstant.MNG_ROLE.ADMIN],
        icon: 'fa-solid fa-circle', // Child item: MUST be FontAwesome icon class
        title: '<Sub-feature Title>',
        routerLink: UrlConstant.ROUTE.MANAGEMENT.<ROUTE_KEY>,
      },
    ],
  },
];
```

#### 1.4.4 — Sidebar Registration

Import the menu constant and spread it directly into `readonly listMenu: ISiderMenu[]` in the appropriate sidebar component:

- **Management Sidebar** (`src/app/layout/mng/management-sidebar/management-sidebar.component.ts`):
  ```typescript
  import { <featureCamel>MngMenu } from '@mng/<feature-kebab>/<feature-kebab>.menu';

  // Inside ManagementSidebarComponent:
  readonly listMenu: ISiderMenu[] = [
    {
      roles: [SystemConstant.MNG_ROLE.ADMIN],
      icon: 'fa-solid fa-solar-panel',
      title: this.langData.TONG_QUAN,
      routerLink: UrlConstant.ROUTE.MANAGEMENT.DASHBOARD,
      listChild: [],
    },
    ...danhMucMngMenu,
    ...cauHinhMngMenu,
    ...taiKhoanMngMenu,
    ...<featureCamel>MngMenu,
  ];
  ```

- **Main User Sidebar** (`src/app/layout/main/main-sidebar/main-sidebar.component.ts`):
  ```typescript
  import { <featureCamel>UserMenu } from '@main/<feature-kebab>/<feature-kebab>.menu';

  // Inside MainSidebarComponent:
  readonly listMenu: ISiderMenu[] = [
    ...<featureCamel>UserMenu,
  ];
  ```

---

## PART 2 — LIST COMPONENT

### 2.1 — Architecture Decision: Which Builder to Use

| Condition | Builder to Use |
|---|---|
| API accepts only paging plus a scalar search string | `createListManagerNoFilter` |
| API accepts a structured filter object, whether controls appear in a full panel or compact header toolbar | `createListManagerFilter` |

Choose from the service contract, not only from the visual layout. A list with one lookup filter plus text search still uses `createListManagerFilter` when both values belong to one filter DTO.

Fixed audience or ownership constraints do not change the builder choice. A current-user list still uses `createListManagerFilter` when the service accepts a structured filter; keep immutable scope constraints out of the editable `manager.filter`.

### 2.2 — List Component TypeScript (`list-*.component.ts`)

#### 2.2.1 — Typical CRUD Imports
```typescript
import { ChangeDetectionStrategy, Component, inject, signal, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createListManagerNoFilter } from '@builder/list-mng-no-filter.builder';
// OR for filter variant:
import { createListManagerFilter } from '@builder/list-mng-filter.builder';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ModalData } from '@models/common/modal-data.model';
import { I<ModelName> } from '@models/danh-muc/<model-file>.model';
import { <ModelName>Service } from '@services/danh-muc/<service-file>.service';
import { BreadCrumb } from '@widget/breadcrumb/breadcrumb.model';
import { BreadcrumbComponent } from '@widget/breadcrumb/breadcumb.component';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { Form<ModelName>Component } from '../form-<feature>/form-<feature>.component';
```

Treat this as the CRUD baseline, not a reason to keep unused imports. Omit `NzSwitchModule`, `ToastrService`, or status methods when the feature has no status mutation; omit modal/form imports for a read-only list.

**Additional import when the template uses `nz-select`:**
```typescript
import { NzSelectModule } from 'ng-zorro-antd/select';
```

**Additional import when the template consumes an `Observable` with `| async`:**
```typescript
import { AsyncPipe } from '@angular/common';
```

**Additional import when the template formats dates with `| date`:**
```typescript
import { DatePipe } from '@angular/common';
```

**Additional imports only for server-side lookup search:**
```typescript
import { DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IRelatedEntity } from '@models/danh-muc/<related-model-file>.model';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
```

**Additional import only when a list must read authenticated identity for a legacy client-key scope:**
```typescript
import { AuthService } from '@services/auth/auth.service';
```

Add `NzDatePickerModule` or another Ng-Zorro module only when its control is present in the list template. File fields use the shared `UploadFileComponent`, not a screen-level `NzUploadModule` integration.

#### 2.2.2 — Component Decorator
```typescript
@Component({
  selector: 'app-list-<feature-kebab>',
  imports: [
    FormsModule,
    NzGridModule,
    NzModalModule,
    NzSwitchModule, // Only when a status switch is present
    NzInputModule,
    NzTableModule,
    NzButtonModule,
    BreadcrumbComponent,
    TablePaginateComponent,
    Form<ModelName>Component,
    // Add AsyncPipe, DatePipe, NzSelectModule, NzDatePickerModule if needed
  ],
  templateUrl: './list-<feature>.component.html',
  styleUrl: './list-<feature>.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

Omit `styleUrl` when the component has no CSS file, as described in §1.3.

#### 2.2.3 — Class Body: `createListManagerNoFilter` Pattern

```typescript
export class List<ModelName>Component {
  private readonly <serviceVar> = inject(<ModelName>Service);
  private readonly alert = inject(ToastrService);
  private readonly nzModalSvc = inject(NzModalService);

  readonly breadcrumbObj: BreadCrumb = new BreadCrumb({
    heading: '<Vietnamese page title>',
    listBreadcrumb: [{
      title: 'Danh mục',
      link: UrlConstant.ROUTE.MANAGEMENT.DANH_MUC,
    }],
  });

  readonly selectedSwitcherId = signal('');

  readonly manager = createListManagerNoFilter<I<ModelName>>(
    (page, size, search) => this.<serviceVar>.filter(page - 1, size, search)
  );

  openModal(template: TemplateRef<unknown>, data?: I<ModelName>): void {
    const nextModal = new ModalData<I<ModelName>>();
    if (data) {
      nextModal.action = SystemConstant.ACTION.EDIT;
      nextModal.data = data;
    } else {
      nextModal.action = SystemConstant.ACTION.ADD;
    }
    this.manager.modalData.set(nextModal);
    this.nzModalSvc.create({
      nzStyle: { top: '20px' },
      nzWidth: 500,  // Choose from the full 400–1200 guideline based on form complexity
      nzTitle: `${(data ? 'Chỉnh sửa' : 'Thêm mới')} ${this.breadcrumbObj.heading}`,
      nzContent: template,
      nzFooter: null,
      nzMaskClosable: false,
    });
  }

  closeModal(reload?: boolean): void {
    if (reload) {
      this.manager.triggerReload();
    }
    this.nzModalSvc.closeAll();
  }

  changeStatus(id: string): void {
    this.selectedSwitcherId.set(id);
    this.nzModalSvc.confirm({
      nzWidth: 300,
      nzTitle: 'Xác nhận thay đổi trạng thái?',
      nzCancelText: 'Huỷ',
      nzOkDanger: true,
      nzOkText: 'Xác nhận',
      nzOnOk: () => {
        this.<serviceVar>.delete(id)
          .subscribe({
            next: () => {
              this.alert.success('Thay đổi thành công!');
              this.selectedSwitcherId.set('');
              this.manager.triggerReload();
            },
            error: () => { this.selectedSwitcherId.set(''); },
          });
      },
      nzOnCancel: () => { this.selectedSwitcherId.set(''); },
    });
  }

  deleteItem(id: string): void {
    this.nzModalSvc.confirm({
      nzWidth: 350,
      nzTitle: 'Xác nhận xoá?<br><span class="text-red">Lưu ý: Thao tác này không thể khôi phục.</span>',
      nzCancelText: 'Huỷ',
      nzOkDanger: true,
      nzOkText: 'Xác nhận',
      nzOnOk: () => {
        this.<serviceVar>.delete(id)
          .subscribe({
            next: () => {
              this.alert.success('Xoá thành công!');
              this.manager.triggerReload();
            },
          });
      },
    });
  }
}
```

> **RULE:** Do not add `OnInit` only to perform the initial list load. Both builders auto-fetch from their initial `appliedQuery` signal through `toObservable(...)`, `switchMap(...)`, and `toSignal(...)`. Use `triggerReload()` only after a mutation or another explicit refresh event.

> **STATUS MUTATION:** In this project, every service method named `delete(id)` is a bidirectional status toggle: it changes an active record to inactive and an inactive record back to active (`true ↔ false`). It is not a permanent deletion operation. Keep both ON and OFF switch states actionable, reload the list after the mutation, and never expose a separate hard-delete button backed by `delete(id)`. If a future service/backend explicitly defines a distinct permanent-deletion operation, call only that separately named typed method for hard deletion.

#### 2.2.4 — Class Body: `createListManagerFilter` Pattern (with server-side lookup search)

```typescript
export class List<ModelName>Component implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly <serviceVar> = inject(<ModelName>Service);
  // Inject additional lookup services as needed
  private readonly alert = inject(ToastrService);
  private readonly nzModalSvc = inject(NzModalService);

  readonly breadcrumbObj: BreadCrumb = new BreadCrumb({
    heading: '<Vietnamese page title>',
    listBreadcrumb: [{
      title: 'Danh mục',
      link: UrlConstant.ROUTE.MANAGEMENT.DANH_MUC,
    }],
  });

  readonly selectedSwitcherId = signal('');

  // Server-search state (only when a lookup cannot be loaded eagerly)
  readonly searchRelated$ = new Subject<string>();
  readonly relatedOptions = signal<IRelatedEntity[]>([]);

  readonly manager = createListManagerFilter<I<ModelName>, I<ModelName>Filter>(
    (filterObj, page, size) => this.<serviceVar>.filter(filterObj, page - 1, size)
  );

  ngOnInit(): void {
    this.setupLookupSearch();
  }

  private setupLookupSearch(): void {
    this.searchRelated$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(search => search
        ? this.<lookupSvc>.getAll({ search }).pipe(catchError(() => of([])))
        : of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(options => this.relatedOptions.set(options));
  }

  openModal(template: TemplateRef<unknown>, data?: I<ModelName>): void {
    const nextModal = new ModalData<I<ModelName>>();
    if (data) {
      nextModal.action = SystemConstant.ACTION.EDIT;
      nextModal.data = data;
    } else {
      nextModal.action = SystemConstant.ACTION.ADD;
    }
    this.manager.modalData.set(nextModal);
    this.nzModalSvc.create({
      nzStyle: { top: '20px' },
      nzWidth: 600,
      nzTitle: `${(data ? 'Chỉnh sửa' : 'Thêm mới')} ${this.breadcrumbObj.heading}`,
      nzContent: template,
      nzFooter: null,
      nzMaskClosable: false,
    });
  }

  closeModal(reload?: boolean): void {
    if (reload) {
      this.manager.triggerReload();
    }
    this.nzModalSvc.closeAll();
  }

  changeStatus(id: string): void {
    this.selectedSwitcherId.set(id);
    this.nzModalSvc.confirm({
      nzWidth: 300,
      nzTitle: 'Xác nhận thay đổi trạng thái?',
      nzCancelText: 'Huỷ',
      nzOkDanger: true,
      nzOkText: 'Xác nhận',
      nzOnOk: () => {
        this.<serviceVar>.delete(id)
          .subscribe({
            next: () => {
              this.alert.success('Thay đổi thành công!');
              this.selectedSwitcherId.set('');
              this.manager.triggerReload();
            },
            error: () => { this.selectedSwitcherId.set(''); },
          });
      },
      nzOnCancel: () => { this.selectedSwitcherId.set(''); },
    });
  }

  deleteItem(id: string): void {
    this.nzModalSvc.confirm({
      nzWidth: 350,
      nzTitle: 'Xác nhận xoá?<br><span class="text-red">Lưu ý: Thao tác này không thể khôi phục.</span>',
      nzCancelText: 'Huỷ',
      nzOkDanger: true,
      nzOkText: 'Xác nhận',
      nzOnOk: () => {
        this.<serviceVar>.delete(id)
          .subscribe({
            next: () => {
              this.alert.success('Xoá thành công!');
              this.manager.triggerReload();
            },
          });
      },
    });
  }
}
```

If all lookup options can be loaded with `getAll()`, omit `DestroyRef`, `OnInit`, the search subject, and `setupLookupSearch()`. Expose the lookup `Observable` and consume it with `AsyncPipe`, as in the compact header blueprint.

#### 2.2.5 — Conditional Current-User or Audience-Scoped List

The same entity can have separate management and self-service lists while reusing its response model, filter DTO, service, form component, table conventions, and list builder.

- Prefer a backend/service method whose contract already means “for the current user,” such as `filterMine(filter, page, size)`. This avoids treating a client-supplied identity as an authorization boundary.
- When a legacy API requires an identity key in the filter, obtain it from trusted authenticated state or a route resolver. Merge editable draft criteria first and enforced constraints last:

```typescript
this.entityService.filter(
  {
    ...filterObj,
    <ownerField>: currentUserKey,
    <scopeFlag>: true,
  },
  page - 1,
  size,
);
```

- Do not bind `<ownerField>` or `<scopeFlag>` into editable `manager.filter` state.
- In a self-service filter panel, **show every enforced filter DTO field** as a disabled/read-only, type-appropriate control. This includes the current lecturer/owner key and additional fixed flags such as “primary author.” If two enforced fields are sent, render two disabled controls.
- Expose the authenticated display value as a `protected readonly` property when the template needs it. Bind read-only values one-way with `[value]` or `[ngModel]`; never use `[(ngModel)]="manager.filter.<enforcedField>"`.
- Use a disabled `nz-input` for a string/email identity and a disabled `nz-select` for a boolean or enum so the displayed value preserves the field type:

```html
<div nz-col nzSpan="24" nzMd="12" nzLg="6">
  Owner:<br>
  <input nz-input [value]="currentUserKey" disabled />
</div>
<div nz-col nzSpan="24" nzMd="12" nzLg="6">
  Primary owner:<br>
  <nz-select class="w-full" [ngModel]="true" [nzDisabled]="true"
    [nzDropdownMatchSelectWidth]="false">
    <nz-option nzLabel="Có" [nzValue]="true" />
  </nz-select>
</div>
```

`resetFilter()` clears only user-editable criteria; these informational controls retain their enforced values, and the manager callback reapplies the same constraints to every request.
- A route guard or resolver must establish the required identity before list construction. Do not return `EMPTY` for a missing identity: the builder expects a paged emission, and a non-emitting fallback can leave initial or stale state visible.
- Client-side scoping improves UI correctness but is not authorization. The backend must independently enforce ownership and allowed mutations.
- Configure imports, state, and row actions per audience. When the response contains `trangThai`, both management and self-service tables must expose it as the standard controlled status switch; include `NzSwitchModule`, the loading signal, and the typed status method together. Other status fields remain conditional on the workflow and backend mutation contract.
- Reuse the same form only when its DTO and core workflow are shared. Apply the combined role/route validation rule from §3.1.11 when management and self-service callers have different identity requirements.

### 2.3 — List Component HTML Template

The templates below show the management-shell baseline. In a user-facing shell that intentionally omits breadcrumbs, remove `<app-breadcrumb>` and `BreadcrumbComponent` together while retaining typed heading metadata if the title row or modal title uses it.

#### 2.3.1 — `createListManagerNoFilter` HTML Template (with search bar)
```html
<app-breadcrumb [breadcrumb]="breadcrumbObj" />
<div nz-row [nzGutter]="16">
  <div nz-col nzSpan="12">
    <span class="text-xl font-bold uppercase">{{breadcrumbObj.heading}}</span>
  </div>
  <div nz-col nzSpan="12" class="text-right">
    <nz-input-search class="w-full max-w-50 mr-1.25" (nzSearch)="manager.applySearch(true)" nzAllowClear
      [nzEnterButton]="true">
      <input type="text" nz-input placeholder="Tìm kiếm" [(ngModel)]="manager.searchValue"
        (keyup.enter)="manager.applySearch(true)" />
    </nz-input-search>
    <button nz-button class="nz-btn-green" (click)="openModal(formModal)">
      <i class="fa-solid fa-plus mr-1.25"></i>Thêm mới</button>
  </div>
</div>
<hr>
<nz-table class="table-border table-cell-middle table-margin-bot" nzSize="middle"
  nzShowPagination="false" [nzData]="manager.listData().data || []" [nzScroll]="{x: '500px'}">
  <thead>
    <tr>
      <th nzAlign="center" nzWidth="50px">STT</th>
      <!-- Add column headers based on model fields -->
      <th nzAlign="center" nzWidth="100px">Trạng thái</th>
      <th nzAlign="center" nzWidth="100px"><i class="fa-solid fa-cog"></i></th>
    </tr>
  </thead>
  <tbody>
    @for (item of manager.listData().data || []; track item.id; let i = $index) {
    <tr>
      <td nzAlign="center">
        {{ i + 1 + (manager.listData().currentPage - 1) * manager.listData().limit }}
      </td>
      <!-- Add data cells for each model field -->
      <td nzAlign="center">
        <nz-switch class="switcher-on-green switcher-off-red" [(ngModel)]="item.<statusField>"
          [nzLoading]="selectedSwitcherId() === item.id" [nzControl]="true"
          (click)="changeStatus(item.id)" nzCheckedChildren="ON"
          nzUnCheckedChildren="OFF"></nz-switch>
      </td>
      <td nzAlign="center">
        <button nz-button nzType="primary" type="button" nzSize="small" class="mr-1.25"
          (click)="openModal(formModal, item)"><i class="fa-solid fa-edit"></i></button>
        <button nz-button class="nz-btn-red" type="button" nzSize="small"
          (click)="deleteItem(item.id)"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
    }
  </tbody>
</nz-table>
<app-table-paginate [pageConfig]="manager.listData()" (pageChange)="manager.pageChange($event)" />

<ng-template #formModal>
  <app-form-<feature> [modalData]="manager.modalData()" (closeModal)="closeModal($event)" />
</ng-template>
```

> **RULE:** Call `manager.applySearch(true)` whenever the user applies new search or filter criteria. The explicit `true` resets the list to page 1. Calling `applySearch()` currently has the same default, but the explicit argument documents the required paging behavior.

#### 2.3.2 — `createListManagerFilter` HTML Template (with filter panel)
```html
<app-breadcrumb [breadcrumb]="breadcrumbObj" />
<div nz-row [nzGutter]="16">
  <div nz-col nzSpan="8">
    <span class="text-xl font-bold uppercase">{{breadcrumbObj.heading}}</span>
  </div>
  <div nz-col nzSpan="16" class="text-right">
    <button nz-button class="nz-btn-green" (click)="openModal(formModal)">
      <i class="fa-solid fa-plus mr-1.25"></i>Thêm mới</button>
  </div>
</div>
<hr>
<div nz-row [nzGutter]="16">
  <!-- Responsive filter fields: full width, then 2 and 4 per row. -->
  <div nz-col nzSpan="24" nzMd="12" nzLg="6">
    <Filter Label>:<br>
    <nz-select class="w-full" [(ngModel)]="manager.filter.<fieldName>" nzShowSearch
      [nzAllowClear]="true" [nzDropdownMatchSelectWidth]="false"
      nzPlaceHolder="Choose <filter label>">
      @for (item of (listAll<Model>Fn | async); track item.id) {
      <nz-option [nzLabel]="item.<labelField>" [nzValue]="item.id"></nz-option>
      }
    </nz-select>
  </div>
  <!-- For server-search (e.g. typeahead for users): -->
  <div nz-col nzSpan="24" nzMd="12" nzLg="6">
    <Related Entity Label>:<br>
    <nz-select class="w-full" [(ngModel)]="manager.filter.relatedEntity" nzShowSearch
      [nzAllowClear]="true" [nzDropdownMatchSelectWidth]="false" nzServerSearch
      (nzOnSearch)="searchRelated$.next($event)" nzPlaceHolder="Search <related entity>">
      @for (item of relatedOptions(); track item.id) {
      <nz-option [nzLabel]="item.displayName" [nzValue]="item.<valueField>"></nz-option>
      }
    </nz-select>
  </div>
  <!-- Action buttons row -->
  <div nz-col nzSpan="24" class="text-center my-2">
    <button nz-button nzType="primary" class="mr-1.25" (click)="manager.applySearch(true)">
      <i class="fa-solid fa-magnifying-glass mr-1.25"></i>Tìm kiếm</button>
    <button nz-button class="nz-btn-red" (click)="manager.resetFilter()"><i
        class="fa-solid fa-rotate-left mr-1.25"></i>Đặt lại</button>
  </div>
</div>

<nz-table class="table-border table-cell-middle table-margin-bot" nzSize="middle"
  nzShowPagination="false" [nzData]="manager.listData().data || []" [nzScroll]="{x: '1000px'}">
  <thead>
    <tr>
      <th nzAlign="center" nzWidth="50px">STT</th>
      <!-- column headers -->
      <th nzAlign="center" nzWidth="100px">Trạng thái</th>
      <th nzAlign="center" nzWidth="100px"><i class="fa-solid fa-cog"></i></th>
    </tr>
  </thead>
  <tbody>
    @for (item of manager.listData().data || []; track item.id; let i = $index) {
    <tr>
      <td nzAlign="center">
        {{ (manager.listData().currentPage - 1) * manager.listData().limit + i + 1 }}
      </td>
      <!-- data cells -->
      <td nzAlign="center">
        <nz-switch class="switcher-on-green switcher-off-red" [(ngModel)]="item.<statusField>"
          [nzLoading]="selectedSwitcherId() === item.id" [nzControl]="true"
          (click)="changeStatus(item.id)" nzCheckedChildren="ON"
          nzUnCheckedChildren="OFF"></nz-switch>
      </td>
      <td nzAlign="center">
        <button nz-button nzType="primary" type="button" nzSize="small" class="mr-1.25"
          (click)="openModal(formModal, item)"><i class="fa-solid fa-edit"></i></button>
        <button nz-button class="nz-btn-red" type="button" nzSize="small"
          (click)="deleteItem(item.id)"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
    }
  </tbody>
</nz-table>
<app-table-paginate [pageConfig]="manager.listData()" (pageChange)="manager.pageChange($event)" />

<ng-template #formModal>
  <app-form-<feature> [modalData]="manager.modalData()" (closeModal)="closeModal($event)" />
</ng-template>
```

#### 2.3.3 — Optional Compact Header Filter

Use this layout when a structured filter has only a few controls and does not justify a separate filter panel:

After injecting the lookup service, expose its options without a manual subscription:

```typescript
readonly relatedOptions$ = this.relatedService.getAll();
```

```html
<div nz-col nzSpan="16" class="text-right">
  <nz-select class="w-full max-w-50 mr-1.25 text-left"
    [(ngModel)]="manager.filter.relatedEntity" nzShowSearch
    [nzAllowClear]="true" [nzDropdownMatchSelectWidth]="false"
    nzPlaceHolder="Filter by <related entity>"
    (ngModelChange)="manager.applySearch(true)">
    @for (item of (relatedOptions$ | async); track item.id) {
      <nz-option [nzLabel]="item.displayName" [nzValue]="item.<valueField>" />
    }
  </nz-select>
  <nz-input-search class="w-full max-w-50 mr-1.25"
    (nzSearch)="manager.applySearch(true)" nzAllowClear [nzEnterButton]="true">
    <input nz-input type="text" placeholder="Search"
      [(ngModel)]="manager.filter.search"
      (keyup.enter)="manager.applySearch(true)" />
  </nz-input-search>
  <button nz-button class="nz-btn-green" (click)="openModal(formModal)">
    <i class="fa-solid fa-plus mr-1.25"></i>Add new
  </button>
</div>
```

- Use `text-left` on an inline `nz-select` inside a right-aligned toolbar so its selected value remains left-aligned.
- Immediate application on `(ngModelChange)` is appropriate for a small lookup filter. Keep an explicit Search/Reset action row for larger panels or expensive multi-control queries.
- `manager.filter` is draft state. `applySearch(true)` copies it into the reactive applied query; changing the object alone does not request data.

#### 2.3.4 — Structured Filter Control Blueprints

Use a responsive four-column grid for a full filter panel. Each control occupies the full width on small screens, half width on medium screens, and one quarter on large screens:

```html
<div nz-row [nzGutter]="16">
  <div nz-col nzSpan="24" nzMd="12" nzLg="6">
    <Filter label>:<br>
    <!-- filter control -->
  </div>
</div>
```

Use the following controls according to the filter DTO field type.

**Text criterion:**

```html
<input nz-input placeholder="Search"
  [(ngModel)]="manager.filter.search"
  (keyup.enter)="manager.applySearch(true)" />
```

**Tri-state boolean criterion:** keep `undefined`/cleared as “all”, rather than inventing a third boolean value.

```html
<nz-select class="w-full" [(ngModel)]="manager.filter.enabled"
  [nzAllowClear]="true" [nzDropdownMatchSelectWidth]="false"
  nzPlaceHolder="Choose status">
  <nz-option nzLabel="Yes" [nzValue]="true" />
  <nz-option nzLabel="No" [nzValue]="false" />
</nz-select>
```

**Date criterion:** keep the draft value as a `Date` and let the typed service serialize it.

```html
<nz-date-picker class="w-full" nzFormat="dd/MM/yyyy"
  [(ngModel)]="manager.filter.fromDate"
  [nzAllowClear]="true" />
```

- Add `NzDatePickerModule` for date filters and `NzSelectModule` for boolean or lookup filters.
- Apply multi-control panels only from the explicit Search button or Enter on text controls; this avoids one request per partial edit. `resetFilter()` deletes every draft property and reloads page 1.
- Use a server-search select for a large relationship lookup. The select value must match the filter DTO contract: use an ID, email, code, or other scalar business key as declared, not an assumed `id`.

#### 2.3.5 — Date and Constant-Label Table Values

- Import `DatePipe` in the component and its standalone `imports` array when a table uses `{{ item.dateField | date: 'dd/MM/yyyy' }}`.
- When an API returns an enum/code, derive a typed `Record<string, string>` from the shared constant list once in TypeScript and render through that record. Do not duplicate label strings in every row or template branch.
- Bind the status switch to the response model's actual status field (`status`, `enabled`, `trangThai`, `tinhTrang`, and so on). Do not rename or hardcode a different status property in the component.

#### 2.3.6 — Table Columns by Requested Action

The requested task action determines the table's visible entity columns. This rule concerns the user's requested action (`refactor` or `create`), not `SystemConstant.ACTION.ADD`/`EDIT` used by form modals.

- **Refactor action:** Preserve the existing table's entity-column set, order, and visibility, with one mandatory exception: when the entity/response interface contains `trangThai` and the table does not already show it, add a `Trạng thái` column rendered as the standard controlled `nz-switch`. Refactoring may update bindings, labels, formatting, types, status controls, and implementation structure, but must not add or remove any other table column unless the user explicitly requests a column change.
- **Create action:** Render every user-facing business field declared by the entity/response interface as a table column. This includes business identifiers/codes, scalar fields, booleans/status fields, dates, relationships, and collections. Omit framework/internal identity fields such as the conventional `id` property and supporting attachment/evidence fields such as `minhChung` unless the user explicitly requests them. Render object and collection values through meaningful display properties or typed formatters while still representing the corresponding entity field.
- Structural columns such as `STT` and the action column are additional UI columns and do not replace any required entity field.
- An explicit user-provided column list or column addition/removal instruction overrides these defaults.
- After determining the columns, recalculate declared `nzWidth` values and `nzScroll.x`.

### 2.4 — List HTML Rules Summary

| Rule | Detail |
|---|---|
| Breadcrumb | First element on management screens that use `BreadcrumbComponent`; omit its import and rendering only when the containing user-facing shell intentionally supplies navigation context |
| Page title row | `<div nz-row [nzGutter]="16">` with title in `nzSpan="12"` or `nzSpan="8"`, actions in remaining span |
| Title style | `class="text-xl font-bold uppercase"` |
| Divider | `<hr>` immediately after title row |
| Add button style | `class="nz-btn-green"` |
| Filter select placeholder | Set a concise `nzPlaceHolder` that states what to choose or filter |
| Compact filter toolbar | Use `max-w-50 mr-1.25`; add `text-left` to selects inside a `text-right` toolbar |
| Full filter panel | Use `nzSpan="24" nzMd="12" nzLg="6"` per criterion and `[nzGutter]="16"` on the row |
| Boolean filter | Use a clearable true/false select so the cleared value means “all” |
| Date filter | Use a clearable `nz-date-picker`; import `NzDatePickerModule` |
| Table classes | Always: `class="table-border table-cell-middle table-margin-bot"` |
| Table pagination | Always `nzShowPagination="false"` + external `<app-table-paginate>` |
| Table scroll | Set `[nzScroll]` x-axis appropriate to content width |
| Table size | Always `nzSize="middle"` |
| Action column header | `<i class="fa-solid fa-cog"></i>` |
| Row number | Use the page-offset formula by default; display a persisted order field only when it is part of the domain model |
| Visible data columns | For `refactor`, preserve the current table columns and add a missing `trangThai` switch column when the response has that field; for `create`, render every user-facing business field but omit technical identity fields such as `id` and supporting attachment/evidence fields such as `minhChung` unless explicitly requested; explicit user column instructions override these defaults |
| nz-switch style | Bind the model's actual status field; use `class="switcher-on-green switcher-off-red"` with `nzCheckedChildren="ON"` and `nzUnCheckedChildren="OFF"` |
| Date display | Use `DatePipe` with the product format, normally `dd/MM/yyyy` |
| Audience-specific actions | Render only actions allowed in that shell; omit their modules, signals, and handlers together |
| Modal template | Always defined as `<ng-template #formModal>` at the bottom of the file |
| Edit button | `nzType="primary"` + `class="mr-1.25"` + `nzSize="small"` |
| Delete button | `class="nz-btn-red"` + `nzSize="small"` |

---

## PART 3 — FORM COMPONENT

### 3.1 — Form Component TypeScript (`form-*.component.ts`)

#### 3.1.1 — Standard Imports (always required)
```typescript
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SystemConstant } from '@constants/system.constant';
import { MakeForm } from '@models/common/make-form.model';
import { ModalData } from '@models/common/modal-data.model';
import { I<ModelName>, I<ModelName>DTO } from '@models/danh-muc/<model-file>.model';
import { FormValidatorService } from '@services/common/form-validator.service';
import { <ModelName>Service } from '@services/danh-muc/<service-file>.service';
import { FieldErrorDisplayComponent } from '@widget/field-error-display/field-error-display.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ToastrService } from 'ngx-toastr';
import { catchError, EMPTY, exhaustMap, filter, Subject, tap } from 'rxjs';
```

**Additional imports when using `nz-select`:**
```typescript
import { AsyncPipe } from '@angular/common';
import { NzSelectModule } from 'ng-zorro-antd/select';
```

Import the concrete related-entity response type when an object-valued select requires a typed comparator.

**Additional imports for conditional form controls:**
```typescript
import { UploadFileComponent } from '@component-shared/upload-file/upload-file.component';
import { IFileInfo } from '@models/common/file.model';
import { FileService } from '@services/common/file.service';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTableModule } from 'ng-zorro-antd/table';
```

**Additional imports for a server-searched lookup or signal-backed repeated rows:**
```typescript
import { signal } from '@angular/core';
import { debounceTime, distinctUntilChanged, forkJoin, of, switchMap } from 'rxjs';
```

**Additional imports for shared management/user role validation:**
```typescript
import { Router } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
```

Import only the controls and operators the component actually uses, consolidating imports from the same package. File fields must import `UploadFileComponent` and inject `FileService`; they do not import `NzUploadModule` directly. Import `IFileInfo` only when the form value uses file-info objects rather than IDs.

#### 3.1.2 — Component Decorator
```typescript
@Component({
  selector: 'app-form-<feature-kebab>',
  imports: [
    ReactiveFormsModule,
    NzInputModule,
    NzGridModule,
    NzButtonModule,
    FieldErrorDisplayComponent,
    // Add only when used: NzSelectModule, AsyncPipe, NzDatePickerModule,
    // NzCheckboxModule, NzAutocompleteModule, NzTableModule, UploadFileComponent
  ],
  templateUrl: './form-<feature>.component.html',
  styleUrl: './form-<feature>.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

Omit `styleUrl` when the component has no CSS file, as described in §1.3.

#### 3.1.3 — Class Body (complete template)
```typescript
export class Form<ModelName>Component implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly <serviceVar> = inject(<ModelName>Service);
  protected readonly formValidSvc = inject(FormValidatorService);
  private readonly alert = inject(ToastrService);
  // Inject additional lookup services if needed for select dropdowns

  // --- Inputs and Outputs ---
  readonly modalData = input.required<ModalData<I<ModelName>>>();
  // Optional: include only when the create API requires client-supplied order
  readonly thuTu = input<number>(1);
  readonly closeModal = output<boolean>();

  // --- Typed form ---
  form!: FormGroup<MakeForm<I<ModelName>DTO>>;

  // --- Lookup data sources (for select dropdowns) ---
  readonly listAll<RelatedModel>Fn = this.<relatedSvc>.getAll();

  // --- Optional typed comparator (only for object-value selects) ---
  readonly compareRelatedFn = (first: IRelatedEntity | null, second: IRelatedEntity | null): boolean =>
    first && second ? first.id === second.id : first === second;

  // --- RxJS submission stream ---
  private readonly submit$ = new Subject<void>();

  constructor() {
    this.setupSubmitStream();
  }

  ngOnInit(): void {
    this.createForm();
  }

  createForm(): void {
    this.form = this.fb.group({
      // Define all DTO fields with validators
      <fieldName>: ['', [Validators.required]],
      <numericField>: [0, [Validators.required, Validators.min(0)]],
    });
    const modalData = this.modalData();
    if (modalData.action === SystemConstant.ACTION.EDIT) {
      this.form.patchValue({
        <fieldName>: modalData?.data?.<fieldName> ?? '',
        <numericField>: modalData?.data?.<numericField> ?? 0,
      });
    }
  }

  private setupSubmitStream(): void {
    this.submit$.pipe(
      filter(() => {
        if (this.form.invalid) {
          this.formValidSvc.validateAllFormFields(this.form);
          return false;
        }
        return true;
      }),
      exhaustMap(() => {
        const modalData = this.modalData();
        const apiCall = (modalData.action === SystemConstant.ACTION.EDIT && modalData.data?.id)
          ? this.<serviceVar>.update(this.form.getRawValue(), modalData.data.id)
          : this.<serviceVar>.create(this.form.getRawValue());

        return apiCall.pipe(
          tap(() => {
            this.closeModal.emit(true);
            this.alert.success(
              modalData.action === SystemConstant.ACTION.EDIT
                ? 'Cập nhật thành công!'
                : 'Thêm mới thành công!'
            );
          }),
          catchError(() => EMPTY)
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  onCancel(): void {
    this.closeModal.emit(false);
  }

  onSubmit(): void {
    this.submit$.next();
  }
}
```

#### 3.1.4 — Validator Service Access

- Inject `FormValidatorService` as `protected readonly formValidSvc` because the template calls it.
- Call `formValidSvc.isFieldRequired(...)`, `formValidSvc.displayFieldCssZorro(...)`, and `formValidSvc.isFieldValid(...)` directly in the template.
- Do not detach instance methods into component fields such as `isFieldValid = this.formValidSvc.isFieldValid`. Detached methods can lose the service `this` context; `displayFieldCssZorro()` itself calls another service method.
- Use the same `formValidSvc` instance in the submit guard to call `validateAllFormFields(...)`.

#### 3.1.5 — DTO and Response Relationship Mapping

When a create/update DTO sends a relationship ID but the read response embeds the related object, model the two shapes explicitly:

```typescript
export interface IEntityDTO {
  relatedEntity: string;
  name: string;
}

export interface IEntity extends Omit<IEntityDTO, 'relatedEntity'> {
  id: string;
  status: boolean;
  relatedEntity: IRelatedEntity;
}
```

Keep the form typed to the DTO, bind the select to the ID, and map the response object back to its ID in edit mode:

```typescript
form!: FormGroup<MakeForm<IEntityDTO>>;

this.form = this.fb.group({
  relatedEntity: ['', [Validators.required]],
  name: ['', [Validators.required]],
});

if (modalData.action === SystemConstant.ACTION.EDIT) {
  this.form.patchValue({
    relatedEntity: modalData.data?.relatedEntity?.id ?? '',
    name: modalData.data?.name ?? '',
  });
}
```

Do not type the form to the read-response interface when the API expects relationship IDs on create/update.

#### 3.1.6 — Lookup Values and Edit-Mode Option Hydration

A relationship control does not always submit an entity ID. Follow the DTO exactly:

| DTO field type/meaning | Select or autocomplete value |
|---|---|
| Entity ID | `item.id` |
| Email/business key | `item.email` or the declared key |
| Code | `item.code` |
| Embedded object | `item` plus a typed `compareWith` function |

For a large server-searched lookup, set up the search stream before creating the form. In edit mode, emit a stable search term after patching so Ng-Zorro can resolve and display the selected option. The control may hold either the scalar DTO key or the full typed object:

```typescript
readonly searchRelated$ = new Subject<string>();
readonly relatedOptions = signal<IRelatedEntity[]>([]);

ngOnInit(): void {
  this.setupRelatedSearch();
  this.createForm();
}

private setupRelatedSearch(): void {
  this.searchRelated$.pipe(
    debounceTime(350),
    distinctUntilChanged(),
    switchMap(search => search
      ? this.relatedService.getAll({ search }).pipe(catchError(() => of([])))
      : of([])),
    takeUntilDestroyed(this.destroyRef),
  ).subscribe(options => this.relatedOptions.set(options));
}

// Inside the EDIT branch after patchValue(...).
// For an object-valued control, patch modalData.data.relatedEntity itself.
this.searchRelated$.next(modalData.data?.relatedEntity?.businessKey ?? '');

onSearchRelated(event: Event): void {
  this.searchRelated$.next((event.target as HTMLInputElement).value);
}
```

Use `nzServerSearch` with `(nzOnSearch)="searchRelated$.next($event)"` when the user must choose a known entity. For an object-valued control, keep the hydrated response object in the form and use a typed stable-key comparator; do not convert it to an ID merely to simplify the select. Use `nz-autocomplete` instead when the field remains free text but should offer remote suggestions.

When one server-searched option signal is shared by a primary relationship and repeated child rows, hydrate every selected edit value and merge results instead of replacing the option list. Deduplicate lookup requests by a stable business key, recover individual failures to `null`, and merge successful results by entity ID:

```typescript
private hydrateSelectedOptions(selected: IRelatedEntity[]): void {
  const unique = [...new Map(
    selected.filter(item => item?.email).map(item => [item.email, item]),
  ).values()];
  if (!unique.length) {
    return;
  }

  forkJoin(
    unique.map(item =>
      this.relatedService.getByEmail(item.email).pipe(catchError(() => of(null)))),
  ).pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(options => this.relatedOptions.update(current => [
      ...new Map(
        [...current, ...options.filter((item): item is IRelatedOption => item !== null)]
          .map(item => [item.related.id, item]),
      ).values(),
    ]));
}
```

#### 3.1.7 — UI-Nullable Required Controls and Runtime Normalization

- Date-picker form values are `Date` objects. If the backend response contains an ISO string at runtime, patch with `new Date(responseValue)`.
- Keep the main form typed directly to the existing DTO/interface. Do not create component-only `*FormValue` interfaces merely to make required dates, object relationships, or file-info controls nullable during initial rendering.
- Inject `NonNullableFormBuilder` and initialize an empty required non-null control with `null as unknown as T`. The required validator and the guarded submission stream must prevent that sentinel value from reaching the API:

```typescript
private readonly fb = inject(NonNullableFormBuilder);

form!: FormGroup<MakeForm<IEntityDTO>>;

this.form = this.fb.group({
  name: ['', [Validators.required]],
  eventDate: [null as unknown as Date, [Validators.required]],
  relatedEntity: [null as unknown as IRelatedEntity, [Validators.required]],
  attachment: [null as unknown as IFileInfo, [Validators.required]],
});
```

Use the same direct-interface pattern for nested and repeated child groups:

```typescript
childForm!: FormGroup<MakeForm<IChildDTO>>;

childForm = this.fb.group({
  relatedEntity: [null as unknown as IRelatedEntity, [Validators.required]],
  coefficient: [0, [Validators.required, Validators.min(0)]],
});
```

The cast is an initialization convention only. Never use it to bypass a missing validator, skip child-group validation, or assemble a DTO outside the guarded `filter(() => this.validateBeforeSubmit())` path.

#### 3.1.8 — Conditional Validators and Enabled State

When one control determines whether another field applies, update validators and enabled state together. Clear a disabled value if `getRawValue()` must not submit stale data, because `getRawValue()` includes disabled controls.

```typescript
onToggleRelatedField(enabled: boolean): void {
  const control = this.form.controls.relatedCode;
  if (enabled) {
    control.setValidators([Validators.required]);
    control.enable({ emitEvent: false });
  } else {
    control.reset('', { emitEvent: false });
    control.clearValidators();
    control.disable({ emitEvent: false });
  }
  control.updateValueAndValidity({ emitEvent: false });
}
```

Call the same method after edit-mode patching so validators, disabled state, and the required marker agree with the patched toggle.

#### 3.1.9 — Optional Nested Object Subform

Use a second typed group when an object-valued DTO field has a visually distinct subsection but `MakeForm<T>` represents the parent property as one `FormControl<T>`:

```typescript
form!: FormGroup<MakeForm<IEntityDTO>>;
nestedForm!: FormGroup<MakeForm<INestedDTO>>;

// Before the validity guard and DTO extraction
this.form.controls.nested.setValue(this.nestedForm.getRawValue());

if (this.form.invalid || this.nestedForm.invalid) {
  this.formValidSvc.validateAllFormFields(this.form);
  this.formValidSvc.validateAllFormFields(this.nestedForm);
  return false;
}
```

Patch both groups in edit mode. Keep this as a conditional pattern; do not split a flat DTO into multiple groups without a real nested object.

#### 3.1.10 — Optional Dynamic Repeated Child Rows

For a DTO array edited as an inline table, a signal of typed child groups is an accepted project pattern:

```typescript
readonly childForms = signal<FormGroup<MakeForm<IChildDTO>>[]>([]);

private createChildForm(item?: Partial<IChildDTO>): FormGroup<MakeForm<IChildDTO>> {
  return this.fb.group({
    name: [item?.name ?? '', [Validators.required]],
    email: [item?.email ?? '', [Validators.required, Validators.email]],
  });
}

addChild(): void {
  this.childForms.update(forms => [...forms, this.createChildForm()]);
}

removeChild(index: number): void {
  this.childForms.update(forms => forms.filter((_, current) => current !== index));
}
```

In edit mode, map response children through `createChildForm`. Before submission, validate every child group and map each with `getRawValue()` into the DTO:

```typescript
const childInvalid = this.childForms().some(childForm => childForm.invalid);
if (this.form.invalid || childInvalid) {
  this.formValidSvc.validateAllFormFields(this.form);
  this.childForms().forEach(childForm => this.formValidSvc.validateAllFormFields(childForm));
  return false;
}

const submitData: IEntityDTO = {
  ...this.form.getRawValue(),
  children: this.childForms().map(childForm => childForm.getRawValue()),
};
```

Render with `@for (childForm of childForms(); track childForm; let i = $index)` and bind `[formGroup]="childForm"` on the row. This is optional for complex forms; use ordinary controls for non-repeated data.

When the DTO keeps a primary participant separately from a repeated member list, synchronize both child structures into the parent controls before the final validity decision. Put collection-wide invariants in `validateBeforeSubmit()` and expose one signal-backed error message near the participant section. Common invariants include:

- a lecturer or participant must not appear more than once in the repeated collection; compare stable IDs first and use a normalized business key such as `email.trim().toLowerCase()` only as a fallback;
- the primary participant must not also appear in the member list; compare stable IDs and use a business key such as email only as a fallback;
- when lecturer/member rows expose the boolean field `chuNhiem`, exactly one submitted lecturer must have `chuNhiem === true`; count the primary lecturer together with repeated members when the DTO stores the primary lecturer separately;
- the sum of numeric allocation fields across the primary participant and all members must equal the domain total;
- use a small tolerance such as `1e-9` for decimal totals rather than strict floating-point equality;
- validate every child group even when a collection-wide rule has already failed.

When a newly generated feature uses a repeated `IGiangVienThamGia[]` field, the following are mandatory project rules unless the feature contract explicitly states stricter rules:

- require at least one lecturer;
- reject duplicate lecturers, comparing stable IDs first and normalized email as the fallback;
- require exactly one submitted lecturer with `chuNhiem === true`;
- require the total `heSo` to equal `1`, using a tolerance such as `1e-9`;
- in self-service scope, require the authenticated lecturer to appear in the submitted collection; management exemption requires both the administrator role and the `/mng/` route;
- if authenticated identity is unavailable in self-service scope, show an explicit collection-level error and block submission.

Synchronize the repeated child forms into the parent DTO control before applying these rules. Validate and mark every child form touched even when a collection-wide rule fails.

```typescript
const primary = primaryForm.getRawValue();
const members = memberForms().map(form => form.getRawValue());

const primaryInMembers = members.some(member =>
  (primary.related.id && member.related.id === primary.related.id) ||
  (primary.related.email && member.related.email === primary.related.email));

const totalAllocation = primary.allocation +
  members.reduce((total, member) => total + member.allocation, 0);
const primaryCount = [primary, ...members].filter(participant => participant.chuNhiem).length;

if (primaryInMembers) {
  collectionErrorMsg.set('Primary participant cannot also be a member.');
} else if (primaryCount !== 1) {
  collectionErrorMsg.set('Exactly one lecturer must be the primary participant.');
} else if (Math.abs(totalAllocation - 1) > 1e-9) {
  collectionErrorMsg.set('Total allocation must equal 1.');
}

this.form.controls.primary.setValue(primary);
this.form.controls.members.setValue(members);
```

#### 3.1.11 — Shared Management/User Form Scope

Reuse one form component from management and self-service lists when both callers submit the same DTO and use the same core workflow. For this project, determine management permission from the authenticated role together with the management route:

```typescript
private readonly authSvc = inject(AuthService);
private readonly router = inject(Router);

private readonly isAdmin = this.authSvc.checkRole(SystemConstant.MNG_ROLE.ADMIN);
private readonly isOnMngRoute = this.router.url.includes('/mng/');
```

Do not add a `management | selfService` form-context input when role and route are already authoritative for this distinction.

When a shared form has **no repeated member/participant list** and its editor, owner, reporter, or equivalent single-owner control is typed as `IGiangVien`, the self-service caller must not choose that field:

- After `createForm()` has patched edit data, load the currently authenticated lecturer with `ThongTinCaNhanGvService.getCurrent()`.
- Immediately disable the `IGiangVien` control in self-service scope, then set it to `currentLecturer.giangVien` when the request completes. Apply this in both ADD and EDIT modes so a self-service edit cannot retain or select another lecturer.
- Keep the same `nz-select` visible and disabled. Put the current lecturer in the option signal so the selected label renders as the lecturer name/email; management scope keeps the normal searchable selector.
- Because the disabled owner control is intentionally submitted, assemble the DTO with `form.getRawValue()`, not `form.value`.
- If the current lecturer cannot be resolved, leave the required control invalid, show an explicit identity error, and block submission.
- Do not apply this single-owner auto-selection rule when identity is represented by a repeated member/author collection; use the collection membership rule below instead.

```typescript
private setCurrentOwner(): void {
  if (this.isAdmin && this.isOnMngRoute) {
    return;
  }

  this.form.controls.<ownerField>.disable();
  this.thongTinCaNhanGvSvc.getCurrent().pipe(
    takeUntilDestroyed(this.destroyRef),
  ).subscribe({
    next: currentLecturer => {
      this.lecturerOptions.set([currentLecturer]);
      this.form.controls.<ownerField>.setValue(currentLecturer.giangVien);
    },
  });
}
```

The control and its select value must remain typed as `IGiangVien`; do not replace the value with an email merely to simplify self-service initialization.

Keep the identity rule inside `validateBeforeSubmit()` even when the control is auto-selected and disabled:

```typescript
if (!this.isAdmin || !this.isOnMngRoute) {
  const currentUserEmail = this.authSvc.getAuthData()?.email;
  const reporterEmail = this.form.controls.reporter.value?.email;
  if (!currentUserEmail) {
    this.reporterErrorMsg.set('Không xác định được giảng viên đang kê khai');
  } else if (reporterEmail !== currentUserEmail) {
    this.reporterErrorMsg.set('Người báo cáo phải là giảng viên đang kê khai');
  }
}
```

For repeated authors, the authenticated lecturer may instead be required to appear in the author collection:

```typescript
if ((!this.isAdmin || !this.isOnMngRoute) && currentUserEmail &&
  !currentAuthorForms.some(form => form.controls.email.value === currentUserEmail)) {
  this.authorErrorMsg.set('Giảng viên kê khai cần có tên trong danh sách tác giả');
}
```

- A role alone is insufficient: an administrator using a self-service route still follows self-service validation.
- A management URL alone is insufficient: the caller must also have the administrator role.
- If authenticated identity is unavailable, set an explicit validation message and block submission.
- The backend remains responsible for authorization and ownership checks; these component checks only enforce the form workflow.

### 3.2 — RxJS Submission Stream Rules

- **Always** use a `private readonly submit$ = new Subject<void>()` to manage form submission.
- **Always** set up the stream via `this.setupSubmitStream()` in the **constructor** (not `ngOnInit`). This ensures the stream is initialized before any Angular lifecycle hook runs.
- **Always** pipe through `filter()` first to guard against invalid form submissions — call `this.formValidSvc.validateAllFormFields(this.form)` when invalid.
- **Always** use `exhaustMap()` — this prevents duplicate submissions if the user clicks Save multiple times.
- **Always** terminate with `takeUntilDestroyed(this.destroyRef)` to prevent memory leaks.
- **Always** handle errors with `catchError(() => EMPTY)` inside `exhaustMap` to prevent stream termination on API errors.
- For complex forms, `filter(() => this.validateBeforeSubmit())` may replace the inline guard. That method must validate the main group, every nested/repeated group, and any cross-row invariant, and it must mark invalid controls touched before returning `false`.
- **On success:** emit `this.closeModal.emit(true)` first, then show toast with `this.alert.success(...)`.
- **On cancel:** call `this.closeModal.emit(false)`.
- **`onSubmit()`** only calls `this.submit$.next()` — it never directly interacts with the form or API.

### 3.3 — Form Component HTML Template

#### 3.3.1 — Complete Form Template Structure
```html
<form [formGroup]="form" (keydown.enter)="$event.preventDefault()">
  <div nz-row [nzGutter]="8">
    <!-- Omit nzSm="12" for a single-column form. Use nzMd="12" for a wider breakpoint. -->
    <div nz-col class="pb-2" nzSpan="24" nzSm="12">
      <label class="font-medium"><Field Label></label>
      @if (formValidSvc.isFieldRequired(form, '<fieldName>')) {
        <label class="field-required"><sup><i class="fa-solid fa-star-of-life"></i></sup></label>
      }
      <!-- Input element here -->
      <app-field-error-display [displayError]="formValidSvc.isFieldValid(form, '<fieldName>', 'required')"
        errorMsg="Không được để trống" />
      <!-- Add more <app-field-error-display> for additional validators (min, max, email, etc.) -->
    </div>
  </div>

  <!-- Modal footer — always at the bottom -->
  <div nz-row class="ant-modal-footer fk-modal-footer">
    <div nz-col nzSpan="24" class="ali-right">
      <div class="pl-2.5 footer-btn">
        <button nz-button nzType="default" nzSize="default" type="button" class="nz-btn-red"
          (click)="onCancel()"><i class="fa-solid fa-times mr-1.25"></i>Hủy</button>
      </div>
      <div class="pl-2.5 footer-btn">
        <button nz-button nzType="primary" nzSize="default" type="button" (click)="onSubmit()"><i
            class="fa-solid fa-save mr-1.25"></i>Lưu</button>
      </div>
    </div>
  </div>

</form>
```

Use one outer `nz-row` for the form body and make each field a responsive `nz-col`. A compact form keeps every field at `nzSpan="24"`; a wider modal may use `nzSm="12"` or `nzMd="12"` for two columns. Do not wrap every field in a separate `nz-row`, and do not add redundant `nz-col` elements inside another column.

Prevent the default Enter action inline on the root form. This intentionally applies to every current and future descendant control, including `textarea`; do not add tag-specific exceptions or a component helper method.

#### 3.3.2 — Field Input Type Snippets

**Text input:**
```html
<input nz-input formControlName="<fieldName>"
  [nzStatus]="formValidSvc.displayFieldCssZorro(form, '<fieldName>')">
```

**Number input:**
```html
<input nz-input type="number" formControlName="<fieldName>"
  [nzStatus]="formValidSvc.displayFieldCssZorro(form, '<fieldName>')">
```

**Select (ID-value binding):**
```html
<nz-select class="w-full" formControlName="<fieldName>" nzShowSearch
  [nzAllowClear]="false" [nzDropdownMatchSelectWidth]="false"
  [nzStatus]="formValidSvc.displayFieldCssZorro(form, '<fieldName>')">
  @for (item of (listAll<Model>Fn | async); track item.id) {
  <nz-option [nzLabel]="item.<labelField>" [nzValue]="item.id"></nz-option>
  }
</nz-select>
```

**Select (Object-value binding — requires a typed comparator):**
```html
<nz-select class="w-full" formControlName="<fieldName>" nzShowSearch
  [nzAllowClear]="false" [nzDropdownMatchSelectWidth]="false"
  [compareWith]="compareRelatedFn"
  [nzStatus]="formValidSvc.displayFieldCssZorro(form, '<fieldName>')">
  @for (item of (listAll<Model>Fn | async); track item.id) {
  <nz-option [nzLabel]="item.<labelField>" [nzValue]="item"></nz-option>
  }
</nz-select>
```

**Server-searched select (known entity, scalar DTO key):**

```html
<nz-select class="w-full" formControlName="<fieldName>" nzShowSearch nzServerSearch
  [nzAllowClear]="false" [nzDropdownMatchSelectWidth]="false"
  (nzOnSearch)="searchRelated$.next($event)"
  nzPlaceHolder="Search <related entity>"
  [nzStatus]="formValidSvc.displayFieldCssZorro(form, '<fieldName>')">
  @for (item of relatedOptions(); track item.id) {
    <nz-option [nzLabel]="item.displayName" [nzValue]="item.businessKey" />
  }
</nz-select>
```

**Server-searched select (known entity, object-valued DTO field):**

```html
<nz-select class="w-full" formControlName="<fieldName>" nzShowSearch nzServerSearch
  [nzAllowClear]="false" [nzDropdownMatchSelectWidth]="false"
  [compareWith]="compareRelatedFn"
  (nzOnSearch)="searchRelated$.next($event)"
  nzPlaceHolder="Search <related entity>"
  [nzStatus]="formValidSvc.displayFieldCssZorro(form, '<fieldName>')">
  @for (item of relatedOptions(); track item.id) {
    <nz-option [nzLabel]="item.displayName" [nzValue]="item" />
  }
</nz-select>
```

**Date picker:**

```html
<nz-date-picker class="w-full" nzFormat="dd/MM/yyyy"
  formControlName="<fieldName>" [nzAllowClear]="false"
  [nzStatus]="formValidSvc.displayFieldCssZorro(form, '<fieldName>')" />
```

**Checkbox:**

```html
<div nz-col class="pb-2 flex items-center" nzSpan="24" nzMd="12">
  <div nz-row>
    <div nz-col nzSpan="0" nzMd="24">&nbsp;</div>
    <div nz-col nzSpan="24">
      <label nz-checkbox formControlName="<fieldName>"><Field Label></label>
    </div>
  </div>
</div>
```

Use this responsive wrapper for checkbox fields in a two-column form. The zero-width/mobile and full-width/medium spacer aligns the checkbox with controls that have a label row above them; `flex items-center` keeps the checkbox vertically centered in its form column. This wrapper does not apply to an `nz-checkbox` inside a table cell; render the checkbox label directly in the `<td>` instead.

**Textarea:**

```html
<textarea nz-input formControlName="<fieldName>"
  [nzAutosize]="{ minRows: 2, maxRows: 6 }"
  [nzStatus]="formValidSvc.displayFieldCssZorro(form, '<fieldName>')"></textarea>
```

**Remote autocomplete (free-text value with suggestions):**

```html
<input nz-input formControlName="<fieldName>"
  [nzAutocomplete]="relatedAuto" (input)="onSearchRelated($event)"
  [nzStatus]="formValidSvc.displayFieldCssZorro(form, '<fieldName>')" />
<nz-autocomplete #relatedAuto nzOverlayClassName="min-w-min">
  @for (item of relatedOptions(); track item.id) {
    <nz-auto-option [nzValue]="item.businessKey">
      {{ item.businessKey }} ({{ item.displayName }})
    </nz-auto-option>
  }
</nz-autocomplete>
```

Use `nzVariant="underlined"` conditionally for compact controls embedded inside an editable table. Keep the normal variant for ordinary form fields.

#### 3.3.3 — Shared File Upload Blueprint

File fields use `UploadFileComponent` plus `FileService` adapters. Set `returnType` from the DTO control type:

```typescript
protected readonly fileSvc = inject(FileService);
```

| Form control value | `returnType` | Multiple | FileService output adapter |
|---|---|---|---|
| `string` file ID | `id` | No | `setIdFileToForm(...)` |
| `string[]` file IDs | `id` | Yes | `setListIdFileToForm(...)` |
| `IFileInfo` | `fileInfo` | No | `setFileInfoToForm(...)` |
| `IFileInfo[]` | `fileInfo` | Yes | `setListFileInfoToForm(...)` |

**Single `IFileInfo` example:**

```html
<app-upload-file class="w-full" returnType="fileInfo"
  subFolderOnServer="<entity-kebab>" [isUploadMultiFile]="false"
  [listFilesPatch]="fileSvc.extractFileFromListFileInfo(
    [form.get('<fieldName>')?.value ?? undefined].flat()
  )"
  (returnedListId)="fileSvc.setFileInfoToForm($any($event), '<fieldName>', form)" />
```

For ID-valued controls, use `extractFileFromListId(...)`. For multiple files, set `[isUploadMultiFile]="true"` and use the matching list adapter. The shared output is a union, so `$any($event)` is confined to this template boundary; keep the form control and DTO strongly typed everywhere else. Set `subFolderOnServer` to the feature's stable kebab-case folder. Apply `isDisableUpload`, `isDisableView`, `isDisableDelete`, `isDownloadable`, or `deleteNoConfirm` only when workflow state requires them.

#### 3.3.4 — Validation Error Snippets

**Error display — `required`:**
```html
<app-field-error-display [displayError]="formValidSvc.isFieldValid(form, '<fieldName>', 'required')"
  errorMsg="Không được để trống" />
```

**Error display — `min` value:**
```html
<app-field-error-display [displayError]="formValidSvc.isFieldValid(form, '<fieldName>', 'min')"
  errorMsg="Dữ liệu không hợp lệ" />
```

**Error display — multiple validators:**
```html
<app-field-error-display [displayError]="formValidSvc.isFieldValid(form, '<fieldName>', 'required')"
  errorMsg="Không được để trống" />
<app-field-error-display [displayError]="formValidSvc.isFieldValid(form, '<fieldName>', 'min')"
  errorMsg="Dữ liệu không hợp lệ" />
```

**Conditional aggregate or business-rule error:**

Use a signal when a validation rule depends on multiple controls, the current caller, or another business condition and therefore does not belong to one control validator. Clear and recompute the signal in the submission guard. Do not use this pattern instead of ordinary `FormControl` validators.

```typescript
readonly formRuleErrorMsg = signal('');

private validateBusinessRules(): boolean {
  const isInvalid = this.form.controls.relatedEntity.value === null;
  this.formRuleErrorMsg.set(isInvalid ? 'The selected relationship is invalid.' : '');
  return !isInvalid;
}
```

Call `validateBusinessRules()` from the `filter()` submission guard after marking invalid controls, then render the result with the shared widget:

```html
<app-field-error-display
  [displayError]="!!formRuleErrorMsg()"
  [errorMsg]="formRuleErrorMsg()" />
```

Keep the actual predicate and message feature-specific. A collection-wide rule may use the same signal pattern next to the repeated-field section it validates.

### 3.4 — Form HTML Rules Summary

| Rule | Detail |
|---|---|
| Root element | `<form [formGroup]="form" (keydown.enter)="$event.preventDefault()">`; prevent the default Enter action for every descendant control |
| Body grid | One outer `nz-row`; use `[nzGutter]="8"` or `16` when fields share rows |
| Field wrapper | `<div nz-col class="pb-2" nzSpan="24">`; add `nzSm="12"` or `nzMd="12"` only for a two-column layout |
| Field label | Use `<label class="font-medium">` for the field name |
| Required asterisk | `@if (formValidSvc.isFieldRequired(...))` wrapping a `<label class="field-required">` with star-of-life icon |
| Validation status | Always bind `[nzStatus]="formValidSvc.displayFieldCssZorro(form, '<fieldName>')"` |
| Error display | Always use `<app-field-error-display>` widget — never use raw HTML for errors |
| Aggregate/business error | Conditionally use a message signal plus `<app-field-error-display>` for rules not owned by one control |
| Date field | Use `nz-date-picker`, a `Date`/`Date \| null` form value, and `nzFormat="dd/MM/yyyy"` |
| Boolean field | Unless the domain requires a select, use `<label nz-checkbox formControlName="...">` inside the standard responsive checkbox wrapper: outer `nz-col` with `class="pb-2 flex items-center" nzSpan="24" nzMd="12"`, then a nested row with an `nzSpan="0" nzMd="24"` spacer and an `nzSpan="24"` checkbox column. Exception: inside a table cell, render the `nz-checkbox` label directly without this wrapper |
| File field | Use `UploadFileComponent` plus the matching `FileService` adapter |
| Repeated children | Use typed child groups, validate every row, and assemble the DTO inside `exhaustMap` |
| Modal footer | Always use `class="ant-modal-footer fk-modal-footer"` on the footer row |
| Cancel button | `nzType="default"` + `class="nz-btn-red"` |
| Save button | `nzType="primary"` |
| Both buttons | `nzSize="default"` + `type="button"` |
| Icon in buttons | `<i class="fa-solid fa-times mr-1.25"></i>` (cancel) and `<i class="fa-solid fa-save mr-1.25"></i>` (save) |

---

## PART 4 — TAILWINDCSS 4 STYLING STANDARDS

### 4.1 — Spacing Scale (Custom Utility Classes)
The project uses a specific sizing scale. Apply these consistently:

| Class | Usage Context |
|---|---|
| `mr-1.25` | Margin-right for icons inside buttons, search bar margin |
| `pl-2.5` | Padding-left for footer button wrappers in forms |
| `pb-2` | Padding-bottom for each form field column |
| `mb-1` | Vertical separation for stacked checkboxes inside compact table cells |
| `ml-1` | Small separation before optional inline helper text |
| `max-w-50` | Max width for the search input in list headers |
| `w-full` | Full-width for select/input elements |
| `my-2` | Vertical margin for filter action button rows |

### 4.2 — Layout Conventions

| Element | TailwindCSS Classes |
|---|---|
| Page title text | `text-xl font-bold uppercase` |
| Right-aligned toolbar | `class="text-right"` on the nz-col |
| Select inside right-aligned toolbar | Add `text-left` to the select |
| Filter action button center | `class="text-center my-2"` |
| Form field label | `font-medium` |
| Remote autocomplete overlay | `min-w-min` when long suggestions must not be clipped to the input width |

Use only utilities generated by the TailwindCSS 4 theme. Replace the observed malformed legacy class `mr-5x1` with the valid project utility `mr-1.25`; do not reproduce `mr-5x1` in generated code. Use Tailwind's valid `font-extralight`, never the legacy spelling `font-extra-light`. Custom colors such as `text-red` are valid because the project declares `--color-red` in its Tailwind `@theme`.

### 4.3 — Custom CSS Classes (Non-Tailwind project globals)

| Class | Purpose |
|---|---|
| `nz-btn-green` | Green action button (Add / primary positive action) |
| `nz-btn-red` | Red action button (Delete / Cancel / negative action) |
| `table-border` | Adds borders to table cells |
| `table-cell-middle` | Vertically centers table cell content |
| `table-margin-bot` | Adds bottom margin to the table |
| `switcher-on-green` | Styles the ON state of nz-switch in green |
| `switcher-off-red` | Styles the OFF state of nz-switch in red |
| `field-required` | Styles the required field asterisk label |
| `ali-right` | Right-aligns content (used in modal footer) |
| `footer-btn` | Styles individual footer button wrappers (inline flex) |
| `ant-modal-footer` | Ng-Zorro standard modal footer class |
| `fk-modal-footer` | Project-specific modal footer override |

### 4.4 — nz-table `[nzScroll]` Width Guidelines

Set `nzScroll.x` to at least the sum of the declared `nzWidth` values so the table has a deterministic horizontal minimum width. For example, columns totaling `550px` use `[nzScroll]="{ x: '550px' }"`; columns totaling `850px` use `850px`. Use the table below only as a starting estimate before totaling the actual columns.

| Number of Columns | Recommended `x` scroll |
|---|---|
| 3–4 columns | `{x: '500px'}` |
| 5–6 columns | `{x: '550px'}` to `{x: '800px'}` |
| 7–8 columns | `{x: '850px'}` to `{x: '1000px'}` |
| 9+ columns | `{x: '1200px'}` or wider |

### 4.5 — Modal Width Guidelines

| Form Complexity | `nzWidth` |
|---|---|
| Unusually narrow (1–2 short fields) | `400` (optional) |
| Standard catalogue form (2–5 fields, including one select) | `500` (default) |
| Medium (6–7 fields or controls needing more horizontal room) | `600` |
| Complex single-column form (7+ fields or multiple wide relationship controls) | `700` |
| Substantial responsive two-column form without repeated child tables | `800` |
| Very complex (repeated editable tables, dense multi-section layout, or many relationship controls) | `900`–`1200` |

---

## PART 5 — NG-ZORRO COMPONENT CONVENTIONS

### 5.1 — `nz-input-search` (Search Bar in List)
```html
<nz-input-search class="w-full max-w-50 mr-1.25"
  (nzSearch)="manager.applySearch(true)"
  nzAllowClear
  [nzEnterButton]="true">
  <input type="text" nz-input placeholder="Tìm kiếm"
    [(ngModel)]="manager.searchValue"
    (keyup.enter)="manager.applySearch(true)" />
</nz-input-search>
```

### 5.2 — `nz-switch` (Status Toggle in Table)
```html
<nz-switch
  class="switcher-on-green switcher-off-red"
  [(ngModel)]="item.<statusField>"
  [nzLoading]="selectedSwitcherId() === item.id"
  [nzControl]="true"
  (click)="changeStatus(item.id)"
  nzCheckedChildren="ON"
  nzUnCheckedChildren="OFF">
</nz-switch>
```
- Always use `[nzControl]="true"` to make the switch controlled.
- Use `selectedSwitcherId()` signal to show loading on the correct row.
- The `[(ngModel)]` binding is two-way for display, but the actual state change is handled by the confirm dialog.

### 5.3 — `nz-select` (Dropdown in Forms)
```html
<nz-select class="w-full"
  formControlName="<fieldName>"
  nzShowSearch
  [nzAllowClear]="false"
  [nzDropdownMatchSelectWidth]="false"
  [nzStatus]="formValidSvc.displayFieldCssZorro(form, '<fieldName>')">
  @for (item of (listFn | async); track item.id) {
  <nz-option [nzLabel]="item.<label>" [nzValue]="item.<value>"></nz-option>
  }
</nz-select>
```
- Use `nzShowSearch` for relationship lookups and long option lists. It is optional for a tiny static boolean or enum list where searching adds no value.
- Always set `[nzDropdownMatchSelectWidth]="false"`.
- Always provide a meaningful `nzPlaceHolder` for filter selects. In forms, add an imperative choice hint when the label alone does not make the expected choice obvious.
- Use `[nzAllowClear]="false"` for required form controls; use `true` for optional/filter controls that users must be able to reset.
- Use `| async` with eager observable data sources from `service.getAll()`. Use a signal for debounced server-search results.
- Add `AsyncPipe` to the component's `imports` array when using `| async`.

### 5.4 — `nz-date-picker`

- Import `NzDatePickerModule` only when a date control is present.
- Form dates use `formControlName`, `[nzAllowClear]="false"` when required, the standard validation status binding, and the product display format (normally `dd/MM/yyyy`).
- Filter dates use `[(ngModel)]="manager.filter.<field>"` with `[nzAllowClear]="true"`.
- Convert serialized edit-response values to `Date` before patching; do not pass raw ISO strings to the control.

### 5.5 — `nz-checkbox`

Use the directive on a label inside the aligned responsive checkbox wrapper:

```html
<div nz-col class="pb-2 flex items-center" nzSpan="24" nzMd="12">
  <div nz-row>
    <div nz-col nzSpan="0" nzMd="24">&nbsp;</div>
    <div nz-col nzSpan="24">
      <label nz-checkbox formControlName="<fieldName>"><Field Label></label>
    </div>
  </div>
</div>
```

The spacer is hidden at small widths and occupies the label row at `nzMd`, aligning the checkbox with adjacent labeled controls. Keep `class="pb-2 flex items-center"` on the outer form column.

For an `nz-checkbox` inside a table, do not add the responsive `nz-col`/spacer wrapper. Render it directly in the table cell:

```html
<td nzAlign="center">
  <label nz-checkbox formControlName="<fieldName>"><Field Label></label>
</td>
```

Import `NzCheckboxModule`. For mutually exclusive flags represented as separate booleans, update the sibling controls with `setValue(..., { emitEvent: false })` in one typed handler and validate that at least one permitted flag is selected.

### 5.6 — `nz-autocomplete` Versus Server-Search Select

| Requirement | Control |
|---|---|
| User must choose a known option | `nz-select` with `nzServerSearch` and `(nzOnSearch)` |
| User may keep arbitrary text but benefits from suggestions | `input` with `nz-autocomplete` and `(input)` |

Both variants use a debounced `Subject<string>`, `distinctUntilChanged()`, `switchMap()`, lookup-level `catchError(() => of([]))`, a result signal, and `takeUntilDestroyed(this.destroyRef)`.

### 5.7 — Editable Child Tables Inside Forms

- Import `NzTableModule` only when repeated child rows are displayed as a table.
- Use `nzSize="small"`, `nzShowPagination="false"`, `table-border table-cell-middle`, and an `nzScroll.x` value covering all child columns.
- Render typed child groups with `@for` and put `[formGroup]` on each `<tr>`. When the body is rendered explicitly from a signal of form groups, `[nzData]="childForms().length ? [{}] : []"` is permitted as an Ng-Zorro table-presence adapter; it must not become a second source of row data.
- Use small add/remove buttons and `type="button"` so row actions cannot submit the parent form.

### 5.8 — `nzModalSvc.confirm()` (Confirmation Dialogs)

**Status change confirm:**
```typescript
this.nzModalSvc.confirm({
  nzWidth: 300,
  nzTitle: 'Xác nhận thay đổi trạng thái?',
  nzCancelText: 'Huỷ',
  nzOkDanger: true,
  nzOkText: 'Xác nhận',
  nzOnOk: () => { /* ... */ },
  nzOnCancel: () => { this.selectedSwitcherId.set(''); },
});
```

**Delete confirm:**
```typescript
this.nzModalSvc.confirm({
  nzWidth: 350,
  nzTitle: 'Xác nhận xoá?<br><span class="text-red">Lưu ý: Thao tác này không thể khôi phục.</span>',
  nzCancelText: 'Huỷ',
  nzOkDanger: true,
  nzOkText: 'Xác nhận',
  nzOnOk: () => { /* ... */ },
});
```

### 5.9 — `nzModalSvc.create()` (Opening Form Modal)
```typescript
this.nzModalSvc.create({
  nzStyle: { top: '20px' },
  nzWidth: <width>,            // See Modal Width Guidelines
  nzTitle: `${(data ? 'Chỉnh sửa' : 'Thêm mới')} ${this.breadcrumbObj.heading}`,
  nzContent: template,
  nzFooter: null,              // ALWAYS null — footer is inside the form template
  nzMaskClosable: false,       // ALWAYS false
});
```

---

## PART 6 — SHARED BUILDERS API REFERENCE

Both list builders own an `appliedQuery` signal. Internally they convert it with `toObservable(...)`, cancel stale list requests with `switchMap(...)`, expose the result through `toSignal(...)`, and derive `Paginate<T>` with `computed(...)`. Components must mutate list state only through the returned manager API; do not recreate this Signal/RxJS bridge in each component.

### 6.1 — `createListManagerNoFilter<T>(fetchDataFn)` API

**Signature:**
```typescript
createListManagerNoFilter<T>(
  fetchDataFn: (
    page: number,
    size: number,
    search?: string,
    sort?: string,
    column?: string,
  ) => Observable<IPagedResults<T>>
)
```

**Returns object with:**
| Property/Method | Type | Description |
|---|---|---|
| `searchValue` | `WritableSignal<string>` | Bind with `[(ngModel)]` in search input |
| `modalData` | `WritableSignal<ModalData<T>>` | Pass to form via `[modalData]` binding |
| `listData` | `Signal<Paginate<T>>` | Use in template as `manager.listData()` |
| `applySearch(isResetPage?)` | `Function` | Apply the current search; pass `true` for user-initiated criteria changes |
| `resetFilter()` | `Function` | Resets searchValue and reloads |
| `pageChange(page)` | `Function` | Pass to `(pageChange)` event |
| `triggerReload()` | `Function` | Call after CRUD operations to refresh list |

**CRITICAL:** The builder auto-fetches once from the initial applied query. Do not call `triggerReload()` in `ngOnInit()`; that creates a redundant request.

### 6.2 — `createListManagerFilter<T, FilterType>(fetchDataFn)` API

**Signature:**
```typescript
createListManagerFilter<T, FilterType>(
  fetchDataFn: (
    filter: Partial<FilterType>,
    page: number,
    size: number,
    sort?: string,
    column?: string,
  ) => Observable<IPagedResults<T>>
)
```

**Returns object with:**
| Property/Method | Type | Description |
|---|---|---|
| `filter` | `Partial<FilterType>` | Plain mutable object — bind with `[(ngModel)]` on filter fields |
| `modalData` | `WritableSignal<ModalData<T>>` | Pass to form via `[modalData]` binding |
| `listData` | `Signal<Paginate<T>>` | Use in template as `manager.listData()` |
| `applySearch(isResetPage?)` | `Function` | Call with `true` to reset to page 1 |
| `resetFilter()` | `Function` | Clears all filter fields and reloads |
| `pageChange(page)` | `Function` | Pass to `(pageChange)` event |
| `triggerReload()` | `Function` | Call after CRUD operations to refresh list |

**NOTE:** `manager.filter` is NOT a signal — bind filter fields directly as `[(ngModel)]="manager.filter.fieldName"`. It is mutable draft state. The builder snapshots it with `{ ...filter }` only when `applySearch(...)` runs. The initial empty-filter request comes from `appliedQuery`, not from template binding.

### 6.3 — `Paginate<T>` Model Shape
```typescript
{
  currentPage: number;   // Used in STT formula: (currentPage - 1) * limit + i + 1
  limit: number;         // Page size (default 10)
  totalPage: number;
  totalItem: number;     // Total matching the currently applied query
  data: T[];
}
```

### 6.4 — Component-to-Service Adapter Shapes

Keep the UI page one-based and convert to the backend's zero-based page exactly once in the manager callback.

| Service Contract | Manager Adapter |
|---|---|
| Scalar search: `filter(page, size, search?)` | `createListManagerNoFilter((page, size, search) => service.filter(page - 1, size, search))` |
| Structured filter: `filter(filter, page, size)` | `createListManagerFilter((filter, page, size) => service.filter(filter, page - 1, size))` |
| Current-user structured filter: `filterMine(filter, page, size)` | Prefer `createListManagerFilter((filter, page, size) => service.filterMine(filter, page - 1, size))` |
| Legacy identity-key filter: `filter(filter, page, size)` | After an auth guard/resolver establishes the key, call `service.filter({ ...filter, ownerKey: currentUserKey }, page - 1, size)`; spread enforced fields last |
| Lookup: `getAll(): Observable<IRelatedEntity[]>` | Store the observable once and consume it with `AsyncPipe`; do not manually subscribe merely to expose options |
| Constrained lookup: `getAll(filter: Partial<IRelatedFilter>)` | Pass the stable constraint once (for example a category constant), store the observable, and consume it with `AsyncPipe` |
| Remote lookup: `getAll({ search }): Observable<IRelatedEntity[]>` | Drive it from a debounced search subject, cancel stale requests with `switchMap`, recover to `of([])`, and store results in a signal |

Service implementations may send scalar filters as query parameters and structured filters as a request body. Components must follow the typed service signature and must not rebuild `HttpParams` or HTTP payloads themselves.

A builder callback must emit `IPagedResults<T>`. Do not substitute `EMPTY` for missing authenticated context. Prevent component activation until context exists, prefer a current-user endpoint, or return a real typed empty page from a shared adapter if the product explicitly requires an empty state.

The builders expose optional `sort` and `column` arguments. Forward them only when sorting is intentionally controlled by the builder/UI. Otherwise omit them in the adapter so the service can retain a domain-specific default ordering.

### 6.5 — Shared Model, Separate Resource Services

Reuse one DTO/response model when multiple catalogue resources have the same data shape, while injecting the service for the exact backend resource represented by the screen. Do not duplicate an identical interface solely because separate routes or audiences use separate endpoints.

Likewise, reuse a model, filter, service, and form across management and self-service lists when their API shapes match. Keep separate list components when their navigation shell, enforced scope, visible filters, or allowed row actions differ. Do not fork the form merely to change the parent list's breadcrumbs or action set.

### 6.6 — Conditional Client-Supplied Order

A `thuTu`-style order field is conditional, not universal:

- Display the persisted order value in the table when it is domain data; otherwise use the page-offset STT formula.
- Accept an order input in the form only when the create API requires the client to supply it.
- Do not blindly derive a new order from `manager.listData().totalItem + 1` when a filter is active, because `totalItem` is the filtered total. Use it only when the list total is authoritative for the full ordering, or obtain the next order from the backend.

### 6.7 — Lookup and Relationship Value Decision Table

| Read response shape | Create/update DTO shape | Form control value | Edit patch |
|---|---|---|---|
| Related object | ID string | `string` ID | `response.related?.id ?? ''` |
| Related object | Email/business key | Scalar key | `response.related?.businessKey ?? ''` |
| Related object | Related object | Typed object | The response object plus a typed `compareWith` |
| Eager option list | Any scalar above | Observable + `AsyncPipe` | Patch the matching scalar |
| Server-searched option list | Any scalar above | Result signal | Patch the scalar and search it once to hydrate the label |
| Server-searched option list | Related object | Result signal + typed object control | Patch the response object, search a stable term once, and use typed `compareWith` |

Prefer scalar-valued controls whenever the DTO is scalar. Object-valued selects are valid only when the DTO itself expects that object; their comparator must use a stable typed key and never `any`.

### 6.8 — Shared Constants and Label Maps

- Use shared constants for stable category constraints, enum option lists, role checks, and route segments; do not duplicate magic strings across list and form components.
- Convert a constant option list to a `Record<string, string>` once when table rows need code-to-label rendering.
- Role- or caller-dependent business validation belongs in a feature-specific `validateBeforeSubmit()` function. Shared management/user forms use the combined authenticated-role and `/mng/` route rule from §3.1.11 and do not require a separate caller-context input.
- For every UI field backed by `sanPhamKhoaHoc`, use the Vietnamese label `Loại Công trình / HĐ KHCN`. When its `nz-select` has a placeholder, use `nzPlaceHolder="Chọn loại"`. Keep the model, DTO, filter, and form-control identifier `sanPhamKhoaHoc` unchanged.

---

## PART 7 — SEQUENTIAL STEPS FOR COMPONENT GENERATION

### 7.1 — Steps to Build a List Component

1. **Determine requested action, builder type, and audience scope:** First classify the task as `refactor` or `create` for the table-column rule in §2.3.6. Scalar search → `createListManagerNoFilter`; structured filter DTO → `createListManagerFilter`, even when the controls fit in the header toolbar. Identify any immutable current-user or ownership constraints separately from editable filters.
2. **Create the `.ts` file:** Copy the appropriate class body template (§2.2.3 or §2.2.4). Replace all `<placeholder>` tokens with actual names.
3. **Configure `breadcrumbObj`:** Set `heading` to the Vietnamese feature name.
4. **Configure `openModal` width:** Choose appropriate `nzWidth` from §4.5 based on form complexity; repeated editable tables may require `900`–`1200`.
5. **Determine which actions to include for this audience:** Include `openModal` and `closeModal` for modal editing. When the response has `trangThai`, include the standard controlled switch, `changeStatus`, loading signal, and `NzSwitchModule` in both management and self-service lists. For other status fields, include `changeStatus` only when the shell permits it and the service supports that mutation. Include `deleteItem` only when deletion is allowed, and omit other unused action modules, state, and handlers.
6. **Create the `.html` file:** Use the appropriate HTML template (§2.3.1 or §2.3.2) and apply §2.3.6. A refactor preserves the existing column set/order but must add a missing `trangThai` column as the standard controlled switch when the response contains that field; a newly created list renders every user-facing business field while omitting technical identity fields such as `id` and supporting attachment/evidence fields such as `minhChung` unless explicitly requested. Keep omitted fields in the form/filter when their contracts still require them.
7. **Choose the filter layout and controls (filter variant):** Use a responsive `24/12/6` panel for several criteria, or the compact toolbar blueprint for a small lookup-plus-search filter. Map text, boolean, date, eager lookup, and server lookup controls from the filter DTO. Use `| async` with eager observable lookup data and set `nzPlaceHolder` on filter selects. In self-service lists, render every enforced identity/ownership field as a disabled type-appropriate control, but never bind it to editable `manager.filter` state.
8. **Apply criteria explicitly:** Call `manager.applySearch(true)` from search actions and immediate compact-filter changes so paging resets to page 1.
9. **Rely on the builder's initial request:** Do not add `OnInit` or `triggerReload()` solely for initial loading.
10. **Verify display adapters, shell integration, and imports:** Add `DatePipe` for date cells, derive shared constant label maps once, render the breadcrumb only when the containing shell uses it, and check that every used Ng-Zorro module and pipe is listed in `imports`.
11. **Handle local styling deliberately:** Use Tailwind/global classes by default. Create a CSS file and `styleUrl` only when the component needs local styles; otherwise follow the surrounding folder's no-style convention.

### 7.2 — Steps to Build a Form Component

1. **Analyze DTO, response, and caller contracts:** List scalar, boolean, date, file, object, nested-object, and repeated-array fields; identify where response objects map to DTO IDs or business keys. If management and user lists reuse the form, apply the combined role/route rule from §3.1.11. When there is no repeated member list and the single editor/owner field is `IGiangVien`, plan to hydrate it from the authenticated lecturer and disable it in self-service scope.
2. **Create the `.ts` file:** Copy the class body template (§3.1.3). Replace all `<placeholder>` tokens.
3. **Build `createForm()`:** Inject `NonNullableFormBuilder`, keep `FormGroup<MakeForm<IDTO>>`, and declare every DTO field directly. Initialize empty required dates, objects, and file-info controls with `null as unknown as T` plus `Validators.required`; do not create component-only form-value interfaces. Populate `patchValue()` for EDIT, normalizing dates and relationships.
4. **Expose validation:** Inject `protected readonly formValidSvc = inject(FormValidatorService)` and call its methods directly from the template; do not create detached method aliases. Add a message signal only for aggregate or business rules that do not belong to one control.
5. **Add lookup services (if needed):** Expose eager options as an observable. For a large lookup, build the debounced server-search stream, keep results in a signal, and hydrate the current scalar or object option in edit mode.
6. **Add a typed comparator (if needed):** Only when a select uses full objects as values. Type both comparator arguments to the related response type; never use `any`. Prefer ID-valued controls when the DTO expects an ID.
7. **Map relationship responses (if needed):** If the read response embeds an object but the DTO sends an ID, patch `modalData.data?.relatedEntity?.id` into the form control.
8. **Add an order input only if required by the API:** Declare `readonly thuTu = input<number>(1)` only when the client owns order assignment; do not use a filtered total as the next global order.
9. **Add conditional structures only when required:** Use the nested-subform, dynamic-child-row, conditional-validator, or shared-upload blueprints only when the DTO shape demands them. Assemble the final DTO inside the submission stream.
10. **Create the `.html` file:** Use one body `nz-row` and one `nz-col class="pb-2"` per field. Keep compact forms single-column; use `nzSm="12"` or `nzMd="12"` for responsive two-column layouts. Map each field to §3.3.2 or §3.3.3.
11. **Add error displays:** For `required`, use the standard `errorMsg="Không được để trống"`. For `min`, use `errorMsg="Dữ liệu không hợp lệ"`; add typed validator-specific messages such as `email` where relevant.
12. **Prevent Enter defaults globally:** Bind `(keydown.enter)="$event.preventDefault()"` on the root form. Do not create a helper method or exempt textareas or later-added controls.
13. **Ensure modal footer is last:** The `<div nz-row class="ant-modal-footer fk-modal-footer">` block must always be the last element inside `<form>`.
14. **Verify imports:** Add only the Ng-Zorro modules, pipes, shared widgets, and file services actually used.
15. **Handle local styling deliberately:** Create component CSS only when local styles are needed.

### 7.3 — Final Generation Checklist

- [ ] Component omits explicit `standalone`, uses local `imports`, `inject()`, `ChangeDetectionStrategy.OnPush`, and `readonly` for initialized references that are never reassigned; injected dependencies are `private readonly` unless the template requires `protected readonly` access.
- [ ] Template uses `@if`/`@for` and every `@for` has a stable `track` expression.
- [ ] Builder matches the service contract; UI page is converted to backend page exactly once.
- [ ] When current-user or ownership scope applies, every enforced field is shown as a disabled/read-only type-appropriate control, remains outside editable filter state, is applied after draft criteria, and is authorized again by the backend; the builder callback never uses `EMPTY` as a missing-context page.
- [ ] Initial list loading relies on the builder; new criteria call `applySearch(true)`.
- [ ] Filter controls match their DTO types; full panels are responsive, selects have clear placeholders, and compact toolbar selects use `text-left`.
- [ ] Table uses external pagination and `nzScroll.x` covers the declared column widths.
- [ ] Table columns follow the requested action: refactor preserves the existing set/order and adds a missing `trangThai` controlled switch when applicable, while create renders every user-facing business field and omits technical identity fields such as `id` plus supporting attachment/evidence fields such as `minhChung` unless explicitly requested.
- [ ] Status bindings use the response model's actual field; dates use `DatePipe` and enum/code labels come from shared constants where applicable.
- [ ] Breadcrumb rendering and row actions match the containing shell; their unused imports, signals, and handlers are omitted.
- [ ] Form uses `FormGroup<MakeForm<IEntityDTO>>` with `NonNullableFormBuilder`; required UI-empty objects, dates, and file-info controls use the guarded `null as unknown as T` initialization convention.
- [ ] Template calls `protected readonly formValidSvc` directly; submit uses `submit$`, `filter`, `exhaustMap`, inner `catchError`, and `takeUntilDestroyed`.
- [ ] Aggregate or business-rule messages use a signal and the shared error widget only when the rule cannot be represented by one control validator.
- [ ] Nested/repeated child groups and cross-row rules are validated before DTO assembly; conditional controls have synchronized validators, values, and disabled state.
- [ ] Every repeated `IGiangVienThamGia[]` field has at least one unique lecturer, exactly one `chuNhiem`, a total `heSo` of `1`, and self-service membership validation for the authenticated lecturer.
- [ ] Shared management/user forms combine `checkRole(ROLE_ADMIN)` with `router.url.includes('/mng/')`; self-service identity validation runs unless both checks pass.
- [ ] A self-service form without a repeated member list auto-selects and disables its single `IGiangVien` editor/owner control, hydrates the visible option from `getCurrent()`, submits it through `getRawValue()`, and still validates authenticated identity.
- [ ] File fields use `UploadFileComponent`, the correct `returnType`, and the matching `FileService` adapter.
- [ ] Every used Ng-Zorro control, `AsyncPipe`, and `DatePipe` is present in component imports; unused modules are omitted.
- [ ] The root form prevents the default Enter action inline for every descendant control; all action buttons remain `type="button"`.
- [ ] Tailwind utilities exist in TailwindCSS 4 or the project `@theme`; no malformed legacy class or invalid `font-extra-light` spelling was copied.
- [ ] Folders, files, classes, and interfaces are strictly named in English (kebab-case for folders/files, PascalCase for classes/interfaces).
- [ ] Modal close/reload, status loading reset, and success/error paths leave the UI in a consistent state.
- [ ] When adding or configuring navigation items, feature menus are isolated in `<feature-kebab>.menu.ts` typed with `ISiderMenu[]`, parent submenu icons use Ng-Zorro icon names, child/standalone items use FontAwesome classes, and the array is spread into the sidebar's `listMenu`.

---

## PART 8 — ABSOLUTE PROHIBITIONS

- **NEVER** use `NgModule`.
- **NEVER** use constructor parameter injection.
- **NEVER** use `@Input()` or `@Output()` decorators in a newly generated component; use `input()` and `output()`.
- **NEVER** name folders, files, component classes, service classes, or model interfaces in Vietnamese (e.g., avoid `danh-muc`, `bai-bao-khoa-hoc`, `list-bai-bao-khoa-hoc`, `IBaiBaoKhoaHoc`, `ListBaiBaoKhoaHocComponent`). Always use standard, clear English (e.g., `academic-ranks`, `scientific-papers`, `IScientificPaper`, `ListScientificPaperComponent`, `ScientificPaperService`). Vietnamese is reserved strictly for UI display text, headings, and alert notifications.
- **NEVER** use `*ngIf`, `*ngFor`, or `*ngSwitch` directives.
- **NEVER** omit `changeDetection: ChangeDetectionStrategy.OnPush`.
- **NEVER** call the API directly inside `onSubmit()` — always go through `submit$.next()`.
- **NEVER** call `this.form.valid` to check validity directly in `onSubmit()` — keep the validity guard in the RxJS `filter()` operator and call `formValidSvc.validateAllFormFields()` there.
- **NEVER** detach `FormValidatorService` instance methods into component fields — call them through `formValidSvc`.
- **NEVER** use `null as unknown as T` without a required validator and a guarded validation path that blocks the sentinel value from submission.
- **NEVER** create a component helper or tag-specific exception for Enter prevention; use `(keydown.enter)="$event.preventDefault()"` on the root form so it applies to textareas and all future controls.
- **NEVER** assume every relationship submits `item.id`; bind the ID, email, code, business key, or typed object required by the DTO.
- **NEVER** let a disabled conditional control retain stale data when `getRawValue()` would submit it.
- **NEVER** expose an enforced current-user or ownership constraint as editable `manager.filter` state, or spread editable criteria after the enforced fields.
- **NEVER** hide an enforced self-service filter DTO field from the filter panel; display each enforced identity, boolean, or enum value in a disabled/read-only control without making it editable.
- **NEVER** treat a client-injected identity filter as authorization; the backend must enforce the same ownership and mutation rules.
- **NEVER** return `EMPTY` from a list builder callback as the missing-auth fallback; establish context before activation or emit a typed paged result.
- **NEVER** grant management behavior from the route alone or the role alone; require both the administrator role and the `/mng/` route as defined in §3.1.11.
- **NEVER** leave a single `IGiangVien` editor/owner control editable in self-service scope when the form has no repeated member list; resolve the current lecturer, select it, and disable the control.
- **NEVER** implement a screen-specific file picker when the field can use the shared `UploadFileComponent` and `FileService` adapters.
- **NEVER** add `ngOnInit()` only to call a list manager's initial `triggerReload()`; both builders auto-fetch.
- **NEVER** use `takeUntilDestroyed()` without injecting `DestroyRef` and passing it as an argument (i.e. always use `takeUntilDestroyed(this.destroyRef)`).
- **NEVER** use `nzFooter` with content in `nzModalSvc.create()` — always set `nzFooter: null` and place the footer inside the form template.
- **NEVER** use `nzMaskClosable: true` — always `false`.
- **NEVER** omit `[nzScroll]` from `nz-table`.
- **NEVER** add or remove table columns during a refactor unless the user explicitly requests that column change or the entity has a missing `trangThai` column, which must always be added as the standard controlled switch.
- **NEVER** omit a user-facing business field from a newly created list table unless the user explicitly provides a narrower column specification. Technical identity fields such as the conventional `id` property and supporting attachment/evidence fields such as `minhChung` are omitted by default unless explicitly requested.
- **NEVER** use `nzShowPagination="true"` — always use the external `<app-table-paginate>` component.
- **NEVER** treat a project service's `delete(id)` method as permanent deletion; every such method toggles `trangThai` (`true ↔ false`) and must use the controlled status-switch workflow.
- **NEVER** use `standalone: true` in the `@Component` decorator — it is the default in Angular v17+ and is not written explicitly in this codebase.
- **NEVER** generate malformed legacy spacing classes such as `mr-5x1`; use the TailwindCSS 4 utility `mr-1.25`.
- **NEVER** generate the invalid Tailwind class `font-extra-light`; use `font-extralight`.
- **NEVER** define menu objects inline inside sidebar components (`ManagementSidebarComponent` or `MainSidebarComponent`); always isolate feature menus in `<feature-kebab>.menu.ts` and spread them into `listMenu`.
- **NEVER** use FontAwesome class names for parent `nz-submenu` icons when `listChild` has items; parent icons must be valid Ng-Zorro icon names.