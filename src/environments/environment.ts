export const environment = {
  production: false,
  // Backend chạy cục bộ (API-CONTRACT.md §1.1). Có dấu / ở cuối vì URL ghép thẳng với 'api/v1/...'
  serverUrl: 'http://localhost:8090/',
  serverFileUrl: '',

  // Google OAuth client ID (loại Web) cho đăng nhập bằng Google. Giá trị công khai, rỗng = ẩn nút.
  // Dev: điền client ID của bạn ở đây (đừng commit); thêm http://localhost:4200 vào Authorized JavaScript origins.
  googleClientId: '',

  keyGoogle: '15443613184-c32g9kb3gf2no3krpr7mukc6n1k5oq9v.apps.googleusercontent.com',

  bugsReportUrl: 'https://script.google.com/macros/s/AKfycbxh4NlNFhMDQt-8EAqlxg3YWllZWo_ce6cdBKCp3iMzlQbcydIQtGp9ADvrb8qNd9eHlA/exec',
  bugReportSecretKey: 'const hashKey=new Date().getTime()+Math.random();',
};
