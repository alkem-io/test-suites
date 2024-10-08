SELECT * FROM alkemio.invitation;
SELECT * FROM alkemio.invitation where invitedContributor = '' or invitedContributor is null;
SELECT * FROM alkemio.invitation where createdBy = '' or createdBy is null;
SELECT * FROM alkemio.invitation where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.invitation where lifecycleId = '' or lifecycleId is null;
SELECT * FROM alkemio.invitation where communityId = '' or communityId is null;
SELECT * FROM alkemio.invitation where welcomeMessage = '' or welcomeMessage is null;
SELECT * FROM alkemio.invitation where invitedToParent = '' or invitedToParent is null;
SELECT * FROM alkemio.invitation where contributorType = '' or contributorType is null;
