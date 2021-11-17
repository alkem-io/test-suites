#!/bin/sh

SCRIPT_DIR=$(dirname $(realpath $0))
PROJECT_ROOT_DIR=$SCRIPT_DIR/..
TEST_RUN_BACKUP_FILE_NAME=backup.`date +"%Y%m%d%H%M%S"`.sql
TEST_RUN_SERVER_DIR=server
TEST_RUN_INITIAL_DIR=$PWD

# If local directory config file exists loadd it
if [ -f "$SCRIPT_DIR/run-tests.config.local" ]; then
    . $SCRIPT_DIR/run-tests.config.local
fi

echo === CONFIGURATION ===
echo "DATABASE: ${MYSQL_DATABASE:=alkemio5}"
echo "HOST: ${DATABASE_HOST:=localhost}"
echo "PORT": ${MYSQL_DB_PORT:=3306}
echo "PASSWORD: ${MYSQL_ROOT_PASSWORD:=toor}"
echo =====================

if [ ! -f "$1" ]; then
    echo Please provide snapshot file to restore!
    exit
fi

executeCommand() {
    mysql --user=root --host=$DATABASE_HOST --password=$MYSQL_ROOT_PASSWORD --protocol tcp --port=${MYSQL_DB_PORT} -e "$1"
}

restoreDatabase() {
  executeCommand "DROP DATABASE IF EXISTS ${MYSQL_DATABASE};"
  executeCommand "CREATE DATABASE ${MYSQL_DATABASE};"
  mysql --user=root --host=$DATABASE_HOST --password=$MYSQL_ROOT_PASSWORD --protocol tcp --port=${MYSQL_DB_PORT} ${MYSQL_DATABASE} < $1
}

backupDatabse() {
  mysqldump --user=root --password=${MYSQL_ROOT_PASSWORD} --protocol tcp --host=${DATABASE_HOST} --port=${MYSQL_DB_PORT} ${MYSQL_DATABASE} > $1
}

backupDatabse $TEST_RUN_BACKUP_FILE_NAME

cd $PROJECT_ROOT_DIR
# Run tests
for testFile in ./test/non-functional/auth/*
do
  cd $SCRIPT_DIR
  if restoreDatabase $1; then
    echo "Snapshot restored"
    echo
  fi
  cd $PROJECT_ROOT_DIR

  npm run-script test:it $testFile
done

if restoreDatabase $TEST_RUN_BACKUP_FILE_NAME; then
  echo "Initial database restored"
fi

rm $TEST_RUN_BACKUP_FILE_NAME