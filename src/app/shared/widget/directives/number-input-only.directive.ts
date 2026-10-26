import { Directive, ElementRef, HostListener, OnInit, Renderer2, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appNumberInputOnly]',
})
export class NumberInputOnlyDirective implements OnInit {
  private elSvc = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private formControl = inject(NgControl);
  private rendererSvc = inject(Renderer2);


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
    const result = val.replace(/[^0-9]*/g, '');
    this.rendererSvc.setProperty(this.elSvc.nativeElement, 'value', result);
    this.formControl.control?.setValue(result);
  }
}
