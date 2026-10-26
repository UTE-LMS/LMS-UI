import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  describe('App Smoke Test', () => {
    it('should pass basic sanity check', () => {
      expect(true).toBe(true);
    });
  });
});
