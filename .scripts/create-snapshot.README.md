# Create Snapshot Script Readme

## Using this script is dangerous and can lead to data loss.

## Usage

The script must be executed from within the .scripts folder.

```bash
sh create-snapshot.sh [config file]

```

Where:

- `<config file>` - Is the config file which contains all env variables required for the script to run properly.

**NB: If no configuration file is passed the default .env configs for server migrations and populator will be used. Results will be unpredictable.**

## Config Files

### create-snapshot.config

There is a `create-snapshot.config.example` shows all variables which can be configured. They are split in 3 categories: `server`, `populator` and `script`

**the environment variables `export` is mandatory otherwise the npm scripts won't be able to use them.**

```bash
# === Server ===
export MYSQL_DATABASE=alkemio
export DATABASE_HOST=localhost
export MYSQL_ROOT_PASSWORD=toor

# === Populator ===
export ALKEMIO_SERVER='http://localhost:3000/graphql'
export ALKEMIO_DATA_TEMPLATE='alkemio-sdgs.ods'
export AUTH_ADMIN_EMAIL=admin@alkem.io
export AUTH_ADMIN_PASSWORD=changeMe

# === Snapshot Script ===
export SNAPSHOT_OUTPUT_FILE_NAME=output.sql

```

There is an option to create `create-snapshot.config.local` config file with the same structure. This file will be loaded every time the script is executed and can be used for local settings which doesn't change often. The file has less priority than the provided config file as input parameter so the passed config file can contains only the small set of different configs.

Example:

`create-snapshot.config.local`:

```bash
# === Server ===
export MYSQL_DATABASE=alkemio
export DATABASE_HOST=localhost
export MYSQL_ROOT_PASSWORD=toor

# === Populator ===
export ALKEMIO_SERVER='http://localhost:3000/graphql'
export AUTH_ADMIN_EMAIL=admin@alkem.io
export AUTH_ADMIN_PASSWORD=changeMe
```

- config 1:

```bash
# === Populator ===
export ALKEMIO_DATA_TEMPLATE='alkemio-sdgs.ods'
# === Snapshot Script ===
export SNAPSHOT_OUTPUT_FILE_NAME=alkemio-sdgs.sql
```

- config 2:

```bash
# === Populator ===
export ALKEMIO_DATA_TEMPLATE='alkemio-test-space1.ods'
# === Snapshot Script ===
export SNAPSHOT_OUTPUT_FILE_NAME=alkemio-test-space1.sql
```

With this approach configuraton how to connect to the DB, and to the server is available and it is not needed to be specified for every different export. With the small configs is easy to just pass the required parameters for importing different data and dumping the result in different .sql file.

### create-snapshot.dir.config.local

**To operate the script requires exact folder names for where the server and populator folder are located. This can be modified.**

1. Create a file called `create-snapshot.dir.config.local` in current folder.
2. The file must contains one of next values:

```
SNAPSHOT_SERVER_DIR=../server
SNAPSHOT_POPULATOR_DIR=../populator
```

The folder path and name should be relative to this repository root folder. If the `test-suties` folder is located into:
`~/src/alkemio/test-suites`

The example will correspond to:

```
~/src/alkemio/server
~/src/alkemio/populator
```
