# Run tests Script Readme

## Using this script is dangerous and can lead to data loss.

## Usage

```bash
sh run-test.sh <snapshot.sql file>
```

Where:

- `<snapshot.sql file>` - is the db snapshot that will be applyed

## Config Files

### run-tests.config.local

This are the settings for the database to witch the migrations are run against.

They must be the same as the one the server is using.

```bash
# === Server ===
MYSQL_DATABASE=alkemio
DATABASE_HOST=localhost
MYSQL_ROOT_PASSWORD=toor

```
