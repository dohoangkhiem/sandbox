import twitter
import datastore
from datetime import datetime
import re
import traceback

global api
global me



def setup_key():
  global api, me
  api = twitter.Api(consumer_key='cJIc5ji9EMQDX3XT1fqZg',
    consumer_secret='KOZhtQAfjw8D2pDTTCWRLbQYB4hVJ0dvBoMSWPmAY',
    access_token_key='557374910-1Y5JqEllS2tR5nFnBMfdJy6XFodY9bH7W8n6nWgI',
    access_token_secret='TgSZBpkDXFFS5DTjn3tcVuTSpfxruefF6NaEm68k9DY')

  me = api.VerifyCredentials()
  print me

def change_key():
  global api, me
  api = twitter.Api(consumer_key='7noNko5fpodyWthwxTpEzA',
    consumer_secret='I7p3NKWpyq83yZzJy62GFQcbK9SwBSjlFQXaV1vn9Qk',
    access_token_key='557374910-aHNDrTJH97rmvpg0SIRvAxeP0yKnfGOb7GZdfr13',
    access_token_secret='dSdwle7MYRDK31BdLmVKSWbCCzGNBtWN5NT7xpG7E')
  
  me = api.VerifyCredentials()
  print me
  print "OAuth key has been changed successfully."
  
def new_key():
  global api, me
  api = twitter.Api(consumer_key='eqNmKOPLWiZwJDOPnA9g',
    consumer_secret='PnRzgbtlKWBhWFhb3hRRrWcJsO0lnIxSuugsZ7Ui0',
    access_token_key='557374910-lWbRRKnIAGcez0diHX7KNRfGDU12grJLHcwI1evk',
    access_token_secret='OL7DIZsZYoZpiRuGZocScN0u5IMHj0N5lh5vnn3U')
  
  me = api.VerifyCredentials()
  print me
  print "OAuth key has been changed successfully."

def get_friends():
  print "============================================="
  user_list = []
  user_ids = []
  followings = []
  users = api.GetFriends()
  print "You're following " + str(len(users)) + " users"
  print [u.name for u in users]
  
  print "=============================================="
  print "Friends's tweets"
  #for u in users:import traceback

  #  statuses = api.GetUserTimeline(u.screen_name)
  #  #print [s.text for s in statuses]
  #  print  u.name + " has " + str(len(statuses)) + " posts recently."
   
  for u in users:
    user_list.append(u.AsDict())
    user_ids.append(u.id)
    followings.append({"user_id": me.id, "friend_id": u.id})
    
  for u in users:
    friends = api.GetFriends(u.screen_name)
    #user_list.extend(friends)
    for friend in friends:
      followings.append({"user_id": u.id, "friend_id": friend.id})
      if (friend.id not in user_ids):
        user_list.append(friend.AsDict())
        user_ids.append(friend.id)
    print u.name + " has " + str(len(friends)) + " friends"
  print "Total users " + str(len(user_list))
  datastore.store(user_list, 'twitter_users', 'Twitter users')
  #datastore.store(followings, 'twitter_followings', 'Twitter followings')
    
def _get_tweets():
  tweets = []
  users = list(datastore.load('khiem.twitter_users'))
  
  for i in range(300,501):
    try:
      print str(i) + ': Getting tweets from user ' + users[i]['name']
      statuses = api.GetUserTimeline(screen_name=users[i]['screen_name'], count=200)
      for st in statuses:
        tweets.append(st.AsDict())
      print 'Processed ' + str(len(statuses)) + ' tweets for user ' + users[i]['name']
    except Exception as e:
      print e
      print 'Exception occurs when process user ' + users[i]['name'] + '. Skip.'
      continue
  
  print 'Storing tweets for ' + str(i) + ' users'
  # store all tweets
  datastore.store(tweets, 'twitter_tweets_300_500', 'Tweets')

def get_followings():
  users = list(datastore.load('khiem.twitter_users'))
  user_ids = []
  followings = []
  for i in range(0,len(users)-1):
    user_ids.append(users[i].id)
  
  for i in range(500, 751):
    user = users[i]
    #friend_ids = api.GetFriendIDs()
    #for friend_id in friend_ids:
     # if friend_id in user_ids:
     #   followings.append({"user_id": user["id"], "friend_id": friend_id})
    try: 
      follower_ids = api.GetFollowerIDs(userid=user["id"])["ids"]
      print str(i) + ": Found " + str(len(follower_ids)) + " followers of " + user.name
      for follower_id in follower_ids:
        if follower_id in user_ids:
          followings.append({"user_id": follower_id, "friend_id": user.id})
    except Exception as e:
      print e
      continue
        
  datastore.store(followings, 'twitter_followings_500_750', 'Twitter followings')
  print "Successfully persist followings: " + str(len(followings)) + " items"

def test():
  setup_key()
  
  follower_ids = api.GetFollowerIDs(userid=84249568)["ids"]
  
def userCompare(u1, u2):
  return cmp(u2.followers_count, u1.followers_count)

# find top 10 friends which are most popular, this function needs <= 1+10 request
# return 10 User objects
def findTopFriends(userid):
  friend_ids = api.GetFriendIDs(userid)["ids"]
  print "Found " + str(len(friend_ids)) + " friends for userid " + str(userid)
  friends_count = min(len(friend_ids), 1000)  
  parts_count = int((friends_count-1) / 100) + 1
  user_list = []
  for i in range(0, parts_count):
    sublist = []
    if i == parts_count-1:
      sublist = friend_ids[i*100:friends_count]
    else:
      sublist = friend_ids[i*100:(i+1)*100]
    user_list.extend(api.UsersLookup(user_id=sublist))
  user_list.sort(userCompare)
  return user_list[0:10]  

# find top 10 followers which are most popular, this function needs <= 1+10 requests
# return 10 User objects
def findTopFollowers(userid):
  follower_ids = api.GetFollowerIDs(userid)["ids"]
  print "Found " + str(len(follower_ids)) + " followers for userid " + str(userid)
  followers_count = min(len(follower_ids), 1000)  
  parts_count = int((followers_count-1) / 100) + 1
  user_list = []
  for i in range(0, parts_count):
    sublist = []
    if i == parts_count-1:
      sublist = follower_ids[i*100:followers_count]
    else:
      sublist = follower_ids[i*100:(i+1)*100]
    user_list.extend(api.UsersLookup(user_id=sublist))
  user_list.sort(userCompare)
  return user_list[0:10]
  
def waitFor():
  print "You have to wait "  + str(api.MaximumHitFrequency()) + " seconds"
  
  
# consumes 3*11 = 33 requests
# result: 30 users, 30 followings at level 1
def build_graph_level1():
  khiem_id = 557374910
  minh_le_id = 19104945
  nguyenthaiha_id = 47043030
  users_l1 = []
  khiem = api.GetUser(khiem_id)
  minh_le = api.GetUser(minh_le_id)
  nguyenthaiha = api.GetUser(nguyenthaiha_id)
  #users_l1.extend([khiem, minh_le, nguyenthaiha])
  list1 = findTopFriends(userid=khiem_id)
  list2 = findTopFriends(userid=minh_le_id)
  list3 = findTopFriends(userid=nguyenthaiha_id)
  users_l1.extend(list1)
  users_l1.extend(list2)
  users_l1.extend(list3)
  
  data = []
  followings = []
  for i in range(0,len(users_l1)):
    user = users_l1[i]
    print "User " + user.name + " has " + str(user.followers_count) + " followers"
    data.append(user.AsDict())
    
  for u in list1:
    followings.append({"user_id": khiem_id, "friend_id": u.id})
  for u in list2:
    followings.append({"user_id": minh_le_id, "friend_id": u.id})
  for u in list3:
    followings.append({"user_id": nguyenthaiha_id, "friend_id": u.id})
  
  datastore.store(data, "twitter_users_level1_new", "Twitter")
  datastore.store(followings, "twitter_followings_level1", "Twitter")
  
# consumes 30*11 = 330 authenticated requests to Twitter
# result: 300 users, 300 followings at level 2
def build_graph_level2():
  # get users from level1, except the top 3 users from level0
  users_level1 = list(datastore.load('khiem.twitter_users_level1'))
  users_level1 = users_level1[3:]

  users_l2 = []
  followings = []
  user_ids = []
  # for each user find top friends
  for user in users_level1:
    print "Find top friends of user " + user["name"]
    friends = findTopFriends(user["id"])
    for friend in friends:
      followings.append({"user_id": user["id"], "friend_id": friend.id})
      if friend.id not in user_ids:
        user_ids.append(friend.id)
        users_l2.append(friend.AsDict())
  
  datastore.store(users_l2, "twitter_users_level2", "")
  datastore.store(followings, "twitter_followings_level2", "")

# build graph level 3 from users_l2[start] -> users_l2[stop-1]
# and (stop - start) <= 15, total request for each segment: (stop-start) * 11 * 2
# Total number of users at level 2 is 210 => we need 210/15 = 14 segments
def build_graph_level3(start, stop):
  if (stop - start > 15):
    print "The [start, stop) range must not greater than 15, or (stop-start) <= 15"
    return

  users_l2 = list(datastore.load('khiem.twitter_users_level2'))
  users_l2 = users_l2[start:stop]
  user_ids = []
   
  followings = []
  users_l3 = []
  index = start
  try:
    for user in users_l2:
      print str(index) + ": Find top friends for user " + user['name']
      try:
        friends = findTopFriends(user["id"])
        for friend in friends:
          followings.append({"user_id": user["id"], "friend_id": friend.id})
          if friend.id not in user_ids:
            user_ids.append(friend.id)
            users_l3.append(friend.AsDict())
      except Exception as e:
        print "Exception occurs when find top friends of user " + user['name']
        traceback.print_exc()
      
      try:    
        print str(index) + ": Find top followers for user " + user['name']
        followers = findTopFollowers(user['id'])
        for follower in followers:
          followings.append({"user_id": follower.id, "friend_id": user['id']})
          if follower.id not in user_ids:
            user_ids.append(follower.id)
            users_l3.append(follower.AsDict())
      except Exception as e:
        print "Exception occurs when find top followers of user " + user['name']
        traceback.print_exc()
      index = index + 1
  except Exception as e:
    traceback.print_exc()
    print str(datetime.now())
    return
  
  datastore.store(users_l3, "twitter_users_level3_" + str(start) + "_" + str(stop-1), "")
  datastore.store(followings, "twitter_followings_level3_" + str(start) + "_" + str(stop-1), "")
  
  print str(datetime.now()) + ": Result at level 3, segment " + str(start) + "->" + str(stop-1) + ": " + str(len(users_l3)) + " users, " + str(len(followings)) + " followings"
       

# get top 10 tweet from 100 recent tweets
# 1 request
# return 10 Status objects
def getTopTweets(userid=-1, screen_name=None):    
  if (type(userid) is not int or userid < 0) and (screen_name is None or screen_name.strip() == ''):  
    print 'No userid or screen name'
    return
  username = screen_name if (screen_name is not None and screen_name != '') else " id " + str(userid)
  user = userid if type(userid) is int and userid > 0 else screen_name
  print 'Getting tweets from user ' + username
  statuses = api.GetUserTimeline(user, count=200, include_rts=True, include_entities=True)
  #statuses.sort(tweet_compare)
  print "Total tweets of user " + username + ": " + str(len(statuses))
  #return statuses[0:50]
  return statuses

def getTweets(start, stop):
  tweet_entities = ["id", "truncated", "hashtags", "urls", "user_mentions", "text", "source", "retweet_count", "created_at", "user", "favorited"]
  users = list(datastore.load('twitter_users_cleaned'))
  total_users = len(users)
  if (stop - start > 300):
    print "Max (stop-start) is 300"
    return
  users = users[start:stop]
  data = []
  index = start
  try:
    for u in users:
      print str(index) + ": Getting tweets for user " + u['name']
      try:
        tweets = getTopTweets(userid=int(u['id']))
        if (tweets is not None):
          print "Fetched " + str(len(tweets)) + " tweets of user " + u['name']
          for t in tweets:
            st = t.AsDict()
            obj = {}
            for prop in tweet_entities:
              if prop not in st:
                if prop == "retweet_count" or prop == "favorited" or prop == "truncated":
                  obj[prop] = 0
                else:
                  obj[prop] = ''
              elif prop == "user":
                user_obj = dict(st["user"])
                obj['user_id'] = user_obj['id']
                obj['user_screen_name'] = user_obj['screen_name']
                obj['user_name'] = user_obj['name']
              else:
                obj[prop] = st[prop]
            data.append(obj)
        else:
          print "Empty tweets for user " + u['name']
      except Exception as e:
        print 'Exception occurs when fetch tweets for user ' + u['name']
        traceback.print_exc()  
      index = index + 1
  except Exception as e:
    traceback.print_exc()
    print str(datetime.now())
    return
  
  
  
  datastore.store(data, 'twitter_tweets_cleaned_' + str(start) + '_' + str(stop-1), '')
  
  print str(datetime.now()) +  ' Result at segment ' + str(start) + ' -> ' + str(stop-1) + '/' + str(total_users) + ': Total ' + str(len(data)) + ' tweets'
  
# compare two tweets based on the number of hashtags and urls
# some other factors: retweet_count, mentions, 
def tweet_compare(t1, t2):
  link_cmp = cmp(1 if len(t2.urls) + len(t2.hashtags) > 0 else 0, 1 if len(t1.urls) + len(t1.hashtags) > 0 else 0)
  if (link_cmp != 0):
    return link_cmp
  else:
    return cmp(t2.id, t1.id)
  
def count_hashtags(tweet):
  return len(re.findall(r'(\A|\s)#(\w+)', tweet))

def count_links(tweet):
  return len(re.findall(r'(\A|\s)(http\:\\/\\/|https\:\\/\\/)(\w+)', tweet))

def count_mentions(tweet):
  return len(re.findall(r'(\A|\s)@(\w+)', tweet))
    
def rebuild_users_level1():
  users = list(datastore.load('khiem.twitter_users_level1'))
  users = users[3:]
  user_ids = []
  for u in users:
    user_ids.append(u["id"])
  
  users = api.UsersLookup(user_id=user_ids)
  user_data = []
  for u in users:
    user_data.append(u.AsDict())
  print "Successfully retrieve " + str(len(users)) + " users info"
  datastore.store(user_data, 'twitter_users_level1_rebuild', '')
  
def main():
  print "main() started at " + str(datetime.now())
  try:
    setup_key()
    #change_key()
    #build_graph_level3(195,210)
    #tweets = getTopTweets(screen_name='britneyspears')
    #for status in tweets:
    #  print str(status.id) + ": " + str(status.created_at) + ", text: " + status.text + ", " + str(len(status.hashtags)) + ", " + str(len(status.urls))
    #waitFor()
   
    getTweets(2100, 2400)
      
  finally:
    print "------------------------------------------------------"
    print "main() finished at " + str(datetime.now())
    print api.GetRateLimitStatus()
if __name__ == "__main__":
  main()