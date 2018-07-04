# CanteenBot Core

The core server accepts requests from service integrations in the format
`http://[coreURL]?message_type=TYPE&message_param=PARAM` and returns data
accordingly.

Valid message types are:

- `MENU` for requesting a given day’s menu
- `INGREDIENT` for requesting a list of days on which a given ingredient is
  being served

## Menus

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

- `url`: the relevant page of the canteen’s website
- `timestamp`: the timestamp at which the menu was scraped
- `day`: the day of the week the menu is for
- `locations`: an array of `menu` and `location`, which represent the different
  options available in the canteen that day

## Ingredients

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

## Errors

Error messages will be JSON in the following format:

```
{
  "error": "Both message_type and message_param must be provided."
}
```
