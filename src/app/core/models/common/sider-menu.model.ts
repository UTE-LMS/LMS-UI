export interface ISiderMenu {
  icon: string;
  title: string;
  routerLink: string;
  roles: string[];
  listChild: ISiderMenuChild[];
}

export interface ISiderMenuChild {
  icon: string;
  title: string;
  roles: string[];
  routerLink: string;
}
