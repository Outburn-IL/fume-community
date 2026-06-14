# Draft Release Notes: HTTP Error Redaction

`fume-community` now enforces the documented verbose HTTP diagnostics shape at the response boundary.

This improves security and privacy behavior by removing undeclared nested error fields such as raw `sourceError` objects, auth/config fragments, and other accidental upstream payload details before they leave the HTTP API.

This release also aligns the served OpenAPI schema and runtime response with the shared public contract by documenting `fhirParent` instead of `instanceOf`. For compatibility, upstream diagnostics that still provide `instanceOf` are normalized to `fhirParent` before they are returned.

This is a bug-fix level change for the server package. The public shared contract already declared the narrower diagnostic shape.

Consumers using `?verbose=true` should rely only on the documented diagnostic fields (`code`, `message`, `position`, `start`, `line`, `fhirParent`, `fhirElement`, `severity`, `level`, and `timestamp`).