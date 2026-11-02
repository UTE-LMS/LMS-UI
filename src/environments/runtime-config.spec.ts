import { readRuntimeConfig } from './runtime-config';

describe('NT-UI/AC-9: readRuntimeConfig (cấu hình URL API nạp lúc chạy)', () => {
  it('không có cấu hình thì dùng chuỗi rỗng (cùng nguồn gốc)', () => {
    expect(readRuntimeConfig(undefined)).toEqual({ serverUrl: '', serverFileUrl: '' });
    expect(readRuntimeConfig(null)).toEqual({ serverUrl: '', serverFileUrl: '' });
    expect(readRuntimeConfig('chuoi')).toEqual({ serverUrl: '', serverFileUrl: '' });
  });

  it('chấp nhận URL http(s) tuyệt đối và tự thêm "/" ở cuối', () => {
    const config = readRuntimeConfig({ serverUrl: 'https://api.example.org', serverFileUrl: 'http://files.example.org/' });
    expect(config).toEqual({ serverUrl: 'https://api.example.org/', serverFileUrl: 'http://files.example.org/' });
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
});
