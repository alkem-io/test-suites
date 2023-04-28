#!/bin/sh

SCRIPT_DIR=$(dirname $(realpath $0))
PROJECT_ROOT_DIR=$SCRIPT_DIR/..
#TEST_RUN_BACKUP_FILE_NAME=backup.`date +"%Y%m%d%H%M%S"`.sql
TEST_RUN_SERVER_DIR=server
TEST_RUN_INITIAL_DIR=$PWD
SNAPSHOT_SERVER_DIR=../server

# If local directory config file exists loadd it
if [ -f "$SCRIPT_DIR/run-tests.config.local" ]; then
    . $SCRIPT_DIR/run-tests.config.local
fi

echo === CONFIGURATION ===
echo "SERVER FOLDER: ${SNAPSHOT_SERVER_DIR}"
echo "DATABASE: ${MYSQL_DATABASE:=alkemio5}"
echo "HOST: ${DATABASE_HOST:=localhost}"
echo "PORT": ${MYSQL_DB_PORT:=3306}
echo "PASSWORD: ${MYSQL_ROOT_PASSWORD:=toor}"
echo =====================


executeCommand() {
    mysql --user=root --host=$DATABASE_HOST --password=$MYSQL_ROOT_PASSWORD --protocol tcp --port=${MYSQL_DB_PORT} -e "$1"
     echo Connect db
}

restoreDatabase() {
  executeCommand "DROP DATABASE IF EXISTS ${MYSQL_DATABASE};"
  echo drop db
  executeCommand "CREATE DATABASE ${MYSQL_DATABASE};"
  echo recreate db
  ##mysql --user=root --host=$DATABASE_HOST --password=$MYSQL_ROOT_PASSWORD --protocol tcp --port=${MYSQL_DB_PORT} ${MYSQL_DATABASE} < $1
}

  #   mysql --user=root --host=$DATABASE_HOST --password=$MYSQL_ROOT_PASSWORD --protocol tcp --port=${MYSQL_DB_PORT} -e "$1"
  #    echo Connect db
  #    executeCommand "DROP DATABASE IF EXISTS ${MYSQL_DATABASE};"
  # echo drop db
  #   executeCommand "CREATE DATABASE ${MYSQL_DATABASE};"
  # echo recreate db
  cd $SNAPSHOT_SERVER_DIR

# Run migrations
npm run migration:run

  echo migration finished
whoami
date


cd $PROJECT_ROOT_DIR
#whoami
# Run tests
for testFile in ./test/functional-api/integration/organization/organization.it-spec.ts*
do
  npm run-script test:integration $testFile
done

cd $SCRIPT_DIR

rm $TEST_RUN_BACKUP_FILE_NAME