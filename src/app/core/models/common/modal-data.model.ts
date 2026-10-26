import { SystemConstant } from '@constants/system.constant';

export class ModalData<T> {
  action: string;
  data: T | null;
  constructor() {
    this.action = SystemConstant.ACTION.ADD;
    this.data = null;
  }
}
