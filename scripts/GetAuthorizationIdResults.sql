CREATE PROCEDURE GetAuthorizationIdResults()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE current_table VARCHAR(255);
    DECLARE row_count INT DEFAULT 0;

    -- Declare a cursor to fetch all tables with the 'authorizationId' column
    DECLARE table_cursor CURSOR FOR
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND column_name = 'authorizationId';

    -- Handler for the cursor to exit the loop
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Create a temporary table to store the results
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_results (
        table_name VARCHAR(255),
        row_data TEXT
    );

    -- Open the cursor
    OPEN table_cursor;

    -- Loop through each table with the 'authorizationId' column
    read_loop: LOOP
        FETCH table_cursor INTO current_table;
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- Construct the dynamic query to count rows where authorizationId is NULL or empty
        SET @dynamic_count_query = CONCAT('SELECT COUNT(*) INTO @row_count FROM ', current_table, 
                                          ' WHERE authorizationId IS NULL OR authorizationId = '''';');
        
        -- Prepare and execute the query to count the rows
        PREPARE stmt_count FROM @dynamic_count_query;
        EXECUTE stmt_count;
        DEALLOCATE PREPARE stmt_count;

        -- Only proceed if there are rows found
        IF @row_count > 0 THEN
            -- Construct the dynamic query to fetch results and insert into the temporary table
            SET @dynamic_query = CONCAT('INSERT INTO temp_results (table_name, row_data) ',
                                        'SELECT ''', current_table, ''', CONCAT_WS('' | '', ', current_table, '.*) ',
                                        'FROM ', current_table, 
                                        ' WHERE authorizationId IS NULL OR authorizationId = '''';');
            
            -- Prepare and execute the query to insert into the temp table
            PREPARE stmt FROM @dynamic_query;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END LOOP;

    -- Close the cursor
    CLOSE table_cursor;

    -- Return all accumulated results from the temporary table
    SELECT * FROM temp_results;

    -- Clean up: Drop the temporary table after use
    DROP TEMPORARY TABLE IF EXISTS temp_results;

END