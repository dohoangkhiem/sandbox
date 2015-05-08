var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    BasicStrategy = require('passport-http').BasicStrategy,
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    RedisStore = require('connect-redis')(session),
    flash = require('connect-flash');

var config = require('./config.js');

module.exports = function(app, datastore, redisClient) {
  
  //app.use(express.static('public'));
  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  
  app.use(session({ 
    store: new RedisStore({ client: redisClient }),
    secret: config.sessionCookieSecret, 
    saveUninitialized: true, 
    resave: true, cookie: 
    { maxAge: 600000 } 
  }));

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());

  passport.use('local', new LocalStrategy(
    function(username, password, done) {

      datastore.getUserByName(username, function(err, user) {
        if (err) {
          console.log('Error: ' + err);
          return done(err);
        }

        console.log(user);

        if (!user) {
          console.log('Error: Incorrect username');
          return done(null, false, { message: 'Incorrect username' });
        }
        if (user.password != password) {
          console.log('Error: Incorrect password');
          return done(null, false, { message: 'Incorrect password' });
        }

        console.log('Authentication successful');

        return done(null, user);
      });
    }
  ));

  passport.use('basic', new BasicStrategy(function(username, password, done) {
    datastore.getUserByName(username, function(err, user) {
        if (err) {
          console.log('Error: ' + err);
          return done(err);
        }

        console.log(user);

        if (!user) {
          console.log('Error: Incorrect username');
          return done(null, false, { message: 'Incorrect username' });
        }

        if (user.password != password) {
          console.log('Error: Incorrect password');
          return done(null, false, { message: 'Incorrect password' });
        }

        console.log('Basic authentication successful');
        return done(null, user);
      });
  }));


  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {

    datastore.getUser(id, function(err, user) {
      done(err, user);
    });
  });

  // protect REST APIs
  /*app.get(['/rest/*'], passport.authenticate('basic', { session: false }), function(req, res) {
    console.log('Rest request passes');
  });*/

  // ROUTES
  app.post(['/login', '/login*'], function(req, res, next) {
    var returnUrl = '/chat';
    if (req.query.returnUrl) {
      returnUrl = req.query.returnUrl;
    }
    passport.authenticate('local', { successRedirect: returnUrl,
                                     failureRedirect: '/login',
                                     failureFlash: true })(req, res, next);
  });

  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/login');
  });

  app.get('/', function(req, res) {
    if (req.isAuthenticated()) {
      res.redirect('/chat');
    } else {
      res.redirect('/login');
    }
  })

  /*app.get('/private/*', function(req, res) {
    if (req.isAuthenticated()) {
      res.render('private');
    } else {
      res.redirect('/login?returnUrl=' + req.originalUrl);
    }
  });*/

  app.get('/login', function(req, res) {
    if (req.isAuthenticated()) {
      if (req.query.returnUrl) {
        res.redirect(req.query.returnUrl);
      } else res.redirect('/welcome');
    } else {
      res.render('login', { error: req.flash('error') });
    }
  });

  /*app.get('/welcome', function(req, res) {
    if (req.isAuthenticated()) {
      res.render('welcome', { 'user': req.user });
    } else {
      res.redirect('/login');
    }
  })*/

  app.get('/chat', function(req, res, next) {
    if (req.isAuthenticated()) {
      // get all groups
      datastore.getUserGroups(req.user.id, function(err, groupIds) {
        if (err) {
          return next(err);
        }

        // hack here!
        groupIds.splice(0, 0, 1);
        
        datastore.getMultipleGroups(groupIds, function(err2, groupList) {
          res.render('simple_client', { 'groups': groupList, 'user': req.user });    
        });
      });
    } else {
      res.redirect('/login?returnUrl=/chat');
    }
  });

  module.exports.isAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) next();
    else passport.authenticate('basic', { session: false })(req, res, next);
  }

  module.exports.basicAuth = passport.authenticate('basic', { session: false });
  
}