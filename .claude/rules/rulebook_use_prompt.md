Before proceeding, read the following file in full:

`rulebook/angular_component_rulebook.md`

Treat this file as the mandatory rulebook for generating List and Form components. Do not start writing code until you have read the entire Rulebook.

Create a new List/Form component pair using the following information:

- Model: `src/app/core/models/danh-muc/<model-file>.model.ts`
- Service: `src/app/core/services/danh-muc/<service-file>.service.ts`
- Target directory: `src/app/mng/danh-muc/<entity-name>`
- Vietnamese display name: `<Vietnamese catalog name>`

Requirements:

- Inspect the Model and Service to identify the DTO, Filter, data relationships, and status field.
- Follow the Rulebook strictly.
- Do not invent fields, validators, endpoints, or service methods that do not exist.
- Implement the components directly in the workspace.
- Run the project build or type-check after implementation and fix all related errors.
- Do not modify the Model, Service, routes, or menu unless it is genuinely required.
