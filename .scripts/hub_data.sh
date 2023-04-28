#!/bin/sh

# Set default values
SCRIPT_DIR=$(dirname $(realpath $0))
PROJECT_ROOT_DIR=$SCRIPT_DIR/..

# Make the scripts executable
pwd
chmod +x common.sh
chmod +x experiment.sh
chmod +x get_data_snapshot.sh

# Delete / Create / run Migrations / Start Alkemio Service
cd $SCRIPT_DIR
sh common.sh create-snapshot.config
#create-snapshot.config

# Perform initial test run, to generate the default users
cd $PROJECT_ROOT_DIR
npm run-script test:orphaned ./test/non-functional/orphaned-data/query.it-spec.ts


# Create snapshot of the data before performing the creation/deletion of entities
cd $SCRIPT_DIR
sh get_data_snapshot.sh file1.txt create-snapshot.config

# Run test
cd $PROJECT_ROOT_DIR
npm run-script test:orphaned ./test/non-functional/orphaned-data/organization/organization-delete.it-spec.ts

# Create snapshot of the data after performing the creation/deletion of entities
cd $SCRIPT_DIR
sh get_data_snapshot.sh file2.txt create-snapshot.config

# Compare the snapshots and print the tables that are different
sort file1.txt >file1.txt.sorted
sort file2.txt >file2.txt.sorted
diff file1.txt file2.txt | grep ">" | sed 's/^> //g' > diff_file_organization

# Stop server
npm run stop-process
echo service stopped