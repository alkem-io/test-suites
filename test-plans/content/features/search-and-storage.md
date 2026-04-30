---
feature: Search, storage, and document authorization
slug: search-and-storage
---

<!--
  Combines server-api/src/functional-api/search/ and /storage/ into a single
  feature library since they share a "data-retrieval / authorization on
  resource access" theme.
-->

## TC-0900 — Platform search returns entities scoped to the caller's authorization

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. As a stakeholder with access to one private space and several public ones, call `search(terms, filters)`.
2. Verify the returned set matches only the accessible entities.

### Expected

- Unauthorized private entities are NOT in the result set.
- Type filters (user / organization / space / callout) are honored.
- Terms are matched case-insensitively on display names and taglines.

## TC-0901 — A user can upload a document (image) to a storage bucket

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Call `createDocument` with a multipart-uploaded file targeting a storage bucket on the user's profile.
2. Query the user profile for documents.

### Expected

- The document appears with the correct MIME type, size, and a download URL.
- Attempts to upload unsupported file types return a clear validation error.

## TC-0902 — Visual uploads to profiles (User / Org / Space) respect authorization

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Upload a visual (avatar / banner) to the caller's user profile.
2. Attempt to upload to another user's profile.
3. As an admin, upload a Space banner; as a non-member, attempt the same.

### Expected

- Self-profile uploads succeed; cross-profile uploads return authorization errors.
- Space banner uploads are permitted only for admins / community managers.

## TC-0903 — Document access is authorized per journey privacy: private space contents are gated

```yaml
priority: P1
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Given a Private Space with a document on a callout, request the document as a non-member.
2. Request as a member of the Private Space.
3. Request as a member of a sibling subspace.

### Expected

- Non-member request is denied.
- Member request succeeds.
- Sibling-subspace member is denied unless they hold the enclosing space's membership.

## TC-0904 — Organization-owned documents follow the organization's authorization policy

```yaml
priority: P2
type: integration
state: Ready
should_automate: yes
owner: ev.dimitrovv
```

### Steps

1. Upload a document to an organization's storage.
2. Query as: organization admin, organization member, unrelated authenticated user, anonymous user.

### Expected

- Org admin + member can read; unrelated user and anonymous user are denied unless the organization is marked public.
