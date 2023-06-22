# Run tests Script Readme

## Using this script is dangerous and will lead to data loss.

## Usage

### .ENV file

The flag `SKIP_USER_REGISTRATION=` must be `false`

```bash
sh check_orphaned_data.sh <endpoint of test> <file to store the difference> create-snapshot.config
```

Example:
`sh check_orphaned_data.sh user/user-delete.it-spec.ts diff_file_user create-snapshot.config`

Where:

- `<sh user_data.sh>` - is the type of entity you are about to check for orphaned data

### Config Files

#### run-tests.config

This are the settings for the database to witch the migrations are run against.

They must be the same as the one the server is using.

```bash
# === Server ===
MYSQL_DATABASE=alkemio
DATABASE_HOST=localhost
MYSQL_ROOT_PASSWORD=toor
SNAPSHOT_SERVER_DIR=../z/server
```

### Script parameters

#### Endpoints of tests

user/user-delete.it-spec.ts
organization/organization-delete.it-spec.ts
space/space-delete.it-spec.ts
challenge/challenge-delete.it-spec.ts
opportunity/opportunity-delete.it-spec.ts

#### Files to store the differences

diff_file_user
diff_file_organization
diff_file_space
diff_file_challenge
diff_file_opportunity
