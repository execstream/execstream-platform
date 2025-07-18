# 🚀 ExecStream Backend API

This README provides comprehensive documentation for the Executive Stream backend API, including all available routes, request/response formats, role-based access control, and data models related to content publishing, contributor management, tag handling, and newsletter operations.

## 💠 Local Setup

Follow these steps to run the ExecStream backend locally:

### 1. Clone the repository

```bash
git clone https://github.com/execstream/execstream-platform.git
cd execstream-platform/server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

Copy the .env.example file and rename it to .env. Then, fill in the required values.

```env
cp .env.example .env
```

Update the variables in .env with your local configuration (e.g., database URI, API keys).

### 4. Start the development server

```bash
npm run dev
```

Server will be running on [http://localhost:5000](http://localhost:5000) by default.

## 🚏 Base API Routes

| Path                   | Description                                |
| ---------------------- | ------------------------------------------ |
| `/api/v1/auth`         | Authentication (login, register)           |
| `/api/v1/content`      | Content management (CRUD, publish)         |
| `/api/v1/newsletter`   | Newsletter subscriptions & actions         |
| `/api/v1/tags`         | Tag management (themes, industries, roles) |
| `/api/v1/contributors` | Contributor profiles & details             |

---

## 🔐 Authentication

### 🔑 Login

**POST /api/v1/auth/login** 🌐 _Public_

_Request Body:_

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

_✅ Response:_

```json
{
  "message": "Login successful",
  "admin": {
    "_id": "6832af7e0466922553a3a87d",
    "name": "Suyash Pandey",
    "email": "suyashpandey310@gmail.com",
    "role": "superAdmin",
    "created_at": "2025-05-25T05:49:50.130Z",
    "updated_at": "2025-07-07T23:08:55.948Z",
    "__v": 0,
    "last_login": "2025-07-07T23:08:55.947Z",
    "last_logout": "2025-07-07T23:06:40.741Z",
    "provider": "local"
  }
}
```

---

### 📝 Register

**POST /api/v1/auth/register** 🌐 _Public_

_Request Body:_

```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123",
  "otp": "123456",
  "role": "editor"
}
```

_✅ Response:_

```json
{
  "message": "Admin registered successfully",
  "admin": {
    "_id": "6832af7e0466922553a3a87d",
    "name": "Suyash Pandey",
    "email": "suyashpandey310@gmail.com",
    "role": "superAdmin",
    "created_at": "2025-05-25T05:49:50.130Z",
    "updated_at": "2025-07-07T23:08:55.948Z",
    "__v": 0,
    "last_login": "2025-07-07T23:08:55.947Z",
    "last_logout": "2025-07-07T23:06:40.741Z",
    "provider": "local"
  }
}
```

---

### 📧 Send OTP

**POST /api/v1/auth/send-otp** 🌐 _Public_

_Request Body:_

```json
{
  "email": "user@example.com"
}
```

_✅ Success Response:_

```json
{ "message": "OTP sent to your email." }
```

_❌ Error Response:_

```json
{ "message": "Email is required." }
```

---

### 🔒 Forgot Password

**POST /api/v1/auth/forgot-password** 🌐 _Public_

_Request Body:_

```json
{
  "email": "user@example.com"
}
```

_✅ Response:_

```json
{
  "message": "Password reset link sent to your email address"
}
```

---

### 🔄 Reset Password

**POST /api/v1/auth/reset-password/:token** 🌐 _Public_

_Request Body:_

```json
{
  "new_password": "newpassword123"
}
```

_✅ Response:_

```json
{
  "message": "Password reset successful"
}
```

---

### 🚪 Logout

**POST /api/v1/auth/logout** 🔒 _Requires Authentication_

_Headers:_ Cookie with token

_✅ Response:_

```json
{ "message": "Logged out successfully" }
```

---

### 👤 Get Current User

**GET /api/v1/auth/me** 🔒 _Requires Authentication_

_Headers:_ Cookie with token

_✅ Response:_

```json
{
  "_id": "6832af7e0466922553a3a87d",
  "name": "Suyash Pandey",
  "email": "suyashpandey310@gmail.com",
  "role": "superAdmin",
  "created_at": "2025-05-25T05:49:50.130Z",
  "updated_at": "2025-07-07T23:08:55.948Z",
  "__v": 0,
  "last_login": "2025-07-07T23:08:55.947Z",
  "last_logout": "2025-07-07T23:06:40.741Z",
  "provider": "local"
}
```

---

### 🔗 Google OAuth

**GET /api/v1/auth/google** 🌐 _Public_

> _Description:_ Redirects user to Google OAuth consent screen. No body required.

_Query Parameters:_ role=editor (optional - used to set a cookie for signup role)

---

### 🔗 Google OAuth Callback

**GET /api/v1/auth/google/callback** 🌐 _Public_

> _Description:_ Callback endpoint for Google OAuth. On success, authenticates user and redirects or responds with user info.

_✅ Success Response:_

```json
{
  "message": "Google login successful",
  "user": {
    "_id": "665f6e7b8c1b2a0012c3d4e5",
    "name": "Google User",
    "email": "googleuser@example.com",
    "role": "user"
  }
}
```

_❌ On Failure:_ Redirects to ${CLIENT_URL}/login?error=google_auth_failed

---

### 💼 LinkedIn OAuth

**GET /api/v1/auth/linkedin** 🌐 _Public_

> _Description:_ Redirects user to LinkedIn OAuth consent screen.

_Query Parameters:_ role=editor (optional - used to set a cookie for signup role)

---

### 💼 LinkedIn OAuth Callback

**GET /api/v1/auth/linkedin/callback** 🌐 _Public_

> _Description:_ Callback endpoint for LinkedIn OAuth. If the user already exists, they are logged in. If it's a new user and a signup_role cookie is set, the user is created.

_✅ Success:_

- Sets JWT token in an HttpOnly cookie
- Redirects to ${CLIENT_URL}/

_❌ Failure:_

- Redirects to ${CLIENT_URL}/login?error=linkedin_auth_failed

---

### 🛠 Update Admin Profile

**PUT /api/v1/auth/me/update** 🔒 _Requires Authentication_

_Request Body:_

```json
{
  "name": "Updated Name"
}
```

_✅ Response:_

```json
{
  "message": "Profile updated successfully",
  "admin": {
    "_id": "6832af7e0466922553a3a87d",
    "name": "Updated Name",
    "email": "admin@example.com",
    "role": "editor",
    "provider": "local",
    "created_at": "2025-05-25T05:49:50.130Z",
    "updated_at": "2025-07-10T14:00:00.000Z"
  }
}
```

---

### 📧 Request Email Change

**POST /api/v1/auth/change-email/request** 🔒 _Requires Authentication_

_Request Body:_

```json
{
  "new_email": "newadmin@example.com",
  "current_password": "oldpassword123"
}
```

_✅ Response:_

```json
{
  "message": "OTP sent to new email."
}
```

---

### ✅ Verify Email Change

**POST /api/v1/auth/change-email/verify** 🔒 _Requires Authentication_

_Request Body:_

```json
{
  "new_email": "newadmin@example.com",
  "otp": "123456"
}
```

_✅ Response:_

```json
{
  "message": "Email updated successfully.",
  "admin": {
    "_id": "6832af7e0466922553a3a87d",
    "name": "Admin Name",
    "email": "newadmin@example.com",
    "role": "editor",
    "provider": "local",
    "created_at": "2025-05-25T05:49:50.130Z",
    "updated_at": "2025-07-10T14:10:00.000Z"
  }
}
```

---

### 🔐 Change Password

**PUT /api/v1/auth/change-password** 🔒 _Requires Authentication_

_Request Body:_

```json
{
  "old_password": "oldpassword123",
  "new_password": "NewPassword@123"
}
```

_✅ Response:_

```json
{
  "message": "Password changed successfully."
}
```

---

### 🗑 Soft Delete Admin

**DELETE /api/v1/auth/\:id** 🔒👑 _Requires Authentication + Role_ (superAdmin)

_Params:_ id of admin (that is to be deleted by superAdmin)

_Request Body:_

```json
{
  "password": "adminpassword123"
}
```

_✅ Response:_

```json
{
  "message": "Admin marked for deletion. Will be permanently removed in 30 days if not reactivated."
}
```

---

### ✅ Check Authenticated User

**GET /api/v1/auth/check** 🔒 _Requires Authentication_

_✅ Response:_

```json
{
  "_id": "6832af7e0466922553a3a87d",
  "name": "Admin Name",
  "email": "admin@example.com",
  "role": "editor",
  "provider": "local",
  "created_at": "2025-05-25T05:49:50.130Z",
  "updated_at": "2025-07-10T14:00:00.000Z"
}
```

---

### 🧑‍💼 Update Admin Role

**PUT /api/v1/auth/admins/update-role/\:id** 🔒👑 _Requires Authentication + Role_ (superAdmin)

_Note:_ This Route can only be accessed by **superAdmin** to update role of other admins

_Request Body:_

```json
{
  "role": "newsletterAdmin"
}
```

_✅ Response:_

```json
{
  "message": "Role updated",
  "admin": {
    "_id": "6832af7e0466922553a3a87d",
    "name": "Admin Name",
    "email": "admin@example.com",
    "role": "newsletterAdmin"
  }
}
```

---

### 📋 Get All Admins

**GET /api/v1/auth/admins/all** 🔒👑 _Requires Authentication + Role_ (superAdmin)

_✅ Response:_

```json
{
  "message": "All admins fetched successfully",
  "admins": [
    {
      "_id": "6832af7e0466922553a3a87d",
      "name": "Admin Name",
      "email": "admin@example.com",
      "role": "superAdmin",
      "provider": "local",
      "created_at": "2025-05-25T05:49:50.130Z",
      "updated_at": "2025-07-10T14:00:00.000Z"
    }
  ]
}
```

## 📄 Content Management

> _Content Types:_ article | podcast | video | interview | webinar | news | insight | report | webcast

### 📋 Get All Content

**GET /api/v1/content/all** 🌐 _Public_ (Optional Authentication)

> _Note:_ Uses authOptionalMiddleware - authentication is optional but provides additional features if authenticated.

_Query Parameters:_
| Parameter | Default | Description |
|-----------|---------|-------------|
| page | 1 | Page number |
| limit | 10 | Items per page (max: 100) |
| content_type | optional | Filter by content type |
| sort | updated_at:desc | Sort format: field:asc\|desc |
| search | optional | Search in title, slug, body, ai_summary |

_✅ Response:_

```json
{
  "message": "Contents fetched successfully",
  "currentPage": 1,
  "totalPages": 5,
  "totalItems": 50,
  "contents": [
    {
      "_id": "6832df12f2164a53de4a898a",
      "title": "Leadership Insights from CXOs",
      "slug": "leadership-cxos-2025",
      "ai_summary": "Top executives share their leadership playbook for 2025.",
      "body": "In this episode, CXOs talk about balancing innovation and people...",
      "content_type": "podcast",
      "media_url": "https://youtu.be/iKLwzmjfcW4?feature=shared",
      "media_duration_sec": 1800,
      "banner_image_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1748164371/content_banners/en7whdok0hxqczxhh49i.png",
      "meta_description": "Podcast on executive leadership in modern business.",
      "meta_keywords": "leadership, CXO, podcast",
      "publish_date": "2025-05-25T10:13:19.323Z",
      "status": "published",
      "featured": false,
      "popular": true,
      "hero": false,
      "theme_ids": ["66501f00a1234567890abcde"],
      "sub_theme_ids": ["66501f00a1234567890abcde"],
      "industry_ids": ["66502f11b1234567890bcdef"],
      "exec_role_ids": ["66503f22c1234567890cdef0"],
      "contributors": [
        {
          "employment": {
            "company_name": "TCS",
            "job_position": "Innovator",
            "description": "Nothing",
            "company_logo_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1750340878/company_logos/clqxhkhezeffljlh2ziu.webp"
          },
          "contributor_id": "685405d3effd77915e72093c",
          "role": "Co-host",
          "name": "John Doe",
          "email": "john@example.com",
          "bio": "Tech strategist and keynote speaker.",
          "profile_image_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1750336977/contributors/lltpfcd5f1ecvz88mnfm.webp",
          "linkedin_url": "https://www.linkedin.com/in/john",
          "twitter_url": "https://twitter.com/john",
          "website_url": "https://john.com",
          "_id": "685417fbf7eba3a485474ab3"
        }
      ],
      "created_by": "6832af7e0466922553a3a87d",
      "created_at": "2025-05-25T09:12:50.849Z",
      "updated_at": "2025-05-25T10:25:42.283Z",
      "__v": 0,
      "updated_by": "6832af7e0466922553a3a87d"
    }
    // similar content objects
  ],
  "warning": "Limit capped to 100 items max per page." // optional
}
```

_❌ Error Response:_

```json
{ "message": "Invalid content_type. Allowed values: article, podcast, ..." }
```

---

### 🚩 Get Flagged Content

**GET /api/v1/content/flags/all** 🌐 _Public_

_✅ Response:_

```json
{
  "message": "Flagged content fetched successfully",
  "contents": [
    /* array of flagged content */
  ]
}
```

### 📖 Get Content by Slug

**GET /api/v1/content/slug/\:slug** 🌐 _Public_

> _Description:_ Fetch a single **published** content item using its unique slug (for clean, SEO-friendly URLs). Only `status: "published"` content is returned.

_Params:_

- `slug` (string) — Unique slug assigned to the content

_✅ Response:_

```json
{
  "message": "Content fetched successfully",
  "content": {
    "_id": "6832df12f2164a53de4a898a",
    "title": "Leadership Insights from CXOs",
    "slug": "leadership-cxos-2025",
    "ai_summary": "Top executives share their leadership playbook for 2025.",
    "body": "In this episode, CXOs talk about balancing innovation and people...",
    "content_type": "podcast",
    "media_url": "https://youtu.be/iKLwzmjfcW4?feature=shared",
    "media_duration_sec": 1800,
    "banner_image_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1748164371/content_banners/en7whdok0hxqczxhh49i.png",
    "meta_description": "Podcast on executive leadership in modern business.",
    "meta_keywords": "leadership, CXO, podcast",
    "publish_date": "2025-05-25T10:13:19.323Z",
    "status": "published",
    "featured": false,
    "popular": true,
    "hero": false,
    "theme_ids": ["66501f00a1234567890abcde"],
    "sub_theme_ids": ["66501f00a1234567890abcde"],
    "industry_ids": ["66502f11b1234567890bcdef"],
    "exec_role_ids": ["66503f22c1234567890cdef0"],
    "contributors": [
      {
        "employment": {
          "company_name": "TCS",
          "job_position": "Innovator",
          "description": "Nothing",
          "company_logo_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1750340878/company_logos/clqxhkhezeffljlh2ziu.webp"
        },
        "contributor_id": "685405d3effd77915e72093c",
        "role": "Co-host",
        "name": "John Doe",
        "email": "john@example.com",
        "bio": "Tech strategist and keynote speaker.",
        "profile_image_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1750336977/contributors/lltpfcd5f1ecvz88mnfm.webp",
        "linkedin_url": "https://www.linkedin.com/in/john",
        "twitter_url": "https://twitter.com/john",
        "website_url": "https://john.com",
        "_id": "685417fbf7eba3a485474ab3"
      }
    ],
    "created_by": "6832af7e0466922553a3a87d",
    "created_at": "2025-05-25T09:12:50.849Z",
    "updated_at": "2025-05-25T10:25:42.283Z",
    "__v": 0,
    "updated_by": "6832af7e0466922553a3a87d"
  }
}
```

_❌ Error Response:_

```json
{ "message": "Content not found" }
```

---

### 📖 Get Single Content (For admins)

**GET /api/v1/content/get/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_✅ Response:_

```json
{
  "message": "Content fetched successfully",
  "content": {
    //complete content details
  }
}
```

---

### ➕ Create Content

**POST /api/v1/content/create** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_Request Body:_

```json
{
  "title": "yseudtrklbkb",
  "slug": "hyrsdtufykgulhbkjeheheheh",
  "ai_summary": "hello",
  "body": "hahahaha",
  "content_type": "insight",
  "banner_image_base64": "data:image/png;base64,...", // base64 string
  "meta_description": "How renewable energy is reshaping the global power landscape.",
  "meta_keywords": "renewable, energy, solar, wind, environment",
  "publish_date": "2025-06-01T09:00:00.000Z",
  "status": "published",
  "featured": true,
  "popular": false,
  "hero": true,
  "theme_ids": ["66501f00a1234567890abcde"],
  "sub_theme_ids": ["66501f00a1234567890abcde"],
  "industry_ids": ["66502f11b1234567890bcdef"],
  "exec_role_ids": ["66503f22c1234567890cdef0"],
  "contributors": [
    { "contributor_id": "66503f22c1234567890cdef0", "role": "author" }
  ]
}
```

_✅ Response:_

```json
{
  "message": "Content created successfully",
  "content": {
    "title": "yseudtrklbkb",
    "slug": "hyrsdtufykgulhbkjeheheheh",
    "ai_summary": "hello",
    "body": "hahahaha",
    "content_type": "insight",
    "meta_description": "How renewable energy is reshaping the global power landscape.",
    "meta_keywords": "renewable, energy, solar, wind, environment",
    "publish_date": "2025-06-01T09:00:00.000Z",
    "status": "published",
    "featured": true,
    "popular": true,
    "hero": true,
    "theme_ids": ["66501f00a1234567890abcde"],
    "sub_theme_ids": ["66501f00a1234567890abcde"],
    "industry_ids": ["66502f11b1234567890bcdef"],
    "exec_role_ids": ["66503f22c1234567890cdef0"],
    "contributors": [
      {
        "employment": {
          "company_name": "TCS",
          "job_position": "Innovator",
          "description": "Nothing",
          "company_logo_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1750340878/company_logos/clqxhkhezeffljlh2ziu.webp"
        },
        "contributor_id": "685405d3effd77915e72093c",
        "role": "Co-host",
        "name": "John Doe",
        "email": "john@example.com",
        "bio": "Tech strategist and keynote speaker.",
        "profile_image_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1750336977/contributors/lltpfcd5f1ecvz88mnfm.webp",
        "linkedin_url": "https://www.linkedin.com/in/john",
        "twitter_url": "https://twitter.com/john",
        "website_url": "https://john.com",
        "_id": "685417fbf7eba3a485474ab3"
      }
    ],
    "created_by": "6832af7e0466922553a3a87d",
    "created_at": "2025-05-25T09:34:34.317Z",
    "updated_at": "2025-05-25T09:34:34.317Z",
    "_id": "6832e42aa1430e21f0923e7f",
    "__v": 0
  }
}
```

---

### ✏ Update Content

**PATCH /api/v1/content/update/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_Request Body:_ (Same as create, only fields to update)

```json
{
  "title": "Doing something to display mock title..." // only title gets updated
}
```

_✅ Response:_

```json
{
  "message": "Content updated successfully",
  "content": {
    "_id": "6832df12f2164a53de4a898a",
    "title": "Doing something to display mock title...",
    "slug": "leadership-cxos-2025",
    "ai_summary": "Top executives share their leadership playbook for 2025.",
    "body": "In this episode, CXOs talk about balancing innovation and people...",
    "content_type": "podcast",
    "media_url": "https://youtu.be/iKLwzmjfcW4?feature=shared",
    "media_duration_sec": 1800,
    "banner_image_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1748164371/content_banners/en7whdok0hxqczxhh49i.png",
    "meta_description": "Podcast on executive leadership in modern business.",
    "meta_keywords": "leadership, CXO, podcast",
    "publish_date": "2025-05-25T10:13:19.323Z",
    "status": "published",
    "featured": false,
    "popular": true,
    "hero": false,
    "theme_ids": ["66501f00a1234567890abcde"],
    "sub_theme_ids": ["66501f00a1234567890abcde"],
    "industry_ids": ["66502f11b1234567890bcdef"],
    "exec_role_ids": ["66503f22c1234567890cdef0"],
    "contributors": [
      {
        //contributor details(all)
      }
    ],
    "created_by": "6832af7e0466922553a3a87d",
    "created_at": "2025-05-25T09:12:50.849Z",
    "updated_at": "2025-05-25T16:10:20.535Z",
    "__v": 0,
    "updated_by": "6832af8f90cabe9ec0da46a3"
  }
}
```

---

### 🗑 Delete Content

**DELETE /api/v1/content/delete/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_✅ Response:_

```json
{ "message": "Content deleted successfully" }
```

---

### 🚀 Publish Content

**PATCH /api/v1/content/publish/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_✅ Response:_

```json
{
  "message": "Content published successfully",
  "content": {
    "id": "6832df12f2164a53de4a898a",
    "title": "Leadership Insights from CXOs",
    "status": "published",
    "publish_date": "2025-05-25T10:13:19.323Z"
  }
}
```

---

### 🔄 Toggle Content Flags

**PATCH /api/v1/content/:id/toggle/:flag** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_Available Flags:_ featured | popular | hero

_✅ Response:_

```json
{
  "message": "Toggled featured for content id: 665f6e7b8c1b2a0012c3d4e5",
  "featured": true
}
```

---

### ➕ Add Contributor to Content

**POST /api/v1/content/add/:contentId/contributors** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Request Body:_

```json
{
  "contributor_id": "66503f22c1234567890cdef0",
  "role": "author"
}
```

_✅ Response:_

```json
{
  "message": "Contributor added to content",
  "contributor": {
    //contributor details
  }
}
```

---

### ✏ Update Contributor in Content

**PATCH /api/v1/content/update/:contentId/contributors/:contributorSubId** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Request Body:_ (fields to update for the contributor in this content only)

```json
{
  "role": "Editor",
  "name": "Updated Name",
  "profile_image_base64": "data:image/png;base64,...",
  "employment": {
    "company_name": "New Company",
    "job_position": "Lead",
    "company_logo_base64": "data:image/png;base64,..."
  }
}
```

_✅ Response:_

```json
{
  "message": "Contributor updated in content",
  "contributor": {
    //updated contributor details
  }
}
```

---

### 🗑 Remove Contributor from Content

**DELETE /api/v1/content/delete/:contentId/contributors/:contributorSubId** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_✅ Response:_

```json
{
  "message": "Contributor removed from content"
}
```

---

## 📧 Newsletter Management

### ➕ Add New Subscriber

**POST /api/v1/newsletter/subscribe** 🌐 _Public_

_Request Body:_

```json
{
  "email": "subscriber@example.com",
  "name": "Suyash Pandey"
}
```

_✅ Response:_

```json
{
  "message": "Subscriber added successfully."
  //subscriber details
}
```

---

## 🏷 Tag Management

> **All tag endpoints require authentication and superAdmin or editor role.**

### 🎯 Themes

**GET /api/v1/tags/themes/all** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_✅ Response:_

```json
{
  "message": "All Theme fetched successfully",
  "themes": [
    {
      "_id": "6832c3716ef334374315ef68",
      "name": "Leadership",
      "description": "Leadership topics",
      "created_at": "2025-05-25T07:14:57.140Z",
      "updated_at": "2025-05-25T17:05:35.568Z",
      "__v": 0
    }
  ]
}
```

---

**POST /api/v1/tags/themes/new** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_Request Body:_

```json
{
  "name": "Leadership",
  "description": "Leadership topics"
}
```

_✅ Response:_

```json
{
  "message": "Theme created successfully",
  "item": {
    "_id": "6832c3716ef334374315ef68",
    "name": "Leadership",
    "description": "Leadership topics",
    "created_at": "2025-05-25T07:14:57.140Z",
    "updated_at": "2025-05-25T17:05:35.568Z",
    "__v": 0
  }
}
```

---

**PUT /api/v1/tags/themes/update/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_Request Body:_

```json
{
  "name": "Updated Leadership",
  "description": "Updated leadership topics"
}
```

_✅ Response:_

```json
{
  "message": "Theme updated successfully",
  "item": {
    "_id": "6832c3716ef334374315ef68",
    "name": "Updated Leadership",
    "description": "Updated leadership topics",
    "created_at": "2025-05-25T07:14:57.140Z",
    "updated_at": "2025-05-25T17:05:35.568Z",
    "__v": 0
  }
}
```

---

**DELETE /api/v1/tags/themes/delete/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_✅ Response:_

```json
{
  "message": "Theme deleted successfully"
}
```

---

### 🧩 SubThemes

**GET /api/v1/tags/sub-themes/all** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_✅ Response:_

```json
{
  "message": "All SubTheme fetched successfully",
  "themes": [
    {
      "_id": "6832c3716ef334374315ef68",
      "name": "Leadership",
      "description": "Leadership topics",
      "created_at": "2025-05-25T07:14:57.140Z",
      "updated_at": "2025-05-25T17:05:35.568Z",
      "__v": 0
    }
  ]
}
```

---

**POST /api/v1/tags/sub-themes/new** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_Request Body:_

```json
{
  "name": "Leadership",
  "description": "Leadership topics"
}
```

_✅ Response:_

```json
{
  "message": "SubTheme created successfully",
  "item": {
    "_id": "6832c3716ef334374315ef68",
    "name": "Leadership",
    "description": "Leadership topics",
    "created_at": "2025-05-25T07:14:57.140Z",
    "updated_at": "2025-05-25T17:05:35.568Z",
    "__v": 0
  }
}
```

---

**PUT /api/v1/tags/sub-themes/update/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_Request Body:_

```json
{
  "name": "Updated Leadership",
  "description": "Updated leadership topics"
}
```

_✅ Response:_

```json
{
  "message": "SubTheme updated successfully",
  "item": {
    "_id": "6832c3716ef334374315ef68",
    "name": "Updated Leadership",
    "description": "Updated leadership topics",
    "created_at": "2025-05-25T07:14:57.140Z",
    "updated_at": "2025-05-25T17:05:35.568Z",
    "__v": 0
  }
}
```

---

**DELETE /api/v1/tags/sub-themes/delete/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_✅ Response:_

```json
{
  "message": "SubTheme deleted successfully"
}
```

---

### 🏭 Industries

**GET /api/v1/tags/industries/all** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_✅ Response:_

```json
{
  "message": "Industries fetched successfully",
  "industries": [
    {
      "_id": "6832c3716ef334374315ef68",
      "name": "Finance",
      "description": "Finance industry",
      "created_at": "2025-05-25T07:14:57.140Z",
      "updated_at": "2025-05-25T17:05:35.568Z",
      "__v": 0
    }
  ]
}
```

---

**POST /api/v1/tags/industries/new** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_Request Body:_

```json
{
  "name": "Finance",
  "description": "Finance industry"
}
```

---

**PUT /api/v1/tags/industries/update/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_Request Body:_

```json
{
  "name": "Updated Finance",
  "description": "Updated finance industry"
}
```

---

**DELETE /api/v1/tags/industries/delete/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_✅ Response:_

```json
{
  "message": "Industry deleted successfully"
}
```

---

### 👔 Executive Roles

**GET /api/v1/tags/roles/all** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_✅ Response:_

```json
{
  "message": "Executive roles fetched successfully",
  "roles": [
    {
      "_id": "6832c3716ef334374315ef68",
      "name": "CEO",
      "description": "Chief Executive Officer",
      "created_at": "2025-05-25T07:14:57.140Z",
      "updated_at": "2025-05-25T17:05:35.568Z",
      "__v": 0
    }
  ]
}
```

---

**POST /api/v1/tags/roles/new** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_Request Body:_

```json
{
  "name": "CEO",
  "description": "Chief Executive Officer"
}
```

---

**PUT /api/v1/tags/roles/update/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_Request Body:_

```json
{
  "name": "Updated CEO",
  "description": "Updated Chief Executive Officer"
}
```

---

**DELETE /api/v1/tags/roles/delete/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_Headers:_ Cookie with token

_✅ Response:_

```json
{
  "message": "Executive role deleted successfully"
}
```

---

## 👥 Contributor Management

> All endpoints require authentication and roles: `superAdmin` or `editor`

### 📋 Get All Contributors

**GET /api/v1/contributors/all** 🔒👑 _Requires Authentication + Role_

_✅ Response:_

```json
{
  "message": "Contributors fetched successfully",
  "contributors": [
    {
      "_id": "68600824e941a93240537545",
      "name": "Hohohohoho",
      "email": "hohohoo.doe@example.com",
      "bio": "Tech speaker and open-source enthusiast.",
      "profile_image_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1751124004/contributors/pho4gjgdvtbdddji6ilp.webp",
      "linkedin_url": "https://www.linkedin.com/in/janedoe",
      "twitter_url": "https://twitter.com/janedoe",
      "website_url": "https://janedoe.dev",
      "current_employment": {
        "company_name": "TechCorp Inc.",
        "job_position": "Senior Engineer",
        "company_logo_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1751124005/company_logos/xthkisegg3az5kpz8ij1.webp",
        "description": "Working on AI infrastructure."
      },
      "created_by": "6832af7e0466922553a3a87d",
      "created_at": "2025-06-28T15:20:04.184Z",
      "updated_at": "2025-06-28T15:20:04.184Z",
      "__v": 0
    }
    //similar other docs
  ]
}
```

---

### 👤 Get Contributor by ID

**GET /api/v1/contributors/\:id** 🔒👑 _Requires Authentication + Role_

_✅ Response:_

```json
{
  "message": "Contributor fetched successfully",
  "contributor": {
    "_id": "68600824e941a93240537545",
    "name": "Hohohohoho",
    "email": "hohohoo.doe@example.com",
    "bio": "Tech speaker and open-source enthusiast.",
    "profile_image_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1751124004/contributors/pho4gjgdvtbdddji6ilp.webp",
    "linkedin_url": "https://www.linkedin.com/in/janedoe",
    "twitter_url": "https://twitter.com/janedoe",
    "website_url": "https://janedoe.dev",
    "current_employment": {
      "company_name": "TechCorp Inc.",
      "job_position": "Senior Engineer",
      "company_logo_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1751124005/company_logos/xthkisegg3az5kpz8ij1.webp",
      "description": "Working on AI infrastructure."
    },
    "created_by": "6832af7e0466922553a3a87d",
    "created_at": "2025-06-28T15:20:04.184Z",
    "updated_at": "2025-06-28T15:20:04.184Z",
    "__v": 0
  }
}
```

---

### ➕ Create Contributor

**POST /api/v1/contributors/new** 🔒👑 _Requires Authentication + Role_

_Request Body:_

```json
{
  "name": "Maria Garcia",
  "email": "maria.garcia@webcrafters.io",
  "bio": "Full-stack engineer and open-source enthusiast with over 8 years of experience in the tech industry. Co-founder of WebCrafters Inc.",
  "profile_image_base64": "[BASE64 DATA]",
  "linkedin_url": "https://linkedin.com/in/mariagarciadev",
  "twitter_url": "https://twitter.com/mgarciatweets",
  "website_url": "https://mariagarcia.io",
  "current_employment": {
    "company_name": "WebCrafters Inc.",
    "job_position": "Lead Software Engineer",
    "company_logo_base64": "[BASE64 DATA]",
    "description": "Leading the core product development team and mentoring junior developers."
  }
}
```

_✅ Response:_

```json
{
  "message": "Contributor created",
  "contributor": {
    //all contributor details
  }
}
```

---

### ✏ Update Contributor

**PATCH /api/v1/contributors/update/\:id** 🔒👑 _Requires Authentication + Role_

_Request Body:_ (only fields to update)

```json
{
  "bio": "Senior Developer at Goldman Sachs",
  "profile_image_base64": "data:image/png;base64,..."
}
```

_✅ Response:_

```json
{
  "message": "Contributor updated",
  "updated": {
    //contributor details
  }
}
```

---

### 🗑 Delete Contributor

**DELETE /api/v1/contributors/delete/\:id** 🔒👑 _Requires Authentication + Role_

> Also deletes all employment records and the contributor's Cloudinary image.

_✅ Response:_

```json
{ "message": "Contributor removed successfully" }
```

---

## ⚠ Error Responses

All endpoints return errors in the following format:

```json
{ "message": "Error message here" }
```

---

## 🔒 Authentication & Authorization

### Authentication Types

| Icon | Type                             | Description                              |
| ---- | -------------------------------- | ---------------------------------------- |
| 🌐   | _Public_                         | No authentication required               |
| 🔒   | _Authentication Required_        | Valid JWT token in cookie required       |
| 🔒👑 | _Authentication + Role Required_ | Valid JWT token + specific role required |

### Authentication Method

Most endpoints require a valid JWT token stored in an HttpOnly cookie named token.

### Role-Based Access Control

| Role              | Permissions                                               |
| ----------------- | --------------------------------------------------------- |
| _superAdmin_      | Full access to all endpoints                              |
| _editor_          | Content creation, editing, publishing, and tag management |
| _newsletterAdmin_ | Newsletter management and subscriber operations           |
| _eventAdmin_      | Event management (if implemented)                         |
| _user_            | Limited read access to public endpoints                   |

### Middleware Chain

Routes use middleware in this order:

1. _authMiddleware_ - Validates JWT token and populates req.user
2. _authOptionalMiddleware_ - Optional authentication for public endpoints with enhanced features
3. _roleMiddleware(roles)_ - Checks if authenticated user has required role

---

## 📝 Important Notes

- All _POST/PUT/PATCH_ endpoints expect Content-Type: application/json
- All endpoints return _JSON_ unless otherwise noted (CSV export)
- Maximum limit for pagination is _100 items per page_
- Base64 images are supported for content banner uploads
- OAuth integration available for Google and LinkedIn
- JWT tokens are stored in HttpOnly cookies for security
- Rate limiting may apply to prevent abuse

---

## 🛠 Technical Specifications

- _Framework:_ Express.js
- _Authentication:_ JWT with HttpOnly cookies
- _Authorization:_ Role-based access control
- _File Upload:_ Base64 encoding for images
- _Database:_ MongoDB
- _Image Storage:_ Cloudinary integration
- _OAuth Providers:_ Google, LinkedIn

---

## 🚀 Quick Reference

### Public Endpoints (No Auth Required)

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/send-otp
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/reset-password/:token
- GET /api/v1/auth/google
- GET /api/v1/auth/google/callback
- GET /api/v1/auth/linkedin
- GET /api/v1/auth/linkedin/callback
- GET /api/v1/content/all (optional auth)
- GET /api/v1/content/slug/:slug
- GET /api/v1/content/flags/all
- POST /api/v1/newsletter/subscribe

### Authentication Required

- POST /api/v1/auth/logout
- GET /api/v1/auth/me
- PUT /api/v1/auth/me/update
- POST /api/v1/auth/change-email/request
- POST /api/v1/auth/change-email/verify
- PUT /api/v1/auth/change-password
- GET /api/v1/auth/check

### Role-Based Endpoints (superAdmin/editor)

- DELETE /api/v1/auth/:id
- PUT /api/v1/auth/admins/update-role/:id
- GET /api/v1/auth/admins/all
- GET /api/v1/content/get/:id
- POST /api/v1/content/create
- PATCH /api/v1/content/update/:id
- DELETE /api/v1/content/delete/:id
- PATCH /api/v1/content/publish/:id
- PATCH /api/v1/content/:id/toggle/:flag
- POST /api/v1/content/add/:contentId/contributors
- PATCH /api/v1/content/update/:contentId/contributors/:contributorSubId
- DELETE /api/v1/content/delete/:contentId/contributors/:contributorSubId
- GET /api/v1/tags/themes/all
- POST /api/v1/tags/themes/new
- PUT /api/v1/tags/themes/update/:id
- DELETE /api/v1/tags/themes/delete/:id
- GET /api/v1/tags/sub-themes/all
- POST /api/v1/tags/sub-themes/new
- PUT /api/v1/tags/sub-themes/update/:id
- DELETE /api/v1/tags/sub-themes/delete/:id
- GET /api/v1/tags/industries/all
- POST /api/v1/tags/industries/new
- PUT /api/v1/tags/industries/update/:id
- DELETE /api/v1/tags/industries/delete/:id
- GET /api/v1/tags/roles/all
- POST /api/v1/tags/roles/new
- PUT /api/v1/tags/roles/update/:id
- DELETE /api/v1/tags/roles/delete/:id
- GET /api/v1/contributors/all
- GET /api/v1/contributors/:id
- POST /api/v1/contributors/new
- PATCH /api/v1/contributors/update/:id
- DELETE /api/v1/contributors/delete/:id

---

## 📚 Usage Examples

### Authentication Flow

```javascript
// Register new user
fetch("/api/v1/auth/send-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "user@example.com" }),
});

// Register with OTP
fetch("/api/v1/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "John Doe",
    email: "user@example.com",
    password: "password123",
    otp: "123456",
    role: "editor",
  }),
});

// Login
fetch("/api/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "password123",
  }),
});
```

### Content Management

```javascript
// Create new article
fetch("/api/v1/content/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include", // Include cookies
  body: JSON.stringify({
    title: "AI in Executive Leadership",
    slug: "ai-executive-leadership-2025",
    content_type: "article",
    body: "Article content here...",
    status: "published",
    featured: true,
  }),
});

// Get paginated content
fetch(
  "/api/v1/content/all?page=1&limit=20&content_type=article&search=leadership"
);

// Toggle content flag
fetch("/api/v1/content/123/toggle/featured", {
  method: "PATCH",
  credentials: "include",
});
```

### Newsletter Management

```javascript
// Add subscriber
fetch("/api/v1/newsletter/subscribers/new", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "subscriber@example.com" }),
});

// Create newsletter issue
fetch("/api/v1/newsletter/issue/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    title: "Weekly Executive Digest",
    scheduled_for: "2025-06-10T10:00:00.000Z",
    content_blocks: [
      {
        content_id: "123",
        category: "Featured Articles",
        link: "https://example.com/article",
      },
    ],
  }),
});
```

---

## 🚦 Status Codes

| Code | Status                | Description                   |
| ---- | --------------------- | ----------------------------- |
| 200  | OK                    | Request successful            |
| 201  | Created               | Resource created successfully |
| 400  | Bad Request           | Invalid request data          |
| 401  | Unauthorized          | Authentication required       |
| 403  | Forbidden             | Insufficient permissions      |
| 404  | Not Found             | Resource not found            |
| 409  | Conflict              | Resource already exists       |
| 422  | Unprocessable Entity  | Validation error              |
| 500  | Internal Server Error | Server error                  |

---

## 🛡 Security Features

- **JWT Authentication** with HttpOnly cookies
- **Role-based Authorization** (RBAC)
- **Password Hashing** with bcrypt
- **Input Validation** and sanitization
- **CORS Protection** configured
- **OAuth Integration** for secure third-party login

---

### Content Flags

- **Featured** 🌟 - Highlighted content on homepage
- **Popular** 🔥 - Trending/popular content section
- **Hero** 🎯 - Main banner/hero section content

---

## 📈 API Response Patterns

### Success Response Format

```json
{
  "message": "Operation successful",
  "data": {
    /* response data */
  },
  "meta": {
    /* pagination, counts, etc */
  }
}
```

### Error Response Format

```json
{
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": {
    /* additional error details */
  }
}
```

### Pagination Response

```json
{
  "message": "Data fetched successfully",
  "currentPage": 1,
  "totalPages": 10,
  "totalItems": 100,
  "contents": [
    /* array of items */
  ]
}
```

---

## 📞 Support & Contact

For API support and documentation updates, please contact [Suyash Pandey](mailto:suyash@exec-stream.com).

**API Version:** v1  
**Last Updated:** June 2025  
**Documentation Status:** ✅ Complete
