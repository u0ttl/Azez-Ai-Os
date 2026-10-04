# Secure file operations

## Controls included

- One file per multipart request.
- Configurable `FILE_MAX_BYTES`, defaulting to 10 MB.
- Explicit PDF, DOCX, TXT, PNG, and JPEG allowlist.
- File signature and declared MIME matching.
- PE, ELF, Mach-O, and shebang executable rejection.
- SHA-256 checksums and normalized filenames.
- Tenant ownership checks on every list, upload, download, and delete operation.
- Subscription storage limits calculated from non-deleted file records.
- Private object storage with five-minute signed downloads.
- Soft deletion in PostgreSQL followed by object deletion.
- ClamAV INSTREAM scanning before an object is stored.
- Fail-closed production mode when the malware scanner is unavailable.

## Production requirements

Production Compose connects the API to ClamAV and sets `MALWARE_SCAN_REQUIRED=true`. A detected file is rejected before object storage, and scanner outages return `503` instead of silently accepting a file. Keep virus definitions updated, keep the bucket private, enable TLS, use restricted object-store credentials, apply retention/lifecycle rules, and alert on scan failures or repeated rejected uploads.

## Accepted MIME types

| Format | MIME type |
| --- | --- |
| PDF | `application/pdf` |
| DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Text | `text/plain` |
| PNG | `image/png` |
| JPEG | `image/jpeg` |
