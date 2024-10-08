SELECT * FROM alkemio.collaboration;
SELECT * FROM alkemio.collaboration where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.collaboration where tagsetTemplateSetId = '' or tagsetTemplateSetId is null;
SELECT * FROM alkemio.collaboration where timelineId = '' or timelineId is null;
SELECT * FROM alkemio.collaboration where innovationFlowId = '' or innovationFlowId is null;
SELECT * FROM alkemio.collaboration where groupsStr = '' or groupsStr is null;