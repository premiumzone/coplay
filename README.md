# CoPlay

## Setup

### Install NodeJS v5+ and npm

### Install Node dependencies

    npm install

### Install frontend dependencies

    node_modules/.bin/bower install

### Set up configuration file

    cp config.js.template config.js

... and change `config.js` to use your credentials.

### Install MongoDB

If you haven't already installed mongodb, do (MacOS X instructions only):

    brew install mongodb

… and then run:

    brew services start mongodb

Open the mongo shell with:

    mongo

… and do:

    use coplay

## Start application

    # Development
    npm run serve-dev

If you're running locally you can pass the environment variable
`PUBLIC_TEST_IP` in order to override the public IP sent to the API to
get the current zone.

    # Production
    npm run serve-prod

## License

MIT, see [LICENSE](https://github.com/premiumzone/coplay/blob/master/LICENSE)
