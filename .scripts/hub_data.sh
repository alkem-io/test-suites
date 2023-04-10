#!/bin/sh

# Set default values
START_DIR=$PWD
SCRIPT_DIR=$(dirname $(realpath $0))
PROJECT_ROOT_DIR=$SCRIPT_DIR/..
SNAPSHOT_SERVER_DIR=. $SCRIPT_DIR/create-snapshot.dir.config
export MYSQL_DATABASE=alkemio-safe-for-deletion
export DATABASE_HOST=localhost
export MYSQL_DB_PORT=3306
export MYSQL_ROOT_PASSWORD=toor
export MYSQL_QUERIES=cmds.txt

# If local directory config file exists loadd it
if [ -f "$SCRIPT_DIR/create-snapshot.config.local" ]; then
    . $SCRIPT_DIR/create-snapshot.config.local
fi

# # If local directory config file exists loadd it
if [ -f "$SCRIPT_DIR/create-snapshot.dir.config.local" ]; then
    . $SCRIPT_DIR/create-snapshot.dir.config.local
fi

# If local directory config file exists loadd it
if [ -f "$SCRIPT_DIR/run-tests.config.local" ]; then
    . $SCRIPT_DIR/run-tests.config.local
fi

# Load config file
if [ -f "$1" ]; then
    . ./$1
else
    echo Config file does not exist!
    exit
fi

echo "Next step will destroy DB '${MYSQL_DATABASE}' if exists."

# Print configuration
echo === CONFIGURATION ===
echo "SERVER FOLDER: ${SNAPSHOT_SERVER_DIR}"
echo "DATABASE: ${MYSQL_DATABASE}"
echo "HOST: ${DATABASE_HOST}"
echo "PORT": ${MYSQL_DB_PORT}
echo "PASSWORD: ${MYSQL_ROOT_PASSWORD}"
echo =====================

executeCommand() {
 mysql --user=root --host=$DATABASE_HOST --password=$MYSQL_ROOT_PASSWORD --protocol tcp -e "$1"
}

#Drop database if exists
if executeCommand "DROP DATABASE IF EXISTS ${MYSQL_DATABASE};"; then
    echo "Database $MYSQL_DATABASE droped!"
fi

# Create new database
if executeCommand "CREATE DATABASE ${MYSQL_DATABASE};"; then
    echo "Database $MYSQL_DATABASE created!"
fi

# Navigate to the server folder
cd "$PROJECT_ROOT_DIR" || exit
cd $SNAPSHOT_SERVER_DIR || exit

# # Run migrations
npm run migration:run
echo run migration

npm start &
echo Alkemio service is running

# Waits the server to start successfully
timeout 400 bash -c 'while [[ "$(curl -s -o /dev/null -w ''%{http_code}'' http://localhost:3000/api/public/rest)" != "200" ]]; do sleep 2; done' || false
echo first await

# pwd
# sleep 25
pwd
#whoami
cd $PROJECT_ROOT_DIR
npm run-script test:orphaned ./test/non-functional/orphaned-data/query.it-spec.ts

cd "$START_DIR" || exit
dataBefore=$(mysql --user=root --host=$DATABASE_HOST --password=$MYSQL_ROOT_PASSWORD --protocol tcp  alkemio < cmds.txt --skip-column-names )
echo "$dataBefore" > file1.txt
cat file1.txt
echo check after save

# Run test
npm run-script test:orphaned ./test/non-functional/orphaned-data/hub/hub-delete.it-spec.ts

cd "$START_DIR" || exit
dataAfter=$(mysql --user=root --host=$DATABASE_HOST --password=$MYSQL_ROOT_PASSWORD --protocol tcp  alkemio < cmds.txt --skip-column-names)

echo "$dataAfter" > file2.txt
cat file2.txt
sort file1.txt >file1.txt.sorted
sort file2.txt >file2.txt.sorted
diff file1.txt file2.txt | grep ">" | sed 's/^> //g' > diff_file_hub

npm run stop-process
echo service stopped
