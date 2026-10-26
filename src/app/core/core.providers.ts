import { GoogleLoginProvider, SOCIAL_AUTH_CONFIG, SocialAuthServiceConfig } from '@abacritt/angularx-social-login';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, inject, LOCALE_ID, Provider } from '@angular/core';
import { environment } from '@env';
import { authInterceptor } from '@interceptors/auth.interceptor';
import { vi as viDate } from 'date-fns/locale';
import { en_US, NZ_DATE_LOCALE, NZ_I18N, vi_VN } from 'ng-zorro-antd/i18n';
import { provideSpinnerConfig } from 'ngx-spinner';
import { provideToastr } from 'ngx-toastr';

export const coreProviders: (Provider | EnvironmentProviders)[] = [
  {
    provide: NZ_I18N,
    // Usage:
    // import { en_US, NzI18nService } from 'ng-zorro-antd/i18n';
    // constructor(private i18n: NzI18nService) {}
    // switchLanguage() { this.i18n.setLocale(en_US); }
    useFactory: () => {
      const localId = inject(LOCALE_ID);
      switch (localId) {
        case 'en':
          return en_US;
        case 'vi':
          return vi_VN;
        default:
          return vi_VN;
      }
    },
  },
  { provide: NZ_DATE_LOCALE, useValue: viDate },
  provideSpinnerConfig({}),
  provideToastr({
    timeOut: 6868,
    positionClass: 'toast-top-right',
    preventDuplicates: true,
  }),
  provideHttpClient(
    withInterceptors([authInterceptor]),
  ),
  {
    provide: SOCIAL_AUTH_CONFIG,
    useValue: {
      autoLogin: false,
      providers: [
        {
          id: GoogleLoginProvider.PROVIDER_ID,
          provider: new GoogleLoginProvider(
            environment.keyGoogle,
            {
              oneTapEnabled: false,
              scopes: 'openid profile email',
            },
          ),
        },
      ],
      onError: (err) => {
        console.error(err);
      },
    } as SocialAuthServiceConfig,
  },
];
