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

**the environment variables `export` is mandatory otherwise the npm scripts won't be able to use them.**

This are the settings for the database to witch the migrations are run against.

They must be the same as the one the server is using.

```bash
# === Server ===
export MYSQL_DATABASE=alkemio
export DATABASE_HOST=localhost
export MYSQL_ROOT_PASSWORD=toor

```

### run-tests.dir.config.local

**To operate the script requires exact folder names for where the server and populator folder are located. This can be modified.**

1. Create a file called `run-tests.dir.config.local` in current folder.
2. The file must contains one of next values:

```
TEST_RUN_SERVER_DIR=server
```
