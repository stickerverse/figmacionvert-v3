# User | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/User/
scraped_at: 2025-12-22T03:30:40.560Z
---

The `User` object contains details about a user.

### id: string | null \[readonly\]

The user's id. `id` will be automatically generated users in workshop mode. `id` will also be automatically generated for the current user if they are not logged in. For other non-logged in users, this value will be null.

* * *

### name: string \[readonly\]

The user's name. `name` will be 'Anonymous' for non-logged in users.

* * *

### photoUrl: string | null \[readonly\]

The user's photo URL. `photoUrl` will be automatically generated users in workshop mode. `photoUrl` will also be automatically generated for the current user if they are not logged in. For other non-logged in users, this value will be null.

* * *

### color: string \[readonly\]

The current user's multiplayer color. This will match the color of their dot stamps and cursor.

* * *

### sessionId: number \[readonly\]

The user's session id. This is guaranteed to be unique among active users. For example, if a user with the same `id` opens a file in different tabs, each `User` will have a unique `sessionId`.

* * *
