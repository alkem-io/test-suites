SELECT * FROM alkemio.organization_verification;
SELECT * FROM alkemio.organization_verification where organizationID = '' or organizationID is null;
SELECT * FROM alkemio.organization_verification where status = '' or status is null;
SELECT * FROM alkemio.organization_verification where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.organization_verification where lifecycleId = '' or lifecycleId is null;
