#!/bin/sh

# Set default values
START_DIR=$PWD
SCRIPT_DIR=$(dirname $(realpath $0))
SNAPSHOT_SERVER_DIR=. $SCRIPT_DIR/create-snapshot.dir.config
export MYSQL_DATABASE=alkemio-safe-for-deletion
export DATABASE_HOST=localhost
export MYSQL_DB_PORT=3306
export MYSQL_ROOT_PASSWORD=toor
export MYSQL_QUERIES=cmds.txt


# Get snapshot of data before operations
cd "$START_DIR" || exit
dataBefore=$(mysql --user=root --host=$DATABASE_HOST --password=$MYSQL_ROOT_PASSWORD --protocol tcp  alkemio < cmds-auth.txt --skip-column-names )
echo "$dataBefore" > $1
#cat $1
echo check after save

