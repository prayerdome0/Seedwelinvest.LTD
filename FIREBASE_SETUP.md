# Secure portfolio and media setup

The portfolio admin is intentionally a **Firebase Authentication** client. It does not contain a password and it does not use an unsigned Cloudinary upload preset. Project records live in Firebase Realtime Database and new portfolio images are uploaded to Firebase Storage.

## What is configured in this repository

- The login form accepts the assigned Admin ID (`zacheus`) and sends the entered password directly to Firebase Authentication for the existing administrator email (`zacheussimbaya@gmail.com`).
- The password is **not** saved, displayed, hashed in the browser, committed to Git, or used by the Database/Storage rules.
- Authentication uses a browser-session persistence mode. Closing the browser ends the local session.
- A verified Firebase email is required before the dashboard opens.
- `database.rules.json` keeps the full portfolio library (including drafts and upload metadata) private at `/projects`. It exposes only the administrator-synchronized, published copy at `/publicProjects`; writes are limited to the verified administrator account.
- `storage.rules` permits public retrieval of portfolio images but blocks listing and allows uploads/deletes only for the administrator. Image uploads are capped at 25 MB each.

> **Important:** Firebase configuration keys are public web-app identifiers; they are not access secrets. The deployed security rules and Firebase Authentication are what protect the data.

## One-time Firebase console tasks

1. Open the **Firebase Console** for `seedwel-investment-limited`.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Authentication → Users**, create or update the account for `zacheussimbaya@gmail.com` with the chosen password. Send/complete its verification email.
4. Use a long, unique password in Firebase. Do not put a password in this repository, page source, Database Rules, or Cloud Storage Rules. Enable multi-factor authentication in Google Cloud Identity Platform/Firebase where it is available for the project.
5. In **Authentication → Settings → Authorized domains**, ensure `seedwel.ltd` is present so the production login can use Firebase Authentication.
6. Deploy the included rules from this repository:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --project seedwel-investment-limited --only database,storage
   ```

7. Confirm in the Firebase Rules simulator that:
   - an unauthenticated visitor can read `/publicProjects` but cannot read or write `/projects`;
   - a signed-in non-admin account cannot write `/projects`, `/publicProjects` or `siteSettings`;
   - the administrator can add/update/delete a portfolio project and synchronize its public copy;
   - an unauthenticated user cannot upload to `portfolio/` in Storage.

The email address is repeated in `admin.html`, `database.rules.json`, and `storage.rules`. If the administrator account changes, update all three places and redeploy the rules together.

## Set up a real 1 TB media capacity

A static website cannot allocate cloud storage. The dashboard's **1 TB** setting is a transparent capacity target and a usage meter; it becomes real only after the storage provider account is provisioned and billed for that amount.

1. Attach an active billing account / pay-as-you-go plan to the Firebase project in Google Cloud Console. Firebase Storage does not reserve a fixed disk volume from page source; storage is billed by actual use.
2. In Google Cloud Billing, create a budget/alert at the level appropriate for roughly 1 TB of stored media and the expected download traffic. Set notifications before costs become a surprise.
3. In the admin dashboard, open **Public portfolio details**, leave or set **Media capacity target** to `1` TB, and save it. The meter uses the uploaded file metadata to show the tracked usage against that target.
4. Test an image upload after deploying `storage.rules`. The dashboard stores files under `portfolio/<admin-user-id>/...`; it deletes the prior managed image after a successful replacement.

The 25 MB individual-file limit is deliberate for a fast public portfolio. Increasing the total storage target to 1 TB does not require increasing every individual image limit.

## First portfolio migration

The public `projects.html` continues to show the existing showcase items until Firebase has managed public entries. After signing in, use **Import current showcase cards** in an empty portfolio library. It creates editable records for the existing work and publishes a safe public copy. If portfolio entries already exist from the old dashboard, use **Sync public portfolio** once to create the public copies. From then on the administrator can add, edit, publish, unpublish, delete and send the public portfolio.

## Security operations checklist

- Keep the Firebase administrator's password private and change it if it was shared in an unsafe place.
- Keep the Firebase user email verified and enable MFA when available.
- Deploy the two rules files before relying on the dashboard. UI checks alone are never a security boundary.
- Review Firebase Authentication and Cloud Storage usage regularly.
- Do not loosen `.write` rules to `true` or use an unsigned third-party upload preset for portfolio media.
- Remove former team members from Firebase Authentication and change the administrator password immediately when access changes.
