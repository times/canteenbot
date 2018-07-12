# CanteenBot Slack

The `slack` function powers a Slackbot that can be installed into any number of
Slack teams.

The Slackbot can be installed for your team by clicking
[here](https://slack.com/oauth/authorize?client_id=2152947400.279832904515&scope=incoming-webhook,commands).

During the installation process the function handles Slack's OAuth flow and then
stores a record of the authenticated Slack team in DynamoDB. The function
expects the `canteenbot` DyanmoDB table to already exist and to be accessible to
the `slack` Lambda function.

## Slash commands

The Slackbot listens for [slash commands](https://api.slack.com/slash-commands)
via POST. It will then query the core server for data accordingly, and return a
message formatted for Slack.

All commands must begin with `/canteen`.

Valid menu commands are:

`/canteen today` | `/canteen tomorrow` | `/canteen monday` | `/canteen tuesday` | `/canteen wednesday` | `/canteen thursday` | `/canteen friday` | `/canteen saturday` | `/canteen sunday`

Running `/canteen` alone will default to `/canteen today`.

Valid ingredient commands look like `/canteen ingredient burger`.

You can also run `/canteen help`. The implementation of help commands is
delegated to the service integrations rather than being handled by the core
server.

## Slack notifier

The Slackbot will also post the current day’s menu to a Slack channel on a
schedule via an [incoming webhook](https://api.slack.com/incoming-webhooks). The
channel is configured during the installation process.
