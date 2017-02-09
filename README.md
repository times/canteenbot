# CanteenBot

Accessing the canteen menu for The News Building is hard. This repo contains a scraper and various service integrations to make life a little easier.

CanteenBot is built as a series of [Serverless](https://serverless.com/framework/docs/) functions and hosted on AWS Lambda. Each function has at minimum a `handler.js` file, which is Serverless’ entry point.


## Core

The core server accepts requests from service integrations in the format `http://[coreURL]?message_type=TYPE&message_param=PARAM` and returns data accordingly.

Valid message types are:

- `MENU` for requesting a given day’s menu
- `INGREDIENT` for requesting a list of days on which a given ingredient is being served

### Menus

Valid message parameters for the `MENU` type are:

`today` | `tomorrow` | `monday` | `tuesday` | `wednesday` | `thursday` | `friday` | `saturday` | `sunday`

For example:

    http://[coreURL]?message_type=MENU&message_param=monday


The response will be JSON in the following format:

```
{
  "data": {
    "url": "http://5438cpa251hgt.co.uk/canteen-thursday",
    "timestamp": "Thu Feb  2 11:00:01 2017",
    "day": "Thursday",
    "locations": [
      {
        "menu": "Malayasian market lamb kurma malaysian indian lamb curry with nasi biriyani and asian slaw add on: roti canai\n",
        "location": "Global Kitchen"
      },
      ...
    ]
  }
}
```

It contains the following fields:

- `url`: the relevant page of the canteen’s website
- `timestamp`: the timestamp at which the menu was scraped
- `day`: the day of the week the menu is for
- `locations`: an array of `menu` and `location`, which represent the different options available in the canteen that day


### Ingredients

The message parameter for the `INGREDIENT` type must not be blank. If multiple words are passed, only the first will be considered.

For example:

    http://[coreURL]?message_type=INGREDIENT&message_param=potato

The current version of CanteenBot does a simple string match, so for example `burgers` may return no results if the menu actually says `burger`.

The response will be JSON in the following format:

```
{
  "data": [
    "Tuesday"
  ]
}
```

The `data` field will be an array of all the days on which the given ingredient appears in a menu.


### Errors

Error messages will be JSON in the following format:

```
{
  "error": "Both message_type and message_param must be provided."
}
```


## Scraper

The scraper function scrapes the canteen’s website on a regular basis, converts the results to JSON and places the resulting files on a server.

TODO: rewrite this as a Serverless function.


## Slack

There are currently two Slack functions.

TODO: rewrite these as a single Slack app.


### Slash commands

The `slack` function listens for Slack [slash commands](https://api.slack.com/slash-commands) via POST. It will then query the core server for data accordingly, and return a message formatted for Slack.

All commands must begin with `/canteen`.

Valid menu commands are:

`/canteen today` | `/canteen tomorrow` | `/canteen monday` | `/canteen tuesday` | `/canteen wednesday` | `/canteen thursday` | `/canteen friday` | `/canteen saturday` | `/canteen sunday`

Running `/canteen` alone will default to `/canteen today`.

Valid ingredient commands look like `/canteen ingredient burger`.

You can also run `/canteen help`. The implementation of help commands is delegated to the service integrations rather than being handled by the core server.


### Slack notifier

The `slack-notifier` function posts the current day’s menu to a Slack [incoming webhook](https://api.slack.com/incoming-webhooks) on a schedule.


## Alexa

The Alexa function makes CanteenBot available via a Amazon Alexa skill.

The prototype Alexa skill can be found [here](http://alexa.amazon.co.uk/spa/index.html?#skills/dp/B01M4IGA2S) on the skill store.

TODO: rewrite this as a Serverless function.


## Serverless

The Serverless configuration is stored in `serverless.yml`.

Environment variables are stored in `env.yml`, which should not be committed to version control. A sample version of this file is included as `env-sample.yml`.


# Development

While working:

    npm start

Build for production:

    npm run build

Deployment:

    serverless deploy


# Contributing

Issues and pull requests are welcome!
