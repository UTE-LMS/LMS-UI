import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ManagementHeaderComponent } from '../management-header/management-header.component';

@Component({
  selector: 'app-management-layout',
  templateUrl: './management-layout.component.html',
  styleUrl: './management-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    ManagementHeaderComponent,
  ],
})
export class ManagementLayoutComponent {}
