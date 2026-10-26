/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { Paginate } from './paginate.model';

export const pluginsModules = [
  FormsModule,
  // ReactiveFormsModule,
  NzGridModule,
  NzButtonModule,
  NzInputNumberModule,
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

  // Ngon ngu hien thi //////////
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).SHARED.PAGINATE;

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
