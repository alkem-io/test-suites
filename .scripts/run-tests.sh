#!/bin/sh

SCRIPT_DIR=$(dirname $(realpath $0))
PROJECT_ROOT_DIR=$SCRIPT_DIR/..
TEST_RUN_BACKUP_FILE_NAME=backup.`date +"%Y%m%d%H%M%S"`.sql
TEST_RUN_SERVER_DIR=server
TEST_RUN_INITIAL_DIR=$PWD

export MYSQL_DATABASE=alkemio
export DATABASE_HOST=localhost
export MYSQL_ROOT_PASSWORD=toor

if [ ! -f "$1" ]; then
    echo Please provide snapshot file to restore!
    exit
fi

# If local directory config file exists loadd it
if [ -f "$SCRIPT_DIR/run-tests.dir.config.local" ]; then
    . $SCRIPT_DIR/run-tests.dir.config.local
fi

# If local directory config file exists loadd it
if [ -f "$SCRIPT_DIR/run-tests.config.local" ]; then
    . $SCRIPT_DIR/run-tests.config.local
fi

executeCommand() {
    mysql --user=root --host=$DATABASE_HOST --password=$MYSQL_ROOT_PASSWORD --protocol tcp -e "$1"
}

restoreDatabase() {
  mysql --user=root --host=$DATABASE_HOST --password=$MYSQL_ROOT_PASSWORD --protocol tcp ${MYSQL_DATABASE} < $1
}

backupDatabse() {
  mysqldump --user=root --password=${MYSQL_ROOT_PASSWORD} --protocol tcp --host=${DATABASE_HOST} ${MYSQL_DATABASE} > $1
}

backupDatabse $TEST_RUN_BACKUP_FILE_NAME

if executeCommand "DROP DATABASE IF EXISTS ${MYSQL_DATABASE};"; then
    echo "Database $MYSQL_DATABASE droped!"
fi

if executeCommand "CREATE DATABASE ${MYSQL_DATABASE};"; then
    echo "Database $MYSQL_DATABASE created!"
fi

if restoreDatabase $1; then
  echo "Snapshot restored"
fi

# Run migrations

cd ..
cd $SCRIPT_DIR/../../$TEST_RUN_SERVER_DIR

npm run migration:run

cd $PROJECT_ROOT_DIR

# Run tests
for test in ./test/non-functional/auth/*
do
  npm run-script test:it $test
done

if restoreDatabase $TEST_RUN_BACKUP_FILE_NAME; then
  echo "Initial database restored"
fi

rm $TEST_RUN_BACKUP_FILE_NAME