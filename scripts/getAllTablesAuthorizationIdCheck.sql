CREATE PROCEDURE getAllTablesAuthorizationIdCheck()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE tbl_name VARCHAR(255);
    DECLARE cur CURSOR FOR 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'your_database_name';  -- Replace with your actual database name

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO tbl_name;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET @query = CONCAT('SELECT * FROM ', tbl_name, ' WHERE (NOT EXISTS (SELECT 1 FROM authorization_policy WHERE authorization_policy.id = ', tbl_name, '.authorizationId) OR ', tbl_name, '.authorizationId IS NULL)');
        
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;

    CLOSE cur;
END
