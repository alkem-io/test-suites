SELECT * FROM alkemio.platform_invitation;
SELECT * FROM alkemio.platform_invitation where email = '' or email is null;
SELECT * FROM alkemio.platform_invitation where createdBy = '' or createdBy is null;
SELECT * FROM alkemio.platform_invitation where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.platform_invitation where communityId = '' or communityId is null;
SELECT * FROM alkemio.platform_invitation where communityInvitedToParent = '' or communityInvitedToParent is null;