SELECT * FROM alkemio.activity;
SELECT * FROM alkemio.activity where triggeredBy = '' or triggeredBy is null;
SELECT * FROM alkemio.activity where collaborationID = '' or collaborationID is null ;
SELECT * FROM alkemio.activity where resourceID = '' or resourceID is null;
SELECT * FROM alkemio.activity where description = '' or description is null;
SELECT * FROM alkemio.activity where type = '' or type is null;
SELECT * FROM alkemio.activity where (parentID  = '' or parentID is null);

SELECT * FROM alkemio.activity where (messageID  = '' or messageId is null) and (type = 'post-comment' or type = 'discussion-comment');
SELECT * FROM alkemio.activity where visibility = '' or visibility is null;