SELECT * FROM alkemio.authorization_policy;
SELECT * FROM alkemio.authorization_policy where credentialRules = '' or credentialRules is null;
SELECT * FROM alkemio.authorization_policy where anonymousReadAccess = '' or anonymousReadAccess is null;
SELECT * FROM alkemio.authorization_policy where privilegeRules = '' or privilegeRules is null;
SELECT * FROM alkemio.authorization_policy where type = '' or type is null;
