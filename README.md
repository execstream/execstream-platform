# 🚀 ExecStream Backend API

This README provides comprehensive documentation for the Executive Stream backend API, including all available routes, request/response formats, role-based access control, and data models related to content publishing, contributor management, tag handling, and newsletter operations.

> _Default API running on:_ http://localhost:5000

## 🚏 Base API Routes

| Path                   | Description                                |
| ---------------------- | ------------------------------------------ |
| `/api/v1/auth`         | Authentication (login, register)           |
| `/api/v1/content`      | Content management (CRUD, publish)         |
| `/api/v1/newsletter`   | Newsletter subscriptions & actions         |
| `/api/v1/tags`         | Tag management (themes, industries, roles) |
| `/api/v1/contributors` | Contributor profiles & employment          |

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
  "user": {
    "id": "6832af8f90cabe9ec0da46a3",
    "name": "Robin",
    "email": "suyashpandey607@gmail.com",
    "role": "editor"
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
  "user": {
    "_id": "665f6e7b8c1b2a0012c3d4e5",
    "name": "New User",
    "email": "newuser@example.com",
    "role": "user"
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
  "updated_at": "2025-05-25T05:49:50.130Z",
  "__v": 0,
  "last_login": "2025-05-25T15:53:06.467Z",
  "last_logout": "2025-05-25T07:31:27.773Z"
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
      "industry_ids": ["66502f11b1234567890bcdef"],
      "exec_role_ids": ["66503f22c1234567890cdef0"],
      "contributors": [
        { "contributor_id": "66503f22c1234567890cdef0", "role": "author" }
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

---

### 📖 Get Single Content

**GET /api/v1/content/get/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, editor)

_✅ Response:_

```json
{
  "message": "Content fetched successfully",
  "content": {
    "_id": "684b88e2e249bf3744eb291b",
    "title": "The Future of AI in Enterprise",
    "slug": "future-of-ai-enterprise",
    "ai_summary": "A deep dive into how AI is reshaping enterprise software and operations.",
    "body": "<p>AI is transforming the way enterprises operate, from automation to decision-making.</p>",
    "content_type": "article",
    "media_url": "https://cdn.example.com/videos/future-ai.mp4",
    "pdf_url": "https://cdn.example.com/docs/future-ai-report.pdf",
    "media_duration_sec": 540,
    "banner_image_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1749780706/content_banners/xds4waeycaoopgecgmic.webp",
    "meta_description": "Explore the rise of AI in enterprise settings and what the future holds.",
    "meta_keywords": "AI, enterprise, technology, future",
    "publish_date": "2030-06-20T00:00:00.000Z",
    "status": "scheduled",
    "featured": true,
    "popular": false,
    "hero": false,
    "theme_ids": ["6846c0c84302387c99fb9aee", "6846c1fbf16c092538b91022"],
    "industry_ids": ["6846c2524e4a35ce8412e261"],
    "exec_role_ids": ["6846c29d4e4a35ce8412e26d"],
    "contributors": [
      {
        "_id": "684b6de42d2379409ade7074",
        "name": "Suyash",
        "bio": "Full Stack Developer and open-source enthusiast. Not really right? maybe idk",
        "photo_url": "https://res.cloudinary.com/dsqiyp8pf/image/upload/v1749777538/contributors/xoekjloh9bzqyhmqbbrx.jpg",
        "created_at": "2025-06-13T00:16:36.962Z",
        "updated_at": "2025-06-13T01:18:50.818Z",
        "__v": 0,
        "role": "Author",
        "employment": {
          "_id": "684b72454d683cb7304e83bb",
          "contributor_id": "684b6de42d2379409ade7074",
          "company": "Goldman Sachs",
          "job_title": "SDE-3",
          "start_date": "2029-05-25T00:00:00.000Z",
          "end_date": "2032-11-20T00:00:00.000Z",
          "createdAt": "2025-06-13T00:35:17.463Z",
          "updatedAt": "2025-06-13T00:35:17.463Z",
          "__v": 0
        }
      }
    ],
    "created_by": "6832af7e0466922553a3a87d",
    "updated_by": "6832af7e0466922553a3a87d",
    "created_at": "2025-06-13T02:11:46.436Z",
    "updated_at": "2025-06-13T02:18:35.110Z",
    "__v": 0
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
    "industry_ids": ["66502f11b1234567890bcdef"],
    "exec_role_ids": ["66503f22c1234567890cdef0"],
    "contributors": [
      {
        "contributor_id": "66503f22c1234567890cdef0",
        "role": "author",
        "_id": "12303f22c16474567890cdef0"
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
    "industry_ids": ["66502f11b1234567890bcdef"],
    "exec_role_ids": ["66503f22c1234567890cdef0"],
    "contributors": [
      {
        "contributor_id": "66503f22c1234567890cdef0",
        "role": "host",
        "_id": "12303f22c16474567890cdef0"
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

## 📧 Newsletter Management

### ➕ Add New Subscriber

**POST /api/v1/newsletter/subscribers/new** 🌐 _Public_

_Request Body:_

```json
{ "email": "subscriber@example.com" }
```

_✅ Response:_

```json
{
  "message": "Subscriber added successfully.",
  "newSubscriber": {
    "email": "suyash123@gmail.com",
    "unsubscribed": false,
    "unsubscribed_at": null,
    "_id": "683342a60a3f53b9a9ce1d15",
    "subscribed_at": "2025-05-25T16:17:42.715Z",
    "__v": 0
  }
}
```

---

### 🚫 Unsubscribe User

**PUT /api/v1/newsletter/subscribers/:id/unsubscribe** 🌐 _Public_

_✅ Response:_

```json
{
"message": "Successfully unsubscribed.",
"subscriber": {
/_ updated subscriber object _/
}
}
```

---

### 📊 Get All Subscribers

**GET /api/v1/newsletter/subscribers/all** 🔒👑 _Requires Authentication + Role_ (superAdmin, newsletterAdmin)

_Headers:_ Cookie with token

_✅ Response:_

```json
[
  {
    "_id": "6832bf47fa3bccfcd142524b",
    "email": "better.than.you893@gmail.com",
    "unsubscribed": false,
    "unsubscribed_at": "2025-05-25T06:59:52.018Z",
    "subscribed_at": "2025-05-25T06:57:11.270Z",
    "__v": 0
  }
]
```

---

### 🗑 Remove Subscriber

**DELETE /api/v1/newsletter/subscribers/remove/:id** 🔒👑 _Requires Authentication + Role_ (superAdmin, newsletterAdmin)

_Headers:_ Cookie with token

_✅ Response:_

```json
{ "message": "Subscriber removed successfully." }
```

---

### 📥 Export Subscribers

**GET /api/v1/newsletter/subscribers/export** 🔒👑 _Requires Authentication + Role_ (superAdmin, newsletterAdmin)

_Headers:_ Cookie with token

_✅ Response:_ CSV file download of all subscribers.

---

### 📰 Create Newsletter Issue

**POST /api/v1/newsletter/issue/create** 🔒👑 _Requires Authentication + Role_ (superAdmin, newsletterAdmin)

_Headers:_ Cookie with token

> _Note:_ related_content_title and related_content_link are optional fields for a content block. Either both of them will exist or none of them simultaneously.

_Request Body:_

```json
{
  "title": "Weekly Digest",
  "scheduled_for": "2025-06-10T10:00:00.000Z",
  "content_blocks": [
    {
      "content_id": "683aec793feed4e58e433437",
      "category": "Top Articles Of The Week",
      "link": "https://example.com/article/big-tech-regulation",
      "related_content_title": "The Rise of Big Tech Overlords",
      "related_content_link": "https://example.com/article/tech-overlords",
      "_id": "683b1772d3ab41f40cb44b35"
    },
    {
      "content_id": "683aec793feed4e58e433437",
      "category": "Top Articles Of The Week",
      "link": "https://example.com/article/big-tech-regulation",
      "_id": "683b1772d3ab41f40cb44b35"
    }
    // similar other blocks
  ]
}
```

_✅ Response:_

```json
{
  "message": "Newsletter issue created",
  "issue": {
    "_id": "665f6e7b8c1b2a0012c3d4e5",
    "title": "Weekly Digest",
    "scheduled_for": "2025-06-10T10:00:00.000Z",
    "content_blocks": [
      {
        "content_id": "683aec793feed4e58e433437",
        "category": "Top Articles Of The Week",
        "link": "https://example.com/article/big-tech-regulation",
        "related_content_title": "The Rise of Big Tech Overlords",
        "related_content_link": "https://example.com/article/tech-overlords",
        "_id": "683b1772d3ab41f40cb44b35"
      }
      // similar other blocks
    ],
    "sent": false
  }
}
```

---

### 📬 Get All Newsletter Issues

**GET /api/v1/newsletter/issue/all** 🔒👑 _Requires Authentication + Role_ (superAdmin, newsletterAdmin)

_Headers:_ Cookie with token

_✅ Response:_

```json
{
  "message": "All weekly newsletters fetched successfully",
  "issues": [
    {
      "_id": "665f6e7b8c1b2a0012c3d4e5",
      "title": "Weekly Digest",
      "scheduled_for": "2025-06-10T10:00:00.000Z",
      "content_blocks": [
        {
          "content_id": "683aec793feed4e58e433437",
          "category": "Top Articles Of The Week",
          "link": "https://example.com/article/big-tech-regulation",
          "related_content_title": "The Rise of Big Tech Overlords",
          "related_content_link": "https://example.com/article/tech-overlords",
          "_id": "683b1772d3ab41f40cb44b35"
        }
        // similar other blocks
      ],
      "sent": false
    }
  ]
}
```

---

### 🧪 Send Test Newsletter

**POST /api/v1/newsletter/test-newsletter** 🔒👑 _Requires Authentication + Role_ (superAdmin, newsletterAdmin)

_Headers:_ Cookie with token

> _Description:_ Triggers sending of the weekly newsletter (for testing).

_✅ Response:_

```json
{ "message": "Test newsletter sent" }
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
  "message": "Themes fetched successfully",
  "themes": [
    {
      "_id": "6832c3716ef334374315ef68",
      "name": "Leadership",
      "description": "Leadership topics",
      "createdAt": "2025-05-25T07:14:57.140Z",
      "updatedAt": "2025-05-25T17:05:35.568Z",
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
    "createdAt": "2025-05-25T07:14:57.140Z",
    "updatedAt": "2025-05-25T17:05:35.568Z",
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
    "createdAt": "2025-05-25T07:14:57.140Z",
    "updatedAt": "2025-05-25T17:05:35.568Z",
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
      "createdAt": "2025-05-25T07:14:57.140Z",
      "updatedAt": "2025-05-25T17:05:35.568Z",
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
      "createdAt": "2025-05-25T07:14:57.140Z",
      "updatedAt": "2025-05-25T17:05:35.568Z",
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
  "message": "Fetched all contributors successfully",
  "contributors": [
    {
      "_id": "684b6de42d2379409ade7074",
      "name": "Suyash",
      "bio": "Full Stack Developer",
      "photo_url": "https://res.cloudinary.com/.../contributors/someimage.jpg",
      "created_at": "2025-06-13T00:16:36.962Z",
      "updated_at": "2025-06-13T01:18:50.818Z",
      "__v": 0
    }
  ]
}
```

---

### 👤 Get Contributor by ID

**GET /api/v1/contributors/\:id** 🔒👑 _Requires Authentication + Role_

_✅ Response:_

```json
{
  "message": "Fetched required Contributor",
  "contributor": {
    "_id": "684b6de42d2379409ade7074",
    "name": "Suyash",
    "bio": "Full Stack Developer",
    "photo_url": "https://res.cloudinary.com/.../contributors/someimage.jpg",
    "created_at": "2025-06-13T00:16:36.962Z",
    "updated_at": "2025-06-13T01:18:50.818Z"
  }
}
```

---

### ➕ Create Contributor

**POST /api/v1/contributors/new** 🔒👑 _Requires Authentication + Role_

_Request Body:_

```json
{
  "name": "Suyash",
  "bio": "Full Stack Developer and Open Source Enthusiast",
  "photo_base64": "data:image/png;base64,..."
}
```

_✅ Response:_

```json
{
  "message": "Contributor created",
  "contributor": {
    "_id": "684b6de42d2379409ade7074",
    "name": "Suyash",
    "bio": "Full Stack Developer and Open Source Enthusiast",
    "photo_url": "https://res.cloudinary.com/.../contributors/someimage.jpg",
    "created_at": "2025-06-13T00:16:36.962Z",
    "updated_at": "2025-06-13T01:18:50.818Z"
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
  "photo_base64": "data:image/png;base64,..."
}
```

_✅ Response:_

```json
{
  "message": "Contributor updated",
  "updated": {
    "_id": "684b6de42d2379409ade7074",
    "name": "Suyash",
    "bio": "Senior Developer at Goldman Sachs",
    "photo_url": "https://res.cloudinary.com/.../contributors/updated.jpg",
    "created_at": "2025-06-13T00:16:36.962Z",
    "updated_at": "2025-06-13T02:00:10.123Z"
  }
}
```

---

### 🗑 Delete Contributor

**DELETE /api/v1/contributors/delete/\:id** 🔒👑 _Requires Authentication + Role_

> Also deletes all employment records and the contributor's Cloudinary image.

_✅ Response:_

```json
{ "message": "Contributor and related employment removed" }
```

---

## 🧾 Contributor Employment Management

### 📄 Get Contributor Employment History

**GET /api/v1/contributors/\:id/employment** 🔒👑 _Requires Authentication + Role_

_✅ Response:_

```json
{
  "message": "Found employment records",
  "employment": [
    {
      "_id": "684b72454d683cb7304e83bb",
      "contributor_id": "684b6de42d2379409ade7074",
      "company": "Goldman Sachs",
      "job_title": "SDE-3",
      "start_date": "2029-05-25T00:00:00.000Z",
      "end_date": "2032-11-20T00:00:00.000Z"
    }
  ]
}
```

---

### ➕ Add Employment Record

**POST /api/v1/contributors/\:id/employment/new** 🔒👑 _Requires Authentication + Role_

_Request Body:_

```json
{
  "company": "Goldman Sachs",
  "job_title": "SDE-3",
  "start_date": "2029-05-25",
  "end_date": "2032-11-20"
}
```

_✅ Response:_

```json
{
  "message": "Employment added",
  "employment": {
    "_id": "684b72454d683cb7304e83bb",
    "contributor_id": "684b6de42d2379409ade7074",
    "company": "Goldman Sachs",
    "job_title": "SDE-3",
    "start_date": "2029-05-25T00:00:00.000Z",
    "end_date": "2032-11-20T00:00:00.000Z"
  }
}
```

---

### ✏ Update Employment Record

**PATCH /api/v1/contributors/employment/update/\:employmentId** 🔒👑 _Requires Authentication + Role_

_Request Body:_ (fields to update)

```json
{
  "job_title": "Staff Engineer"
}
```

_✅ Response:_

```json
{
  "message": "Employment updated",
  "employment": {
    "_id": "684b72454d683cb7304e83bb",
    "company": "Goldman Sachs",
    "job_title": "Staff Engineer",
    "start_date": "2029-05-25T00:00:00.000Z",
    "end_date": "2032-11-20T00:00:00.000Z"
  }
}
```

---

### 🗑 Delete Employment Record

**DELETE /api/v1/contributors/employment/delete/\:employmentId** 🔒👑 _Requires Authentication + Role_

_✅ Response:_

```json
{ "message": "Employment deleted" }
```

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
- GET /api/v1/content/flags/all
- POST /api/v1/newsletter/subscribers/new
- PUT /api/v1/newsletter/subscribers/:id/unsubscribe

### Authentication Required

- POST /api/v1/auth/logout
- GET /api/v1/auth/me

### Role-Based Endpoints (superAdmin/editor)

- GET /api/v1/content/get/:id
- POST /api/v1/content/create
- PATCH /api/v1/content/update/:id
- DELETE /api/v1/content/delete/:id
- PATCH /api/v1/content/publish/:id
- PATCH /api/v1/content/:id/toggle/:flag
- GET /api/v1/tags/themes/all
- POST /api/v1/tags/themes/new
- PUT /api/v1/tags/themes/update/:id
- DELETE /api/v1/tags/themes/delete/:id
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
- GET /api/v1/contributors/:id/employment
- POST /api/v1/contributors/:id/employment/new
- PATCH /api/v1/contributors/employment/update/:employmentId
- DELETE /api/v1/contributors/employment/delete/:employmentId

### Newsletter Admin Endpoints

- GET /api/v1/newsletter/subscribers/all
- DELETE /api/v1/newsletter/subscribers/remove/:id
- GET /api/v1/newsletter/subscribers/export
- POST /api/v1/newsletter/issue/create
- GET /api/v1/newsletter/issue/all
- POST /api/v1/newsletter/test-newsletter

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
