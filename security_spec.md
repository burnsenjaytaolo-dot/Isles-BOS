# Isles BOS Multi-Tenant Security Specification

## 1. Data Invariants

1. **Zero-Trust Default Deny**: Every Firestore path defaults to `allow read, write: if false`.
2. **Verified Identity**: All business operations require `request.auth != null` and `request.auth.token.email_verified == true` (except reading/updating own initial user profile doc).
3. **Tenant Isolation**: Every business record under `/businesses/{businessId}/...` requires active membership in `/businesses/{businessId}/members/$(request.auth.uid)` with `status == 'active'`.
4. **Immutable Ownership & Anti-Privilege Escalation**:
   - Users can create `/businesses/{businessId}/members/{uid}` as `Owner` ONLY atomically during creation of a brand-new business (`!exists(/businesses/{businessId})` and `getAfter(/businesses/{businessId}).data.ownerId == uid`).
   - Users can NEVER modify their own `role` or `status` in `/businesses/{businessId}/members/{uid}` or `/users/{uid}/memberships/{businessId}`.
   - Only the `Owner` can transfer ownership or modify `Administrator` roles.
   - `Viewer` role has strictly read-only access across all business subcollections.
5. **Financial & Audit Integrity**:
   - `Paid` sales are terminal and cannot be modified or deleted via client rules.
   - `payments`, `inventoryMovements`, and `auditLogs` are append-only (no client `update` or `delete`).
   - `createdAt` and `updatedAt` are strictly validated against `request.time`.
6. **PII Isolation**:
   - `/users/{userId}` can only be read or written by `request.auth.uid == userId`.
   - `/invitations/{inviteId}` can only be read by the invited verified email (`resource.data.email == request.auth.token.email`) or an authorized `Owner`/`Administrator` of `resource.data.businessId`.

## 2. The "Dirty Dozen" Attack Payloads

1. **Cross-Tenant Read**: User B (member of Business B) attempts `get(/businesses/bizA/customers/cust1)` -> **PERMISSION_DENIED**.
2. **Cross-Tenant List**: User B attempts `list(/businesses/bizA/sales)` -> **PERMISSION_DENIED**.
3. **Self-Assigned Ownership on Existing Business**: Attacker attempts `create(/businesses/bizA/members/attackerUid, { role: 'Owner' })` -> **PERMISSION_DENIED**.
4. **Self-Role Escalation**: Cashier attempts `update(/businesses/bizA/members/cashierUid, { role: 'Owner' })` -> **PERMISSION_DENIED**.
5. **Ghost / Shadow Field Injection**: Owner attempts `create(/businesses/bizA/products/p1, { ..., isAdminOverride: true })` -> **PERMISSION_DENIED** via `keys().hasOnly(...)`.
6. **ID Poisoning**: Attacker attempts `create(/businesses/bizA/products/invalid$idWithSpaces..., ...)` or 1.5KB ID -> **PERMISSION_DENIED** via `isValidId()`.
7. **Unverified Email Write**: Unverified email user (`email_verified == false`) attempts to create a business or sale -> **PERMISSION_DENIED**.
8. **Spoofed CreatedBy / Actor**: Cashier attempts `create(/businesses/bizA/sales/s1, { createdBy: 'ownerUid' })` -> **PERMISSION_DENIED**.
9. **Terminal Paid Sale Tampering**: Member attempts `update(/businesses/bizA/sales/paidSaleId, { total: 1 })` or `delete(...)` -> **PERMISSION_DENIED**.
10. **Viewer Write Attempt**: Viewer attempts `create(/businesses/bizA/expenses/e1, ...)` -> **PERMISSION_DENIED**.
11. **Forged Invitation Acceptance**: Attacker with `attacker@evil.com` attempts to accept an invitation addressed to `staff@isles.sb` -> **PERMISSION_DENIED**.
12. **Audit Log Deletion / Tampering**: Owner or Admin attempts `delete(/businesses/bizA/auditLogs/log1)` or `update(...)` -> **PERMISSION_DENIED**.
