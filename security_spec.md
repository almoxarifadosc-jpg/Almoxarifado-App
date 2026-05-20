# Security Specification for Ventisol App

## Data Invariants
1. A profile must have a valid ID and unique email.
2. Only approved users can read or write most data.
3. Super Admins (almoxarifado.sc@ventisol.com.br) have full access.
4. Users can only edit their own profile (except for status/admin flags).
5. Purchase orders can only be updated with specific actions (Assign, Confer, Sign, Close).

## Dirty Dozen Payloads
1. **Identity Spoofing**: Attempt to create a profile with `isAdmin: true` as a non-admin.
2. **Identity Spoofing**: Attempt to update another user's profile status to `APPROVED`.
3. **Identity integrity**: Update an operation and change its `id`.
4. **State Shortcutting**: Update a purchase order status from `Pendente` to `Concluído` without signature or conference names.
5. **PII Leak**: Read all profiles (including emails) as a regular user without approval.
6. **Shadow Update**: Add a `isVerified: true` field to a news post.
7. **Resource Poisoning**: Inject a 2MB string into an operation's `line` field.
8. **Resource Poisoning**: Use a very long ID like `a`.repeat(2000) for a document.
9. **Relational Sync**: Create a receipt referencing a non-existent supplier.
10. **Terminal State Locking**: Modify a purchase order that is already in status `Baixada`.
11. **Action Bypass**: Update a purchase order items without using the correct action check (diff).
12. **Unauthorized List**: Attempt to list all receipts without being an approved user.

## Test Runner
(Will be implemented in firestore.rules.test.ts)
