#!/usr/bin/env python

from lxml import html
import requests
import json
import time
import sys
import os.path

path = ''

days = [
    {
        'day': 'Monday',
        'url': 'http://5438cpa251hgt.co.uk/canteen-monday'
    } , {
        'day': 'Tuesday',
        'url': 'http://5438cpa251hgt.co.uk/canteen-tuesday'
    }, {
        'day': 'Wednesday',
        'url': 'http://5438cpa251hgt.co.uk/canteen-wednesday'
    }, {
        'day': 'Thursday',
        'url': 'http://5438cpa251hgt.co.uk/canteen-thursday'
    }, {
        'day': 'Friday',
        'url': 'http://5438cpa251hgt.co.uk/canteen-friday'
    }, {
        'day': 'Saturday',
        'url': 'http://5438cpa251hgt.co.uk/canteen-saturday'
    }, {
        'day': 'Sunday',
        'url': 'http://5438cpa251hgt.co.uk/canteen-sunday'
    }
]

locations = set()

location_tag = 'strong'
food_tags = ['h2', 'h3', 'p']


# Scrapes a URL and returns a tree representing that day's menu
def scrape(url):
    page = requests.get(url, headers={'user-agent': 'canteenbot/0.2'})
    print url, page.status_code
    tree = html.fromstring(page.text)
    return tree.xpath('//section[@id="content-wrapper"]//div[@class="sqs-block-content"]')


# Walk the tree of scraped elements and construct a string from the menu text
def walkTree(tree, s):
    for t in tree:

        # Deal with any edge cases by modifying the element
        t = handleEdgeCases(t)

        # Find locations dynamically and keep record of them
        if t.tag == location_tag and t.text:
            title = t.text.strip().lower().title()
            locations.add(title)

        # These tags should contain actual menu items
        if t.tag in food_tags: s += '\n'

        # Store the text and/or the tail (nested elements), ignoring comments
        if t.text and ('Comment' not in str(t.tag)): s += ' ' + t.text.strip()
        if t.tail: s += ' ' + t.tail.strip()
        s = walkTree(t, s)
    return s


# Account for typos and other consistent errors on the canteen website 
def handleEdgeCases(t):
    
    # Location-related cases
    if (t.tag == location_tag and t.text):
        title = t.text.strip().lower().title()

        # 'Clas sics' typo
        if title == 'Clas' or title == 'Sics':
            if 'Classics' in locations:
                t.text = ''
            else:
                t.text = 'Classics'

    return t


# For sanity checks
def printTree(tree, indent):
    for t in tree:
        print indent, t, t.tag, len(t)
        printTree(t, indent + '\t')


if __name__=='__main__':

    os_path = os.path.dirname(__file__);

    with open(os_path + '/../env.json') as f:
        env_data = json.load(f)
        path = os_path + '/' + env_data['dataPathDev']

    # Prepare results array
    results = []
    for d in days:
        c = d.copy()
        c.update({ 'timestamp': time.strftime('%c'), 'locations': [] })
        results.append(c)

    # Now scrape each day in turn
    for i in range(len(days)):
        locations = set()
        tree = scrape(days[i]['url'])[0]

        # Split up the menu text into individual lines
        lines = walkTree(tree, '').split('\n')
        lines = map(lambda x: x.lower().strip(), lines)

        menus = []
        m = { 'location': '', 'menu': '' }

        for l in lines:
            # If the line is a location delimiter, append the menu and begin a new one
            if l.title() in locations:
                if (m['location']): menus.append(m)
                m = { 'location': l.title(), 'menu': '' }
            # Otherwise just append the text to the current menu
            else:
                m['menu'] += l.capitalize()
        
        # Don't forget the final menu
        menus.append(m)

        results[i]['locations'] = menus

        time.sleep(2)

    # Store the results for each day
    for r in results:
        with open(path + r['day'].lower() + '.json', 'w') as f:
            json.dump(r, f)

    # Get the day of the week as a number (Mon = 0, Sun = 6), and store today's menu
    day = int(time.strftime('%w'))

    today = (day + 6) % 7
    with open(path + 'today.json', 'w') as f:
        json.dump(results[today], f)

    tomorrow = (day + 7) % 7
    with open(path + 'tomorrow.json', 'w') as f:
        json.dump(results[tomorrow], f)
