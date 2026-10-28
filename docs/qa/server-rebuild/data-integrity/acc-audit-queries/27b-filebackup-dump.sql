\copy (SELECT "externalID", size, "firstSeenAt" FROM file_backup_object) TO 'fb-objects.csv' CSV
SELECT length("externalID") len, count(*) FROM file_backup_object GROUP BY 1;
