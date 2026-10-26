import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { Subscription, take, timer } from 'rxjs';
import { ManagementFooterComponent } from '../management-footer/management-footer.component';
import { ManagementHeaderComponent } from '../management-header/management-header.component';
import { ManagementSidebarComponent } from '../management-sidebar/management-sidebar.component';

@Component({
  selector: 'app-management-layout',
  templateUrl: './management-layout.component.html',
  styleUrl: './management-layout.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    NzLayoutModule,
    ManagementHeaderComponent,
    ManagementFooterComponent,
    ManagementSidebarComponent,
  ],
})
export class ManagementLayoutComponent implements OnInit, OnDestroy {
  checkSliderSub!: Subscription;
  sliderWidth = signal(200);

  @HostListener('window:resize')
  onResize(): void {
    const scWidth = window.innerWidth;
    if (scWidth >= 1500) {
      this.sliderWidth.set(240);
    } else if (scWidth >= 1300) {
      this.sliderWidth.set(225);
    } else if (scWidth >= 1200) {
      this.sliderWidth.set(210);
    } else {
      this.sliderWidth.set(200);
    }
  }

  ngOnInit(): void {
    // Change trigger icon
    /*
    $(() => {
      if ($('nz-sider')[0] && $('.ant-layout-sider-zero-width-trigger')[0]) {
        if (!$('nz-sider').attr('class').includes('ant-layout-sider-collapsed')) {
          $('.ant-layout-sider-zero-width-trigger')[0].innerHTML = '<i class="fa-solid fa-chevron-circle-left text-xl"></i>';
        } else {
          $('.ant-layout-sider-zero-width-trigger')[0].innerHTML = '<i class="fa-solid fa-chevron-circle-right text-xl"></i>';
        }

        $('.ant-layout-sider-zero-width-trigger').on('click', () => {
          if (!$('nz-sider').attr('class').includes('ant-layout-sider-collapsed')) {
            $('.ant-layout-sider-zero-width-trigger')[0].innerHTML = '<i class="fa-solid fa-chevron-circle-left text-xl"></i>';
          } else {
            $('.ant-layout-sider-zero-width-trigger')[0].innerHTML = '<i class="fa-solid fa-chevron-circle-right text-xl"></i>';
          }
        });
      }
    });
    */
    // Call firstime
    window.dispatchEvent(new Event('resize'));
    // Then do check
    this.checkSliderSub = timer(0, 1000).pipe(take(5)).subscribe(() => window.dispatchEvent(new Event('resize')));
  }

  ngOnDestroy(): void {
    this.checkSliderSub.unsubscribe();
  }
}

