import { readRuntimeConfig } from './runtime-config';

describe('NT-UI/AC-9: readRuntimeConfig (cấu hình URL API nạp lúc chạy)', () => {
  it('không có cấu hình thì dùng chuỗi rỗng (cùng nguồn gốc)', () => {
    expect(readRuntimeConfig(undefined)).toEqual({ serverUrl: '', serverFileUrl: '', googleClientId: '' });
    expect(readRuntimeConfig(null)).toEqual({ serverUrl: '', serverFileUrl: '', googleClientId: '' });
    expect(readRuntimeConfig('chuoi')).toEqual({ serverUrl: '', serverFileUrl: '', googleClientId: '' });
  });

  it('chấp nhận URL http(s) tuyệt đối và tự thêm "/" ở cuối', () => {
    const config = readRuntimeConfig({ serverUrl: 'https://api.example.org', serverFileUrl: 'http://files.example.org/' });
    expect(config).toEqual({ serverUrl: 'https://api.example.org/', serverFileUrl: 'http://files.example.org/', googleClientId: '' });
  });

  it('chấp nhận "/" để gọi API cùng nguồn gốc qua reverse proxy', () => {
    expect(readRuntimeConfig({ serverUrl: '/' }).serverUrl).toBe('/');
  });

  it('cắt khoảng trắng hai đầu', () => {
    expect(readRuntimeConfig({ serverUrl: '  https://api.example.org  ' }).serverUrl).toBe('https://api.example.org/');
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    '//evil.example.org',
    'api.example.org',
    'ftp://example.org',
    '',
    42,
    null,
  ])('bỏ giá trị không hợp lệ %j (ca âm)', (value) => {
    expect(readRuntimeConfig({ serverUrl: value }).serverUrl).toBe('');
  });

  describe('ADR 0016: readRuntimeConfig.googleClientId (client ID đăng nhập Google nạp lúc chạy)', () => {
    const valid = '123456789012-abc_DEF-123.apps.googleusercontent.com';

    it('chấp nhận client ID đúng dạng và cắt khoảng trắng', () => {
      expect(readRuntimeConfig({ googleClientId: valid }).googleClientId).toBe(valid);
      expect(readRuntimeConfig({ googleClientId: `  ${valid} ` }).googleClientId).toBe(valid);
    });

    it.each([
      '',
      'khong-phai-client-id',
      'abc-def.apps.googleusercontent.com',
      '123-abc.apps.googleusercontent.com.evil.example',
      '123-abc.apps.googleusercontent.com"};alert(1);//',
      '123-<script>.apps.googleusercontent.com',
      42,
      null,
      undefined,
    ])('bỏ giá trị không hợp lệ %j (ca âm)', (value) => {
      expect(readRuntimeConfig({ googleClientId: value }).googleClientId).toBe('');
    });
  });
});
