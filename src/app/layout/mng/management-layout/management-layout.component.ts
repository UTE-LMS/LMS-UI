import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { ManagementHeaderComponent } from '../management-header/management-header.component';

@Component({
  selector: 'app-management-layout',
  templateUrl: './management-layout.component.html',
  styleUrl: './management-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    NzLayoutModule,
    ManagementHeaderComponent,
  ],
})
export class ManagementLayoutComponent {}
