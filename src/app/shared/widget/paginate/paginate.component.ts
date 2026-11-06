/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Paginate } from './paginate.model';

export const pluginsModules = [
  FormsModule,
  NzGridModule,
  NzButtonModule,
  NzInputNumberModule,
  NzPaginationModule,
  NzSelectModule,
];

@Component({
  selector: 'app-table-paginate',
  templateUrl: './paginate.component.html',
  styleUrl: './paginate.component.css',
  imports: pluginsModules,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablePaginateComponent {
  readonly pageConfig = input.required<Paginate<any>>();
  readonly pageChange = output<Paginate<any>>();
  readonly numOfItemChange = output<Paginate<any>>();

  // Ngôn ngữ hiển thị
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).SHARED.PAGINATE;

  readonly fromItemIndex = computed(() => {
    const config = this.pageConfig();
    if (config.totalItem === 0) {
      return 0;
    }
    return ((config.currentPage - 1) * config.limit) + 1;
  });

  readonly toItemIndex = computed(() => {
    const config = this.pageConfig();
    return Math.min(config.currentPage * config.limit, config.totalItem);
  });

  onPageIndexChange(page: number): void {
    const config = this.pageConfig();
    if (page !== config.currentPage) {
      config.currentPage = page;
      this.refreshPage();
    }
  }

  onLimitSelect(limit: number): void {
    const config = this.pageConfig();
    config.limit = limit;
    config.currentPage = 1;
    this.refreshPage();
  }

  setPage(page: number): void {
    const pageConfig = this.pageConfig();
    if (page > 0 && page <= this.pageConfig().totalPage && page !== pageConfig.currentPage) {
      pageConfig.currentPage = page;
      this.refreshPage();
    }
  }

  changedPage(page: number): void {
    if (page - 1 > 0 && page - 1 < this.pageConfig().totalPage) {
      this.pageConfig().currentPage = page;
      this.refreshPage();
    } else {
      this.pageConfig().currentPage = 1;
      this.refreshPage();
    }
  }

  changedNumOfItem(numOfItem: string): void {
    const pageConfig = this.pageConfig();
    pageConfig.limit = Number.parseInt(numOfItem, 10);
    pageConfig.currentPage = 1;
    this.refreshPage();
  }

  refreshPage(): void {
    this.pageChange.emit(this.pageConfig());
  }
}
