Update the existing Angular List/Form Component Rulebook using the newly added components as additional architectural evidence.

## Existing Rulebook

Read this file completely before starting:

`rulebook/angular_component_rulebook.md`

## New Components to Analyze

Analyze all `.ts`, `.html`, and relevant `.css` files under:

- `src/app/mng/ke-khai/bai-bao-khoa-hoc/list-bai-bao-khoa-hoc/`
- `src/app/main/ke-khai/list-bai-bao-khoa-hoc-gv/`
- `src/app/ke-khai-shared/bai-bao-khoa-hoc/form-bai-bao-khoa-hoc/`

Also inspect any directly related Model, DTO, Filter, Service, shared builder, validator, uploader, table, pagination, or lookup implementation required to understand the new patterns.

## Objective

Compare the new components against the existing Rulebook and update the Rulebook with any genuinely new, reusable List/Form generation conventions.

The updated Rulebook must remain a ready-to-use System Instruction for another AI agent that generates new Angular 21 List and Form components.

## Analysis Requirements

Evaluate the new components for:

1. Angular 21 patterns:
   - Signals and computed state.
   - `input()` and `output()`.
   - `@if`, `@for`, and other modern control-flow syntax.
   - Standalone component imports.
   - `OnPush` change detection.
   - Signal/RxJS interoperability.

2. List architecture:
   - `createListManagerFilter` or `createListManagerNoFilter`.
   - New paging, searching, filtering, sorting, or reload behavior.
   - New filter-control types.
   - Server-side lookup search.
   - Table columns, responsive layouts, row actions, and status handling.
   - Modal creation and close/reload behavior.

3. Form architecture:
   - Typed `FormGroup<MakeForm<DTO>>` construction.
   - New control types or nested form structures.
   - DTO-to-response mappings.
   - Edit-mode patching.
   - Validation rules and error-display conventions.
   - Submission streams using `submit$`, `filter`, `exhaustMap`, `catchError`, and `takeUntilDestroyed`.
   - File upload, date picker, dynamic fields, or relationship selectors.

4. Ng-Zorro integration:
   - New modules or controls.
   - Table, modal, select, date, switch, upload, or button configurations.
   - Responsive `nz-row`/`nz-col` patterns and `[nzGutter]`.

5. TailwindCSS 4 and styling:
   - New reusable spacing, sizing, responsive, layout, typography, or alignment utilities.
   - New shared global classes.
   - Valid TailwindCSS 4 replacements for legacy or invalid classes.

6. Integration standards:
   - New shared widgets or components.
   - Lookup services and Observable handling.
   - Constants, enum-label mappings, breadcrumbs, file services, and domain-specific conventions.

## Rulebook Update Policy

1. Preserve all correct and still-relevant content in the existing Rulebook.
2. Do not rewrite the entire document unnecessarily.
3. Add or revise only the sections affected by confirmed new patterns.
4. Promote a new pattern to a strict rule only when it is:
   - Repeated across components;
   - Required by a shared abstraction;
   - Clearly intentional; or
   - A safer modern replacement for an older pattern.
5. If a pattern appears only once and is domain-specific, document it as an optional or conditional pattern, not a universal rule.
6. Do not turn apparent bugs, typos, dead code, redundant code, inconsistent validation messages, unsafe subscriptions, or legacy patterns into new rules.
7. When new code conflicts with the current Rulebook:
   - Determine whether the new implementation is an intentional architectural evolution or an isolated inconsistency.
   - Prefer the pattern that is type-safe, signal-based, maintainable, and consistent with Angular 21.
   - Update the Rulebook only when the newer pattern should be used for future components.
8. Keep all examples generic. Use placeholders such as `IEntity`, `IEntityDTO`, `EntityService`, and `<entity-kebab>`.
9. Do not copy the complete content of any analyzed source file into the Rulebook.
10. Remove or replace a previous rule only when the new evidence clearly makes it obsolete.
11. Preserve the Rulebook’s English language, Markdown structure, imperative system-instruction style, and UTF-8 encoding.
12. Keep code templates compilable after placeholder substitution.

## Required Changes to the Rulebook

When applicable:

- Add new rules to the most relevant existing section.
- Add new optional implementation blueprints.
- Update decision tables when a new Model or Service shape is encountered.
- Update imports and UI-control guidance.
- Update the final generation checklist.
- Resolve contradictions and remove duplicated instructions.
- Keep canonical recommendations separate from legacy observations.

## Verification

After updating the Rulebook:

1. Re-read the complete updated document.
2. Check that no existing important rule was accidentally removed.
3. Check that new rules are supported by the analyzed code.
4. Check that code snippets use the correct Angular 21 APIs.
5. Check that all Markdown headings, lists, tables, and code fences are valid.
6. Check that the document does not contain full copied component files.
7. Check that no invalid Tailwind classes or mojibake were introduced.

## Output and Workspace Behavior

Update this file directly:

`rulebook/angular_component_rulebook.md`

Do not modify the analyzed components, Models, or Services.

At the end, report only:

- Rulebook sections added or changed.
- New reusable patterns incorporated.
- Existing rules revised or deprecated.
- Patterns intentionally excluded because they were domain-specific, inconsistent, legacy, or likely defects.
- Verification performed.
