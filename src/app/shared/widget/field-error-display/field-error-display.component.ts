import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-field-error-display',
  templateUrl: './field-error-display.component.html',
  styleUrl: './field-error-display.component.css',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldErrorDisplayComponent {
  readonly errorMsg = input.required<string>();
  readonly displayError = input.required<boolean>();
}
