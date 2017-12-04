# CanteenBot

Accessing the canteen menu for The News Building is hard. This repo contains a
scraper and various service integrations to make life a little easier.

CanteenBot is built as a series of
[Serverless](https://serverless.com/framework/docs/) functions and hosted on AWS
Lambda. Each function has at minimum a `handler.js` file, which is Serverless’
entry point.

## Core

The core server accepts requests from service integrations in the format
`http://[coreURL]?message_type=TYPE&message_param=PARAM` and returns data
accordingly.

Valid message types are:

* `MENU` for requesting a given day’s menu
* `INGREDIENT` for requesting a list of days on which a given ingredient is
  being served

### Menus

Valid message parameters for the `MENU` type are:

`today` | `tomorrow` | `monday` | `tuesday` | `wednesday` | `thursday` |
`friday` | `saturday` | `sunday`

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

* `url`: the relevant page of the canteen’s website
* `timestamp`: the timestamp at which the menu was scraped
* `day`: the day of the week the menu is for
* `locations`: an array of `menu` and `location`, which represent the different
  options available in the canteen that day

### Ingredients

The message parameter for the `INGREDIENT` type must not be blank. If multiple
words are passed, only the first will be considered.

For example:

    http://[coreURL]?message_type=INGREDIENT&message_param=potato

The current version of CanteenBot does a simple string match, so for example
`burgers` may return no results if the menu actually says `burger`.

The response will be JSON in the following format:

```
{
  "data": [
    "Tuesday"
  ]
}
```

The `data` field will be an array of all the days on which the given ingredient
appears in a menu.

### Errors

Error messages will be JSON in the following format:

```
{
  "error": "Both message_type and message_param must be provided."
}
```

## Scraper

The `scraper` function scrapes the canteen’s website on a regular basis,
converts the results to JSON and places the resulting files on S3.

## Slack

The `slack` function powers a Slackbot that can be installed into any number of
Slack teams.

The Slackbot can be installed for your team by clicking
[here](https://slack.com/oauth/authorize?client_id=2152947400.279832904515&scope=incoming-webhook,commands).

During the installation process the function handles Slack's OAuth flow and then
stores a record of the authenticated Slack team in DynamoDB. The function
expects the `canteenbot` DyanmoDB table to already exist and to be accessible to
the `slack` Lambda function.

### Slash commands

The Slackbot listens for [slash commands](https://api.slack.com/slash-commands)
via POST. It will then query the core server for data accordingly, and return a
message formatted for Slack.

All commands must begin with `/canteen`.

Valid menu commands are:

`/canteen today` | `/canteen tomorrow` | `/canteen monday` | `/canteen tuesday`
| `/canteen wednesday` | `/canteen thursday` | `/canteen friday` | `/canteen
saturday` | `/canteen sunday`

Running `/canteen` alone will default to `/canteen today`.

Valid ingredient commands look like `/canteen ingredient burger`.

You can also run `/canteen help`. The implementation of help commands is
delegated to the service integrations rather than being handled by the core
server.

### Slack notifier

The Slackbot will also post the current day’s menu to a Slack channel on a
schedule via an [incoming webhook](https://api.slack.com/incoming-webhooks). The
channel is configured during the installation process.

## Alexa

The `alexa` function makes CanteenBot available via an Amazon Alexa skill,
available [here](http://alexa.amazon.co.uk/spa/index.html?#skills/dp/B01M4IGA2S)
on the skill store.

The name of the skill is TNB Canteen and you can invoke it with `news canteen`.
For example:

* "Alexa, open news canteen"
* "Alexa, ask news canteen what's for lunch today"
* "Alexa, ask news canteen what's on the menu tomorrow"

The Alexa skill does not currently support ingredient queries.

## Serverless

The Serverless configuration is stored in `serverless.yml`.

Environment variables are stored in `env.yml`, which should not be committed to
version control. A sample version of this file is included as `env-sample.yml`.

# Development

While working:

    npm start

Build for production:

    npm run build

Deployment:

    serverless deploy

# Contributing

Issues and pull requests are welcome!
