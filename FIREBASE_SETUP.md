# Firebase, Cloudinary and media setup

Seedwel uses **Firebase Authentication** and **Firebase Realtime Database** for accounts and records. Every new file upload uses the Cloudinary product environment already connected to the Vercel project:

- portfolio images;
- private job-application CVs; and
- worker profile photos shown on Worker IDs and QR verification records.

No Cloudinary API secret, Firebase password or unsigned upload preset is stored in this repository. Browser uploads first request a short-lived signature from the serverless routes in `api/`. The Cloudinary API secret remains server-side.

## Cloudinary connection

The serverless functions automatically use the standard `CLOUDINARY_URL` environment variable supplied by the existing Cloudinary/Vercel integration:

```text
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

The separate `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` variables are also supported. Prefer `CLOUDINARY_URL` when the integration already provides it. Do **not** copy any of these values into HTML, JavaScript committed to Git, Firebase, or chat.

In Vercel:

1. Open the existing `seedwelinvest-ltd` project.
2. Confirm its existing Cloudinary integration is enabled for **Production**, **Preview** and **Development** as appropriate.
3. Confirm `CLOUDINARY_URL` is present in the project environment settings. Keep the currently connected Cloudinary product environment—there is no hardcoded cloud name in this repository.
4. Redeploy after changing environment variables.

The upload workflow places every managed asset in the Cloudinary Media Library folder **`portfolio`**. It also keeps logical, scoped public IDs so assets remain safe to manage in either Cloudinary folder mode:

- `portfolio/projects/...`
- `portfolio/job-applications/...`
- `portfolio/profile-pictures/...`

The signed upload includes `asset_folder=portfolio` for modern dynamic-folder product environments. The `portfolio/...` public-ID prefix provides the equivalent folder placement for legacy fixed-folder environments. Do not replace this with an unsigned upload preset.

CVs remain private even though they share the `portfolio` Media Library folder: they are uploaded as `raw` assets with Cloudinary's `authenticated` delivery type. An administrator must be signed in to request the five-minute private download URL. Portfolio signatures require the verified administrator account. Profile-photo signatures require the matching signed-in Firebase user and use one stable Cloudinary public ID per Firebase UID, so replacing a photo does not create duplicate ID photos.

## Firebase configuration

- The shared login form accepts the private-facing Admin ID `seedwel@admin`, maps it to the verified Firebase administrator account, and sends the entered password directly to Firebase Authentication.
- The administrator's real email is not displayed in the interface. The password is never saved, displayed, hashed in the browser, or committed to Git.
- A verified Firebase email is required before the admin dashboard opens.
- `database.rules.json` keeps private portfolio, application and worker records protected while exposing only deliberately public portfolio and verification copies.
- `storage.rules` now blocks all new Firebase Storage uploads. It retains read/delete access needed to display or clean up files uploaded before the Cloudinary migration.

Firebase web configuration values are public app identifiers, not account secrets. Firebase Authentication and deployed Database Rules provide access control.

### One-time Firebase console tasks

1. In the Firebase Console for `seedwel-investment-limited`, enable **Email/Password** under **Authentication → Sign-in method**.
2. Create or update `zacheussimbaya@gmail.com`, use a strong unique password and complete email verification.
3. Add `seedwel.ltd` and the required Vercel preview domains under **Authentication → Settings → Authorized domains**.
4. Deploy the included rules:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --project seedwel-investment-limited --only database,storage
   ```

5. Confirm in the Rules simulator that unauthenticated users cannot read `/projects`, `/applications` or `/workers`; workers can only read/update their own permitted data; and only the administrator can manage private portfolio and application records.

The admin email is repeated in `admin.html`, `database.rules.json` and the serverless authorization helper. Update all locations together if the administrator account changes.

## Upload behavior and limits

| Upload | Limit | Access |
|---|---:|---|
| Portfolio gallery | Up to 6 images per project, 25 MB each | Public delivery; upload/delete restricted to verified admin |
| Job-application CV | 5 MB | Authenticated Cloudinary asset; admin-only temporary download |
| Worker ID profile photo | 5 MB | Signed-in worker upload; visible on their ID and public token-based verification page |

The dashboard's **1 TB** media setting is a planning target and tracked portfolio usage meter. Actual capacity, transformations, bandwidth and billing are controlled by the plan on the connected Cloudinary product environment. Configure Cloudinary usage notifications and budget controls for the required capacity.

Existing Firebase Storage files remain readable and deletable for migration, but every new upload initiated by the site goes to Cloudinary.

## Contact messages and applications

Public visitors may create records under `/contactMessages` and `/applications`. Only the verified administrator can read, update or delete them. The careers form always attempts the private CV upload first; if that service is unavailable, it still submits the application to the admin inbox with a **CV follow-up required** flag and gives the applicant direct email and WhatsApp options.

The admin inbox supports application search, status/CV filtering, secure CV requests, and CSV export. When an administrator deletes a Cloudinary-backed application, the dashboard also requests deletion of its authenticated CV. Legacy Firebase CVs continue to receive best-effort cleanup.

## Worker accounts, IDs and profile photos

Workers use Firebase Authentication and have one record at `/workers/{uid}`. Tasks are stored at `/tasks/{workerUid}/{taskId}`. Database Rules prevent workers from assigning their own status, role, commission rate, Worker ID, verification token or performance statistics.

Approval transactionally increments `/counters/workerId`, issues a permanent ID such as `SWL-2026-000001`, creates a random verification token and writes the limited public record at `/verifications/{token}`. A worker's Cloudinary profile photo is saved privately with their worker record and copied only to their own token-based public verification record. The rules do not let them edit the public name, role, Worker ID or status.

Scanning the ID QR opens `verify.html?t={token}`. Active records show the verified worker's name, role, Worker ID, status and profile photo. Suspended records show a warning; revoked records fail verification.

## Security checklist

- Keep Firebase and Cloudinary credentials out of the repository and browser code.
- Do not add an unsigned Cloudinary upload preset.
- Keep the Cloudinary product environment connected through server-side Vercel variables.
- Deploy `database.rules.json` whenever profile-photo or worker permissions change.
- Review Cloudinary uploads, authenticated assets, usage and billing regularly.
- Remove former team members from Firebase Authentication and rotate credentials after any suspected exposure.
- Test portfolio replacement/deletion, private CV download/deletion and Worker ID photo replacement after each production deployment.
