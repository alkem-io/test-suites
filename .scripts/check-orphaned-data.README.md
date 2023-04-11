# Run tests Script Readme

## Using this script is dangerous and will lead to data loss.

## Usage

### .ENV file

The flag `SKIP_USER_REGISTRATION=` must be `false`

```bash
<sh user_data.sh> create-snapshot.config
```

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
