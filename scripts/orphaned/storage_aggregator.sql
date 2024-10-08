SELECT * FROM alkemio.storage_aggregator;
SELECT * FROM alkemio.storage_aggregator where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.storage_aggregator where parentStorageAggregatorId = '' or parentStorageAggregatorId is null;
SELECT * FROM alkemio.storage_aggregator where directStorageId = '' or directStorageId is null;
SELECT * FROM alkemio.storage_aggregator where type = '' or type is null;