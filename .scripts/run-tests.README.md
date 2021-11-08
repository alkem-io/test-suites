# Run tests Script Readme

## Using this script is dangerous and can lead to data loss.

## Usage

```bash
sh run-test.sh <snapshot.sql file>

```

Where:

- `<snapshot.sql file>` - is the db snapshot that will be applyed

## Config Files

**To operate the script requires exact folder names for where the server and populator folder are located. This can be modified.**

1. Create a file called `run-tests.dir.config.local` in current folder.
2. The file must contains one of next values:

```
TEST_RUN_SERVER_DIR=server
```
