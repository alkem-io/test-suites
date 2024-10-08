SELECT * FROM alkemio.organization where accountId is null; ## expected 0 results
SELECT * FROM alkemio.user where accountId is null; ## expected 0 results
SELECT * FROM alkemio.space where accountId is null and level = 0; ## expected 0 results
SELECT * FROM alkemio.space where accountId is not null and (level = 1 or level = 2); ## expected 0 results
SELECT * FROM alkemio.credential where type in('account-host'); ## expected 0 results
SELECT * FROM alkemio.space where levelZeroSpaceID is null; ## expected 0 results
SELECT * FROM alkemio.agent where type is null; ## expected 0 results
SELECT id, createdDate, nameID, level, parentSpaceId, levelZeroSpaceID FROM alkemio.space where level =1 and parentSpaceId is null; ## expected 0 results

## Check main entities without credent
SELECT email, credentialRules, authorizationId FROM alkemio.authorization_policy 
join user on authorization_policy.id = user.authorizationId
where credentialRules = '';

SELECT nameID, credentialRules, authorizationId FROM alkemio.authorization_policy 
join organization on authorization_policy.id = organization.authorizationId
where credentialRules = '';

SELECT credentialRules, authorizationId FROM alkemio.authorization_policy 
join account on authorization_policy.id = account.authorizationId
where credentialRules = '';

SELECT nameID, authorizationId FROM alkemio.authorization_policy 
join virtual_contributor on authorization_policy.id = virtual_contributor.authorizationId
where credentialRules = '';

SELECT nameID, authorizationId FROM alkemio.authorization_policy 
join callout on authorization_policy.id = callout.authorizationId
where credentialRules = '';

SELECT nameID, authorizationId FROM alkemio.authorization_policy 
join space on authorization_policy.id = space.authorizationId
where credentialRules = '';


SELECT * FROM alkemio.credential where 
(type = 'space-lead' or type = 'space-member'or type ='license-space-free'or type ='organization-associate'or type ='organization-admin'
or type ='subspace-admin'or type ='user-self'or type ='space-admin'or type ='account-host'or type ='feature-callout-to-callout-template'
or type ='space-subspace-admin'or type ='feature-virtual-contributors'or type ='organization-owner'or type ='license-space-plus'
or type ='feature-whiteboard-multi-user'or type ='user-group-member'or type ='license-space-premium') and (resourceID like '' and resourceID is null);## expected 0 results

SELECT * FROM alkemio.credential where 
(type  ='vc-campaign' 
or type = 'global-admin'
or type = 'global-support'
or type = 'global-community-read'
or type = 'global-registered'
or type = 'global-license-manager'
or type = 'beta-tester') and 
(resourceID not like '' and resourceID is not null) ; ## expected 0 results 

