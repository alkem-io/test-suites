SELECT * FROM alkemio.ai_persona_service;
SELECT * FROM alkemio.ai_persona_service where engine = '' or engine is null;
SELECT * FROM alkemio.ai_persona_service where dataAccessMode = '' or dataAccessMode is null;
SELECT * FROM alkemio.ai_persona_service where prompt = '' or prompt is null;
SELECT * FROM alkemio.ai_persona_service where bodyOfKnowledgeID = '' or bodyOfKnowledgeID is null;
SELECT * FROM alkemio.ai_persona_service where bodyOfKnowledgeType = '' or bodyOfKnowledgeType is null;
SELECT * FROM alkemio.ai_persona_service where  bodyOfKnowledgeLastUpdated is null;
SELECT * FROM alkemio.ai_persona_service where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.ai_persona_service where aiServerId = '' or aiServerId is null;


