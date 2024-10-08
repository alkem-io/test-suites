SELECT * FROM alkemio.license_policy;
SELECT * FROM alkemio.license_policy where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.license_policy where credentialRulesStr = '' or credentialRulesStr is null;
