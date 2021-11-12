#!/bin/sh

# Set default values
START_DIR=$PWD
SCRIPT_DIR=$(dirname $(realpath $0))
PROJECT_ROOT_DIR=$SCRIPT_DIR/..
SNAPSHOT_OUTPUT_FILE_NAME=backup.`date +"%Y%m%d"`.sql
SNAPSHOT_POPULATOR_DIR=../populator
SNAPSHOT_SERVER_DIR=../server
export MYSQL_DATABASE=alkemio-safe-for-deletion
export DATABASE_HOST=localhost
export MYSQL_DB_PORT=3306
export MYSQL_ROOT_PASSWORD=toor
export ALLOW_HUB_CREATION=true

# If local directory config file exists loadd it
if [ -f "$SCRIPT_DIR/create-snapshot.config.local" ]; then
    . $SCRIPT_DIR/create-snapshot.config.local
fi

# If local directory config file exists loadd it
if [ -f "$SCRIPT_DIR/create-snapshot.dir.config.local" ]; then
    . $SCRIPT_DIR/create-snapshot.dir.config.local
fi

# Load config file
if [ -f "$1" ]; then
    . ./$1
else
    echo Config file does not exist!
    exit
fi

echo "Next step will destroy DB '${MYSQL_DATABASE}' if exists."
read -p  "Do you want to continue? [y/N] " REPLY
echo
if [ "$REPLY" != 'y' -a "$REPLY" != 'Y' ]
then
    return 1
fi

# Print configuration

echo === CONFIGURATION ===
echo "SERVER FOLDER: ${SNAPSHOT_SERVER_DIR}"
echo "POPULATOR FOLDER: ${SNAPSHOT_POPULATOR_DIR}"
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
cd $PROJECT_ROOT_DIR/$SNAPSHOT_SERVER_DIR
echo $MYSQL_DATABASE
# Run migrations
npm run migration:run

# Navigate to the populator folder
cd $PROJECT_ROOT_DIR/$SNAPSHOT_POPULATOR_DIR

# Run population
npm run populate

cd $START_DIR

mysqldump --user=root --password=${MYSQL_ROOT_PASSWORD} --protocol tcp --host=${DATABASE_HOST} ${MYSQL_DATABASE} > ${SNAPSHOT_OUTPUT_FILE_NAME}
