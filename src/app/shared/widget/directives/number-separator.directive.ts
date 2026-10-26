import { DecimalPipe } from '@angular/common';
import { Directive, ElementRef, HostListener, OnInit, Renderer2, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appNumberSeparator]',
  providers: [DecimalPipe],
})
export class NumberSeparatorDirective implements OnInit {
  private elSvc = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private formControl = inject(NgControl);
  private rendererSvc = inject(Renderer2);
  private decimalPipeSvc = inject(DecimalPipe);

  currencyChars = new RegExp('[.,]', 'g');

  @HostListener('input', ['$event']) onInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input) {
      this.format(input.value);
    }
  }

  ngOnInit() {
    this.format(this.elSvc.nativeElement.value); // format any initial values
  }

  format(val: string) {
    // 1. test for non-number characters and replace/remove them
    const numberFormat = parseInt(String(val).replace(this.currencyChars, ''), 10);
    // console.log(numberFormat); // raw number

    // 2. format the number (add dot)
    const n = this.decimalPipeSvc.transform(numberFormat, '1.0', 'vi-VN');

    // 3. replace the input value with formatted numbers
    this.rendererSvc.setProperty(this.elSvc.nativeElement, 'value', n);
    this.formControl.control?.setValue(n);
  }
}
