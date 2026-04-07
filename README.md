# Quip API

A RESTful API for a social network application similar to Twitter, built with Node.js, TypeScript, Hono, and MongoDB. This API supports user authentication, posts, timelines, lists, bookmarks, favourites, follows, mutes, blocks, and more.

## Features

-   **User Authentication**: Sign up, sign in, JWT-based authentication, refresh/revoke tokens, password reset, email verification.
-   **Posts**: Create, update, delete, reply, quote, repeat, vote, attach media, polls, hashtags, mentions, and location.
-   **Timeline & Activity**: Personalized timeline, activity feed, top posts, hashtag search, and nearby posts.
-   **Lists**: Create, update, delete lists, add/remove members, fetch list posts and members.
-   **Bookmarks & Favourites**: Bookmark and favourite posts.
-   **Follows & Requests**: Follow/unfollow users, handle follow requests for protected accounts.
-   **Mutes & Blocks**: Mute/block users, posts, and words; manage muted/blocked lists.
-   **User Settings**: Manage timeline, activity, profile, and UI settings.
-   **Swagger/OpenAPI**: API documentation available at `/swagger` (in non-production).
-   **File Uploads**: Media uploads (images/videos) via Cloudinary.

## Tech Stack

-   **Node.js** + **TypeScript**
-   **Hono** (web framework)
-   **MongoDB** with **Mongoose** (ODM)
-   **Cloudinary** (media storage)
-   **JWT** (authentication)
-   **Swagger** (API docs)

## Getting Started

### Prerequisites

-   Node.js (v18+ recommended)
-   MongoDB instance
-   Cloudinary account (for media uploads)

### Installation

1. Clone the repository:

    ```sh
    git clone <repo-url>
    cd quip-api-v2
    ```

2. Install dependencies:

    ```sh
    npm install
    ```

3. Configure environment variables:

    - Copy `environment.config` to `.env` and fill in the required values:

        ```env
        NODE_ENV=development
        DB_CONNECTION=mongodb://localhost:27017/quip
        JWT_AUTH_SECRET=your_jwt_auth_secret
        JWT_REFRESH_SECRET=your_jwt_refresh_secret
        ALLOW_ORIGINS=http://localhost:3000;
        CLOUD_BUCKET=your_cloudinary_cloud_name
        CLOUD_API_KEY=your_cloudinary_api_key
        CLOUD_API_SECRET=your_cloudinary_api_secret
        SMTP_HOST=your_smtp_host
        SMTP_PORT=your_smtp_port
        SMTP_USER=your_smtp_user
        SMTP_KEY=your_smtp_key
        ```

### Running the Server

-   **Development:**

    ```sh
    npm run dev
    ```

-   **Production:**

    ```sh
    npm run build
    npm start
    ```

### API Documentation

-   Swagger UI is available at [`/swagger`](http://localhost:2048/swagger) when not in production mode.

## Main Endpoints

### Auth

-   `POST /auth/sign-up` — Register a new user
-   `POST /auth/sign-in` — Login
-   `POST /auth/refresh-token` — Refresh JWT
-   `GET /auth/revoke-token/:token` — Revoke refresh token

### Users

-   `GET /users/:handle` — Get user profile
-   `GET /users/:handle/posts` — User's posts
-   `GET /users/:handle/followers` — Followers
-   `GET /users/:handle/following` — Following
-   `GET /users/:handle/favourites` — Favourites
-   `GET /users/:handle/bookmarks` — Bookmarks
-   `GET /users/:handle/mentions` — Mentions
-   `GET /users/:handle/topmost/:period?` — Top posts
-   `GET /users/follow/:handle` — Follow user
-   `GET /users/unfollow/:handle` — Unfollow user
-   `GET /users/block/:handle` — Block user
-   `GET /users/unblock/:handle` — Unblock user
-   `GET /users/mute/:handle` — Mute user
-   `GET /users/unmute/:handle` — Unmute user

### Posts

-   `POST /posts/create` — Create post
-   `POST /posts/update/:postId` — Update post
-   `DELETE /posts/delete/:postId` — Delete post
-   `POST /posts/quote/:postId` — Quote post
-   `POST /posts/reply/:postId` — Reply to post
-   `GET /posts/:postId` — Get post
-   `GET /posts/:postId/quotes` — Get quotes
-   `GET /posts/:postId/replies` — Get replies
-   `GET /posts/:postId/parent` — Get parent post
-   `GET /posts/favourite/:postId` — Favourite post
-   `GET /posts/unfavourite/:postId` — Unfavourite post
-   `GET /posts/bookmark/:postId` — Bookmark post
-   `GET /posts/unbookmark/:postId` — Unbookmark post
-   `GET /posts/repeat/:postId` — Repeat post
-   `GET /posts/unrepeat/:postId` — Unrepeat post
-   `GET /posts/mute/:postId` — Mute post
-   `GET /posts/unmute/:postId` — Unmute post
-   `GET /posts/vote/:postId` — Vote on poll

### Lists

-   `GET /lists/` — Get user lists
-   `POST /lists/create` — Create list
-   `POST /lists/update` — Update list
-   `DELETE /lists/delete/:name` — Delete list
-   `POST /lists/add-member` — Add member
-   `POST /lists/remove-member` — Remove member
-   `GET /lists/:name/members` — List members
-   `GET /lists/:name/posts` — List posts

### Timeline & Search

-   `GET /timeline` — User timeline
-   `GET /activity/:period?` — User activity
-   `GET /topmost/:period?` — Top posts
-   `GET /hashtag/:name` — Posts by hashtag
-   `GET /search/posts` — Search posts
-   `GET /search/users` — Search users
-   `GET /search/nearby` — Search nearby posts

### Settings & Moderation

-   `GET /settings/` — Get user settings
-   `POST /settings/` — Update user settings
-   `POST /settings/mute` — Mute word
-   `POST /settings/unmute` — Unmute word
-   `GET /settings/blocked` — Blocked users
-   `GET /settings/muted/users` — Muted users
-   `GET /settings/muted/posts` — Muted posts
-   `GET /settings/muted/words` — Muted words
-   `GET /settings/pin/{postId}` — Pin post
-   `GET /settings/unpin` — Unpin post
-   `POST /settings/update-email` — Update email
-   `POST /settings/change-password` — Change password
-   `GET /settings/deactivate` — Deactivate account
-   `GET /settings/activate` — Activate account
-   `DELETE /settings/delete` — Delete account

## License

This project is licensed under the ISC License.

---

_For more details, see the source code and the `/swagger` endpoint for live API documentation._