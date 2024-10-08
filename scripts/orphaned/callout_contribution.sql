SELECT * FROM alkemio.callout_contribution;
SELECT * FROM alkemio.callout_contribution where createdBy = '' or createdBy is null;
SELECT * FROM alkemio.callout_contribution where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.callout_contribution where (whiteboardId = '' or whiteboardId is null) and (postId = '' or postId is null) and (linkId = '' or linkId is null);
SELECT * FROM alkemio.callout_contribution where calloutId = '' or calloutId is null;
SELECT * FROM alkemio.callout_contribution where sortOrder = '' or sortOrder is null;

