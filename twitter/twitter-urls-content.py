#!/usr/bin/env python

import datastore
import json
import contentdetector
import traceback
import ast

def grabContent():
  articles = []
  tweets = list(datastore.load('twitter_tweets'))
  tweets = tweets[0:10]
  print "Loaded " + str(len(tweets)) + " tweets from `twitter_tweets` table"
  index = 0
  url_counter = 0
  for tweet in tweets:
    index = index + 1
    tweet_id = tweet['id']
    user_id = tweet['user_id']
    user_screen_name = tweet['user_screen_name']
    text = tweet['text']
    urls = tweet['urls']
    print str(index) + ": Processing tweet " + str(tweet_id)
    if urls is not None and urls.strip() != '':
      #urls = dict(json.loads(urls, encoding="utf-8"))
      try:
        urls = ast.literal_eval(urls)
      except Exception as e:
        continue
      print "Found " + str(len(urls)) + " urls"
      for url in urls:
        url_counter = url_counter + 1
        display_url = urls[url]
        print "Grabbing content from " + url + " ..."
        content = None
        try:
          content = contentdetector.upgradeLink(url)
        except Exception as e:
          print "Exception occurs when trying to grab content from " + url
          traceback.print_exc()
        if content is not None and content.strip() != '':
          articles.append({ "tweet_id": tweet_id, "user_id": user_id, "user_screen_name": user_screen_name,
                          "text": text, "url": url, "display_url": display_url, "content": content  })
  
  print "Total urls processed: " + str(url_counter)
  print "Total articles grabbed: " + str(len(articles))
  
  datastore.store(articles, 'twitter_articles', '')
  
if __name__ == "__main__":
  grabContent()
  #s = "{u'http://t.co/NuYVD3Ih': u'http://say.ly/rEb4s1i'}"
  #obj = ast.literal_eval(s)
  #print obj
  