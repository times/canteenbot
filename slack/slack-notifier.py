#!/usr/bin/env python

import requests
import json
import os.path

if __name__=='__main__':

    path = ''
    webhook_url = ''

    with open('../env.json') as f:
        env_data = json.load(f)

        os_path = os.path.dirname(__file__);

        path = os_path + '/' + env_data['dataPathDev']
        webhook_url = env_data['webhookUrl']

    with open(path, 'r+') as f:
        menu_data = json.load(f)
        
        menu_text = ""
        for location in menu_data['locations']:
            menu_text += '*' + location['location'] + '*\n'
            menu_text += location['menu'] + "\n"

        menu_url = menu_data['url']

        attachments = [{
            "fallback": "Today's menu",
            "color": "good",
            "title": "Today's menu",
            "title_link": menu_url,
            "fields": [
                {
                    "value": menu_text,
                    "short": False
                }
            ],
            "mrkdwn_in": ["fields"]
        }]

        payload = { 'attachments': attachments }

        r = requests.post(webhook_url, data=json.dumps(payload))
