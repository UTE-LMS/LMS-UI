# Angular Model and Service Rulebook

## System Instructions for AI Agent — Angular 21, Strict TypeScript, and RxJS

---

## OVERVIEW

Use this rulebook when creating or modifying files under:

- `src/app/core/models/`
- `src/app/core/services/`
- `src/app/core/constants/url.constant.ts` when a new API base URL is required

This rulebook was derived from a complete scan of the repository's 56 model files and 55 service files on 2026-07-30. It describes the repository's dominant conventions, the decision points between its service variants, and the special cases that must not be generalized into every feature.

The backend contract is always the source of truth. Existing repository patterns determine how that contract is represented in Angular; they do not authorize inventing fields, endpoints, defaults, enum members, status names, or response wrappers.

### Core principles

1. Model request data, response data, filters, projections, and paging explicitly.
2. Preserve backend property names and shapes exactly.
3. Reuse existing domain interfaces instead of duplicating nested structures.
4. Keep services thin: build the request, type the response, and return the `Observable`.
5. Choose the service blueprint from the actual API contract, not from a nearby filename.
6. Do not hide mismatches with `any`, broad casts, or unverified optional properties.
7. Treat special operations as named domain methods, not distorted CRUD methods.

---

## PART 1 — PRE-GENERATION WORKFLOW

Before writing a model or service:

1. Read the complete backend contract for the relevant controller.
2. List every operation with:
   - HTTP method;
   - exact path;
   - path and query parameters;
   - request body schema;
   - response schema;
   - binary or event-stream behavior.
3. Search existing models for every nested response type.
4. Search existing services for the closest endpoint shape.
5. Check `UrlConstant.API` for an existing base URL.
6. Determine whether the feature is:
   - scalar-search CRUD;
   - structured-filter CRUD;
   - lookup/read-only;
   - reporting/projection;
   - binary export;
   - upload;
   - authentication/external integration;
   - local utility.
7. Write the model before the service.
8. Verify the new files with targeted lint and a TypeScript/Angular build.

Do not infer an endpoint from a conventional name such as `/all`, `/filter`, or `/{id}`. Several repository services intentionally differ.

---

## PART 2 — FILE LOCATION AND NAMING

### 2.1 Model files

Place a model in the domain folder that owns the data:

```text
src/app/core/models/
  auth/
  cau-hinh/
  common/
  danh-muc/
  hrm/
  ke-khai/
```

Use kebab-case and the `.model.ts` suffix:

```text
<entity-kebab>.model.ts
```

Examples of valid shapes:

```text
nam-tai-chinh.model.ts
bang-tinh-gio-nckh.model.ts
thong-ke-bao-cao.model.ts
response-data.model.ts
```

### 2.2 Service files

Mirror the owning model domain where practical:

```text
src/app/core/services/<domain>/<entity-kebab>.service.ts
```

Use a PascalCase class name ending in `Service`:

```typescript
export class EntityService {}
```

### 2.3 Type names

Repository interfaces use the `I` prefix:

| Purpose | Pattern |
|---|---|
| Create/update request | `IEntityDTO` |
| Full API response | `IEntity` |
| Structured search body | `IEntityFilter` |
| Nested reusable shape | Descriptive `I...` name |
| Report/projection response | Descriptive `I...` name |
| Generic page response | `IPagedResults<T>` |

Do not use a `DTO` suffix for a server response unless the backend truly returns that request shape.

---

## PART 3 — IMPORT RULES

### 3.1 Use aliases across domain boundaries

Use the configured aliases:

```typescript
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { IEntityDTO, IEntity, IEntityFilter } from '@models/<domain>/<entity>.model';
import { IPagedResults } from '@models/common/response-data.model';
import { Observable } from 'rxjs';
```

Use `@models/...` and `@services/...` when importing across folders. A short relative import is acceptable for tightly coupled sibling model files in the same folder, but aliases are preferred when they make ownership clearer.

### 3.2 Import only concrete dependencies

- Do not import a nested interface if the model does not use it.
- Do not import `HttpParams` unless query parameters are constructed.
- Do not import `HttpResponse` unless the method exposes the full response.
- Do not import RxJS operators into a thin HTTP service unless the service genuinely transforms the transport stream.
- Do not introduce barrel files unless the repository adopts them consistently.

### 3.3 Avoid circular model dependencies

Put shared nested types in the domain that owns them or in `models/common` when they are truly cross-domain. Do not make two entity models import each other merely to avoid defining a small, stable projection.

---

## PART 4 — MODEL DESIGN

### 4.1 Use interfaces for API data

Use `interface` for object-shaped contracts:

```typescript
export interface IEntityDTO {
  code: string;
  name: string;
}

export interface IEntity extends IEntityDTO {
  id: string;
  trangThai: boolean;
}
```

The repository uses classes only when runtime behavior is needed, such as a modal data container. Do not use a class for a passive API payload.

### 4.2 Separate request and response shapes

Create a DTO when create/update requests differ from the response:

```typescript
export interface IEntityDTO {
  relatedEntity: string;
  effectiveDate: Date;
}

export interface IEntity extends Omit<IEntityDTO, 'relatedEntity'> {
  id: string;
  relatedEntity: IRelatedEntity;
  trangThai: boolean;
}
```

This is the repository's standard relationship pattern:

- request DTO carries an ID, email, code, or other scalar reference;
- response carries the populated object;
- the response uses `Omit` to replace the scalar property safely.

Never write an incompatible extension:

```typescript
// Invalid: string cannot be replaced by IRelatedEntity through direct extension.
export interface IEntity extends IEntityDTO {
  relatedEntity: IRelatedEntity;
}
```

### 4.3 Choose `extends` versus `Omit`

Use direct extension when DTO fields retain the same types:

```typescript
export interface IEntity extends IEntityDTO {
  id: string;
  trangThai: boolean;
}
```

Use `Omit` when one or more DTO fields become populated response objects:

```typescript
export interface IEntity extends Omit<IEntityDTO, 'category' | 'owner'> {
  id: string;
  category: ICategory;
  owner: IUser;
  trangThai: boolean;
}
```

List every replaced property explicitly. Do not omit unrelated properties.

### 4.4 Reuse nested types

If an existing model already describes a nested backend object, import it:

```typescript
import { INamTaiChinh } from '@models/cau-hinh/nam-tai-chinh.model';
import { IFileInfo } from '@models/common/file.model';
import { IGiangVien } from '@models/hrm/giang-vien.model';
```

Common reusable shapes include:

- financial year;
- lecturer;
- organizational unit;
- academic product;
- file information;
- page metadata;
- lecturer participation;
- training and employment history.

Do not reproduce a large nested Swagger example inline when a matching repository interface exists.

### 4.5 Model arrays with their element type

```typescript
members: IMember[];
evidenceFiles: IFileInfo[];
```

Use a dedicated nested interface when array elements have a stable domain shape. Do not use `object[]`, `{ }[]`, or `any[]`.

### 4.6 Dates and temporal strings

The repository represents API date/date-time properties as `Date`:

```typescript
startDate: Date;
endDate: Date;
```

Keep `string` only when the backend value is a textual period or label rather than an ISO date, for example a free-form training period.

Do not change API model fields to `FormControl`-friendly strings. Date conversion belongs at the component/serialization boundary.

### 4.7 Nullability and optionality

The project uses strict null checks. A property is optional or nullable only when the backend contract permits it:

```typescript
filename?: string;
fileInfo?: IFileInfo | null;
```

Rules:

- Use `?` when the property may be absent.
- Use `| null` when the property may be present with a null value.
- Use both only when both states are possible.
- Do not mark all filter or DTO fields optional. Services accept `Partial<IFilter>` when callers may send subsets.
- Do not use non-null assertions in model declarations.

### 4.8 Status fields are contract-specific

The repository contains both:

```typescript
trangThai: boolean;
```

and:

```typescript
tinhTrang: boolean;
```

It also contains domain status strings such as a project's business-state field. Preserve the exact backend name and type. Never normalize `trangThai` to `tinhTrang`, or vice versa, based on preference.

The service's default sort column must match the actual response property.

### 4.9 Filters

Structured filters are separate interfaces:

```typescript
export interface IEntityFilter {
  search: string;
  category: string;
  owner: string;
  fromDate: Date;
  toDate: Date;
}
```

Filter rules:

- Preserve backend names exactly.
- Use scalar IDs/codes/emails when the backend expects scalar references.
- Use paired date fields when the API defines a range.
- Include `search` only when the API supports it.
- Do not add paging fields to the filter when paging is sent as query parameters.
- Do not make every property optional in the interface; use `Partial<IEntityFilter>` at the service boundary when partial filters are accepted.

### 4.10 Report and projection models

Reporting controllers often return shapes that are neither DTOs nor CRUD entities. Name them by meaning:

```typescript
export interface IEntitySummary {
  detail: IEntity[];
  totalItems: number;
  totalValue: number;
}

export interface IEntityStatistic {
  category: string;
  year: number;
  count: number;
}
```

Do not force a report response into `IEntity`, `IEntityDTO`, or `IPagedResults<T>` unless the API actually returns that shape.

### 4.11 Paged responses

Reuse the shared page contract:

```typescript
import { IPagedResults } from '@models/common/response-data.model';
```

Do not create feature-specific copies of:

- `content`;
- `totalElements`;
- `totalPages`;
- `pageable`;
- `sort`;
- `first`, `last`, or `empty`.

### 4.12 Files

Use `IFileInfo` for backend file metadata. Use the specialized patch/upload helper interfaces only for the exact workflows they represent.

Do not model a server file as the browser's `File` type unless the value is truly an unsent browser file.

### 4.13 Closed values

Use a string-literal union when the API exposes a verified closed set:

```typescript
status: 'success' | 'error' | 'forbidden';
```

The scanned model layer contains no exported TypeScript enums. Do not invent an enum from a single Swagger example. Use `string` until all allowed values are confirmed, or introduce a literal union/constants only when the complete contract is known and consumers benefit from it.

### 4.14 Audit fields

Swagger responses may expose fields such as `createdBy`, `createdDate`, `lastModifiedBy`, and `lastModifiedDate`. The repository generally omits them unless the UI uses them.

Include audit fields only when required by a consumer or when the feature explicitly models them.

### 4.15 Utility model types

Use a type alias for mapped, conditional, or union types:

```typescript
export type MakeForm<T> = {
  [K in keyof T]: FormControl<T[K]>;
};
```

Do not create an empty interface that merely aliases a supertype. Prefer:

```typescript
export type IEntityFilter = Omit<IEntityDTO, 'ignoredField'>;
```

---

## PART 5 — SERVICE ARCHITECTURE

### 5.1 Standard service skeleton

```typescript
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { IEntity } from '@models/<domain>/<entity>.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EntityService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = UrlConstant.API.DOMAIN_ENTITY;

  getById(id: string): Observable<IEntity> {
    return this.http.get<IEntity>(this.apiUrl + `/${id}`);
  }
}
```

Rules:

- Every scanned service is root-provided.
- Use `inject()`; do not introduce constructor injection.
- New code should mark stable injected dependencies and base URLs `readonly`.
- Keep the base URL in one field.
- Return the `Observable`; do not subscribe inside a domain HTTP service.

Existing services omit `readonly` on these fields, but that is a legacy consistency issue, not a reason to generate mutable references.

### 5.2 API base URLs

For internal application APIs, define the base URL in `UrlConstant.API`:

```typescript
DOMAIN_ENTITY: environment.serverUrl + 'rest/entity',
```

Then reference it:

```typescript
private readonly apiUrl = UrlConstant.API.DOMAIN_ENTITY;
```

Use `environment` directly only for endpoints that are genuinely environment-specific and do not belong to the central internal API catalog, such as a separate external reporting system.

Do not duplicate the same literal base URL across service methods.

### 5.3 Always type HTTP responses

```typescript
return this.http.get<IEntity>(url);
return this.http.get<IEntity[]>(url);
return this.http.post<IEntity>(url, body);
return this.http.post<IPagedResults<IEntity>>(url, body, { params });
return this.http.delete<void>(url);
```

Use the actual backend response. A delete operation may return the entity or `void`; do not assume one globally.

### 5.4 Keep services transport-focused

A domain service should normally:

1. construct the URL;
2. construct query parameters or headers;
3. invoke `HttpClient`;
4. return the typed stream.

Do not add UI notifications, modal state, component loading state, or form mutation to domain services.

Do not add `catchError` merely to rethrow the same error. Application-wide error behavior belongs in the existing interceptor/error infrastructure unless a method has a specific recovery contract.

---

## PART 6 — CRUD SERVICE DECISION TABLE

Choose the blueprint from the API:

| API shape | Service pattern |
|---|---|
| `GET /filter` with `search`, page, size, sort, column | Scalar-search catalog CRUD |
| `POST /filter` with filter body plus page, size, sort, column | Structured-filter CRUD |
| Unpaged `GET` collection | `getAll(): Observable<IEntity[]>` |
| Unpaged filtered `POST /all` | `getAll(filter: Partial<IFilter>)` |
| Unpaged filtered `POST` at base path | Use the domain verb such as `search(...)` if that is the actual endpoint |
| No CRUD endpoints | Create only the named operations present in the controller |

### 6.1 Scalar-search catalog CRUD

Use this when filtering is only a scalar search string sent as query parameters:

```typescript
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { IEntity, IEntityDTO } from '@models/<domain>/<entity>.model';
import { IPagedResults } from '@models/common/response-data.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EntityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = UrlConstant.API.DOMAIN_ENTITY;

  getAll(): Observable<IEntity[]> {
    return this.http.get<IEntity[]>(this.apiUrl);
  }

  getById(id: string): Observable<IEntity> {
    return this.http.get<IEntity>(this.apiUrl + `/${id}`);
  }

  filter(
    page: number,
    size: number,
    search?: string,
    sort?: string,
    column?: string,
  ): Observable<IPagedResults<IEntity>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('search', search ?? '')
      .set('sort', sort ?? 'desc')
      .set('column', column ?? 'trangThai');

    return this.http.get<IPagedResults<IEntity>>(this.apiUrl + '/filter', { params });
  }

  create(model: IEntityDTO): Observable<IEntity> {
    return this.http.post<IEntity>(this.apiUrl, model);
  }

  update(model: IEntityDTO, id: string): Observable<IEntity> {
    return this.http.put<IEntity>(this.apiUrl + `/${id}`, model);
  }

  delete(id: string): Observable<IEntity> {
    return this.http.delete<IEntity>(this.apiUrl + `/${id}`);
  }
}
```

Replace the default sort and column only with values supported by the endpoint.

### 6.2 Structured-filter CRUD

Use this when the backend accepts a filter object:

```typescript
@Injectable({
  providedIn: 'root',
})
export class EntityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = UrlConstant.API.DOMAIN_ENTITY;

  getAll(filter: Partial<IEntityFilter>): Observable<IEntity[]> {
    return this.http.post<IEntity[]>(this.apiUrl + '/all', filter);
  }

  getById(id: string): Observable<IEntity> {
    return this.http.get<IEntity>(this.apiUrl + `/${id}`);
  }

  filter(
    filter: Partial<IEntityFilter>,
    page: number,
    size: number,
    sort?: string,
    column?: string,
  ): Observable<IPagedResults<IEntity>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort ?? 'desc')
      .set('column', column ?? 'trangThai');

    return this.http.post<IPagedResults<IEntity>>(
      this.apiUrl + '/filter',
      filter,
      { params },
    );
  }

  create(model: IEntityDTO): Observable<IEntity> {
    return this.http.post<IEntity>(this.apiUrl, model);
  }

  update(model: IEntityDTO, id: string): Observable<IEntity> {
    return this.http.put<IEntity>(this.apiUrl + `/${id}`, model);
  }

  delete(id: string): Observable<IEntity> {
    return this.http.delete<IEntity>(this.apiUrl + `/${id}`);
  }
}
```

Do not convert a structured filter to query parameters merely to resemble the scalar-search services.

### 6.3 Partial DTOs

Use `Partial<IEntityDTO>` only when the endpoint accepts partial create/update data:

```typescript
create(data: Partial<IEntityDTO>): Observable<IEntity>
```

Do not use `Partial` to silence missing required fields in a normal create contract.

### 6.4 Update argument order

The dominant repository convention is:

```typescript
update(model: IEntityDTO, id: string)
```

Some established services use:

```typescript
update(id: string, data: Partial<IEntityDTO>)
```

For a new conventional CRUD service, use model first and ID second. When extending an existing service, preserve its public method order to avoid breaking consumers.

---

## PART 7 — PAGINATION AND QUERY PARAMETERS

### 7.1 Reuse `IPagedResults<T>`

```typescript
filter(...): Observable<IPagedResults<IEntity>>
```

### 7.2 Build parameters explicitly

Prefer `HttpParams`:

```typescript
const params = new HttpParams()
  .set('page', page.toString())
  .set('size', size.toString())
  .set('sort', sort ?? 'desc')
  .set('column', column ?? 'trangThai');
```

Rules:

- `page` and `size` are required unless the API declares otherwise.
- Convert numeric values to strings.
- Use nullish coalescing for optional values.
- Include `search` only for endpoints that define it.
- Do not add empty `sort` or `column` values unless the backend expects them.
- Do not assume `trangThai`; some entities use `tinhTrang`, and some projections have neither.

### 7.3 Share a private helper only when repeated

When one service has multiple paged methods with the same parameter contract, a private helper is appropriate:

```typescript
private getPagingParams(
  page: number,
  size: number,
  sort: string | undefined,
  column: string | undefined,
  defaultColumn: string,
): HttpParams {
  return new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString())
    .set('sort', sort ?? 'desc')
    .set('column', column ?? defaultColumn);
}
```

Do not introduce a helper for a single short method.

---

## PART 8 — SPECIALIZED OPERATIONS

### 8.1 Named domain actions

Represent non-CRUD endpoints with clear domain verbs:

```typescript
getByEmail(email: string): Observable<IEntity>
setDefault(id: string): Observable<IEntity>
syncForCurrentUser(): Observable<IEntity>
recalculateByYear(yearId: string): Observable<IEntity[]>
getStatistics(filter: Partial<IStatisticsFilter>): Observable<IStatistic[]>
```

Rules:

- Match the actual HTTP verb even if the operation sounds read-like.
- Send `null` when a mutating endpoint requires a body but defines no payload.
- Do not disguise an action as `update()` if it has a distinct endpoint and meaning.

### 8.2 Reporting services

A reporting service may expose multiple unrelated response projections under one controller:

```typescript
getSummary(filter: Partial<ISummaryFilter>): Observable<ISummary>
getStatistics(filter: Partial<IStatisticFilter>): Observable<IStatistic[]>
getItems(filter: Partial<IStatisticFilter>): Observable<IReportItem[]>
```

Use the specific filter and response type for each operation. Reuse existing entity types only when the response is genuinely the same entity schema.

### 8.3 Binary exports

Use the full response so callers can read headers such as the filename:

```typescript
import { HttpResponse } from '@angular/common/http';

exportData(filter: Partial<IEntityFilter>): Observable<HttpResponse<Blob>> {
  return this.http.post(
    this.apiUrl + '/export',
    filter,
    {
      observe: 'response',
      responseType: 'blob',
    },
  );
}
```

Rules:

- Use `GET` or `POST` according to the backend.
- Return `Observable<HttpResponse<Blob>>`.
- Do not type a binary Swagger response as `string`.
- Do not trigger downloads or manipulate the DOM inside the API service; use the existing file utility at the caller layer.

### 8.4 Uploads

For uploads:

- send `FormData`;
- do not set the multipart `Content-Type` manually;
- use `observe: 'events'` and `reportProgress: true` only when callers need progress;
- return `Observable<HttpEvent<IFileInfo>>` for an event stream;
- use `forkJoin` for a deliberate all-files completion contract.

Upload and file-conversion logic belongs in the shared file service, not duplicated in each feature service.

### 8.5 Authentication and external APIs

Manual headers are conditional:

```typescript
const options = {
  headers: new HttpHeaders({
    Authorization: `Bearer ${token}`,
  }),
};
```

Internal authenticated requests should rely on the application's interceptor when possible. Add manual authorization or custom content types only when the endpoint explicitly requires them, especially for external systems or token bootstrap calls.

### 8.6 Local utility services

Common services for validation, formatting, SEO, file conversion, or error handling are not HTTP CRUD templates.

For such services:

- still use `@Injectable({ providedIn: 'root' })`;
- type every parameter and return value;
- keep side effects explicit;
- avoid forcing `Observable` onto synchronous utility methods;
- do not add an `apiUrl` when no API is involved.

---

## PART 9 — URL CONSTRUCTION

Use one style consistently within a service:

```typescript
this.apiUrl + `/${id}`
```

or:

```typescript
`${this.apiUrl}/${id}`
```

Both exist in the repository. Prefer template literals when a path has multiple dynamic segments:

```typescript
`${this.apiUrl}/year/${yearId}/lecturer/${email}`
```

Rules:

- Preserve exact segment order.
- Do not add or remove `/all`, `/filter`, `/me`, or `/email` based on convention.
- Do not silently encode an entire path.
- For user-entered path values, confirm whether the backend expects URL encoding and encode the individual segment when required.
- Put query values in `HttpParams`, not string concatenation.

---

## PART 10 — RXJS BOUNDARIES

HTTP methods return cold `Observable` values:

```typescript
getById(id: string): Observable<IEntity> {
  return this.http.get<IEntity>(this.apiUrl + `/${id}`);
}
```

Rules:

- Do not call `subscribe()` in domain services.
- Do not convert ordinary HTTP methods to promises.
- Do not add `shareReplay` globally; caching requires an explicit invalidation policy.
- Do not swallow errors with `EMPTY`, fallback objects, or empty arrays unless the method contract explicitly defines that behavior.
- Transform streams with `map` only when the service intentionally adapts a transport representation into the application's domain representation.
- Keep UI lifecycle operators such as `takeUntilDestroyed` in components, not root services.

Authentication and stateful infrastructure services may manage local state and compose streams; do not copy those patterns into ordinary entity services without the same requirement.

---

## PART 11 — CANONICAL COMPLETE PAIR

### 11.1 Model

```typescript
import { ICategory } from '@models/danh-muc/category.model';
import { IFileInfo } from '@models/common/file.model';

export interface IEntityDTO {
  category: string;
  name: string;
  effectiveDate: Date;
  evidence: IFileInfo;
}

export interface IEntity extends Omit<IEntityDTO, 'category'> {
  id: string;
  category: ICategory;
  trangThai: boolean;
}

export interface IEntityFilter {
  search: string;
  category: string;
  fromDate: Date;
  toDate: Date;
}
```

### 11.2 Service

```typescript
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { IPagedResults } from '@models/common/response-data.model';
import { IEntity, IEntityDTO, IEntityFilter } from '@models/<domain>/<entity>.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EntityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = UrlConstant.API.DOMAIN_ENTITY;

  getAll(filter: Partial<IEntityFilter>): Observable<IEntity[]> {
    return this.http.post<IEntity[]>(this.apiUrl + '/all', filter);
  }

  getById(id: string): Observable<IEntity> {
    return this.http.get<IEntity>(this.apiUrl + `/${id}`);
  }

  filter(
    filter: Partial<IEntityFilter>,
    page: number,
    size: number,
    sort?: string,
    column?: string,
  ): Observable<IPagedResults<IEntity>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort ?? 'desc')
      .set('column', column ?? 'trangThai');

    return this.http.post<IPagedResults<IEntity>>(
      this.apiUrl + '/filter',
      filter,
      { params },
    );
  }

  create(model: IEntityDTO): Observable<IEntity> {
    return this.http.post<IEntity>(this.apiUrl, model);
  }

  update(model: IEntityDTO, id: string): Observable<IEntity> {
    return this.http.put<IEntity>(this.apiUrl + `/${id}`, model);
  }

  delete(id: string): Observable<IEntity> {
    return this.http.delete<IEntity>(this.apiUrl + `/${id}`);
  }
}
```

This pair is a blueprint, not proof that every endpoint has these operations or paths.

---

## PART 12 — LEGACY AND INCONSISTENT PATTERNS

The scan found isolated inconsistencies. Do not promote them into new code:

- mutable `http` and `apiUrl` fields where `readonly` is safe;
- ternary expressions where `??` is clearer;
- inconsistent indentation before return types;
- both `filter` and `filterPaging` names for similar page operations;
- both `trangThai` and `tinhTrang` as status fields;
- a few filtered collection methods posting to the base path rather than `/all`;
- one empty interface extending an `Omit` type;
- a typo in an authentication DTO name;
- mixed URL concatenation styles;
- feature-specific methods with abbreviated Vietnamese names.

Handle these as follows:

- Preserve backend field and endpoint inconsistencies because changing them breaks the contract.
- Preserve existing public service method names and argument order when modifying a consumed service.
- Use the canonical style in this rulebook for new code.
- Do not copy formatting defects, empty interfaces, typos, or obsolete naming into new files.

---

## PART 13 — VERIFICATION

### 13.1 Contract verification

Confirm:

- every controller operation in scope has the correct service method;
- every service method uses the correct HTTP verb and exact path;
- path and query parameters are in the correct location;
- request bodies match DTO/filter schemas;
- response types match the backend, including arrays, pages, projections, `void`, and binary responses;
- status and date property names are exact;
- closed-value types contain only verified members.

### 13.2 Model verification

Confirm:

- the file and interface names follow project conventions;
- DTO and response shapes are separate when relationships change type;
- `Omit` lists every replaced property;
- existing nested interfaces are reused;
- no `any`, empty object type, or unexplained cast was added;
- optional and nullable properties reflect the API;
- paging metadata is not duplicated.

### 13.3 Service verification

Confirm:

- the service is root-provided;
- dependencies use `inject()`;
- stable fields are `readonly`;
- the API base URL is centralized where appropriate;
- every HTTP call has a generic response type unless overload inference is required for `Blob` or events;
- the service returns streams without internal UI subscriptions;
- pagination defaults refer to real sortable properties;
- no component concerns entered the service.

### 13.4 Workspace checks

Run targeted lint first:

```text
npx eslint src/app/core/models/<domain>/<entity>.model.ts src/app/core/services/<domain>/<entity>.service.ts src/app/core/constants/url.constant.ts
```

Then run an Angular build or TypeScript check. If the full repository already has unrelated lint or bundle-budget failures:

1. verify that no reported error points to the changed files;
2. run the narrowest available check on the changed files;
3. report the unrelated baseline failure accurately;
4. do not edit unrelated files merely to make the global check green.

---

## FINAL GENERATION CHECKLIST

Before completing any model/service task:

- [ ] I read the backend controller/schema rather than guessing.
- [ ] I selected scalar-search, structured-filter, reporting, lookup, export, upload, or utility architecture intentionally.
- [ ] The model filename and service filename use kebab-case.
- [ ] Object contracts use `I`-prefixed interfaces.
- [ ] Request DTOs contain the exact body fields.
- [ ] Response interfaces contain the exact consumed response fields.
- [ ] Scalar relationship fields are replaced with populated objects through `Omit`.
- [ ] Existing nested model types are reused.
- [ ] Dates, optionality, nullability, arrays, and status fields match the contract.
- [ ] No enum members, fields, endpoints, validators, or defaults were invented.
- [ ] The service uses `@Injectable({ providedIn: 'root' })` and `inject()`.
- [ ] The internal API base URL is declared in `UrlConstant.API`.
- [ ] Every `HttpClient` call is correctly typed.
- [ ] Paging uses `IPagedResults<T>` and correct query parameters.
- [ ] Binary exports return `HttpResponse<Blob>`.
- [ ] The service does not subscribe, display UI messages, or mutate component state.
- [ ] Specialized endpoints have clear domain method names.
- [ ] Targeted lint passes.
- [ ] The Angular/TypeScript build was run, or any unrelated baseline failure was documented.

