# BaseUser | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/BaseUser/
scraped_at: 2025-12-22T03:30:33.675Z
---

The `BaseUser` object contains details about a user that was in a file at some point. They may not be active in the file.

### id: string | null \[readonly\]

The user's id. `id` will be automatically generated users in workshop mode. `id` will also be automatically generated for the current user if they are not logged in. For other non-logged in users, this value will be null.

* * *

### name: string \[readonly\]

The user's name. `name` will be 'Anonymous' for non-logged in users.

* * *

### photoUrl: string | null \[readonly\]

The user's photo URL. `photoUrl` will be automatically generated users in workshop mode. `photoUrl` will also be automatically generated for the current user if they are not logged in. For other non-logged in users, this value will be null.

* * *
