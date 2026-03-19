# User Auth API

## Default Admin

- Username: `admin`
- Password: `123456`
- Password hash in SQL: `SHA-256`

## Admin Login

- `POST /api/user/admin/login`

```json
{
  "username": "admin",
  "password": "123456"
}
```

## WeChat Mini Program Login

- `POST /api/user/wechat/login`
- Backend config required before testing:
  - `app.wechat.appid`
  - `app.wechat.secret`
  - or environment variables `APP_WECHAT_APPID` / `APP_WECHAT_SECRET`
  - compatible aliases: `WECHAT_APP_ID` / `WECHAT_APP_SECRET`

```json
{
  "code": "wx-login-code",
  "nickname": "微信用户",
  "avatarUrl": "https://example.com/avatar.png"
}
```

## Current User

- `GET /api/user/info`
- Header: `Authorization: Bearer <token>`

## Logout

- `POST /api/user/logout`

## Admin User Management

- `GET /api/admin/users/list?page=1&pageSize=10&keyword=&userType=&status=`
- `POST /api/admin/users`
- `PUT /api/admin/users/{id}`
- `PUT /api/admin/users/{id}/status`
- `PUT /api/admin/users/{id}/password/reset`
