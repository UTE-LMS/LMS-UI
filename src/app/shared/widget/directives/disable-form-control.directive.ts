import { Directive, OnInit, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '([formControlName], [formControl])[appDisabledControl]',
})
/*
Use: [appDisabledControl]="boolean"
Remember: disabledControl will striped out from FormGroup.value,
If you want to get them, use FormGroup.getRawValue()
*/
export class DisableFormControlDirective implements OnInit {
  private formControl = inject(NgControl);

  readonly appDisabledControl = input(false);

  ngOnInit(): void {
    if (this.appDisabledControl()) {
      this.formControl.control?.disable();
    } else {
      this.formControl.control?.enable();
    }
  }
}
