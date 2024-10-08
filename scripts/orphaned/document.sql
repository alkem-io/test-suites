SELECT * FROM alkemio.document;
SELECT * FROM alkemio.document where createdBy = '' or createdBy is null;
SELECT * FROM alkemio.document where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.document where storageBucketId = '' or storageBucketId is null;
SELECT * FROM alkemio.document where tagsetId = '' or tagsetId is null;
SELECT * FROM alkemio.document where mimeType = '' or mimeType is null;
SELECT * FROM alkemio.document where size = '' or size is null;
SELECT * FROM alkemio.document where externalID = '' or externalID is null;