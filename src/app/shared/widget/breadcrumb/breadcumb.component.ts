import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BreadCrumb } from '@widget/breadcrumb/breadcrumb.model';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';

export const pluginsModules = [
  RouterModule,
  NzBreadCrumbModule,
];
@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.css',
  imports: pluginsModules,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  readonly breadcrumb = input.required<BreadCrumb>();
}
