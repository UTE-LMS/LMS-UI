import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import vi from '@angular/common/locales/vi';
import { ApplicationConfig, importProvidersFrom, isDevMode, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { routes } from './app.routes';
import { coreProviders } from './core/core.providers';

registerLocaleData(vi);
registerLocaleData(en);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(), // Provide global error listeners for the Zoneless application
    // provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      /**
       * Make Input() able to read router params (Eg. /:id)
       *
       * Example 1: Read params without setter
       * Router config: '/:id'  =>  @Input('id') idProduct!: string;
       * => We can read 'this.idProduct' value in ngOnInit (after constructor)
       *
       * Example 2: Read params with setter (can read before ngOnInit, after constructor)
       * Router config: '/:id'
       * idProduct!: string; // NEED to declare variable
       * @Input('id') set anyFuncName(data: string) {
       *   this.idProduct = data;
       *   // Execute some code if you want...
       * }
       */
      withComponentInputBinding(),

      /**
       * If you want to use the parent components route info:
       */
      // withRouterConfig({
      //   paramsInheritanceStrategy: 'always',
      // })
      //
      // withInMemoryScrolling({
      //   scrollPositionRestoration: 'disabled',
      // }),
      // onSameUrlNavigation: 'reload',
    ),
    // importProvidersFrom(FormsModule),
    importProvidersFrom(
      ServiceWorkerModule.register('ngsw-worker.js', {
        // The application must be accessed over HTTPS, not HTTP
        // https://angular.dev/ecosystem/service-workers#before-you-start
        enabled: !isDevMode(),
        // Register the ServiceWorker as soon as the application is stable
        // or after 30 seconds (whichever comes first).
        registrationStrategy: 'registerWhenStable:30000',
      }),
    ),
    ...coreProviders,

    // Disable Popover API because CDK v21 Overlay issue
    // https://github.com/NG-ZORRO/ng-zorro-antd/issues/9753#issuecomment-4568967198
    {
      provide: OVERLAY_DEFAULT_CONFIG,
      useValue: { usePopover: false }
    }
  ],
};
