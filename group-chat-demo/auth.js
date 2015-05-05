module.exports = function(app, datastore) {
  var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    BasicStrategy = require('passport-http').BasicStrategy,
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    flash = require('connect-flash');

  //app.use(express.static('public'));
  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(session({ secret: 'keyboard cat', saveUninitialized: true, resave: true, cookie: { maxAge: 600000 } }));
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

        console.log('Authentication successful');
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
  app.get('/rest/*', passport.authenticate('basic', { session: false }), function(req, res) {
    console.log('Rest request passes');
  });

  // ROUTES
  app.post(['/login', '/login*'], function(req, res, next) {
    console.log('loggin in ...');
    var returnUrl = '/welcome';
    if (req.query.returnUrl) {
      returnUrl = req.query.returnUrl;
    }
    passport.authenticate('local', { successRedirect: returnUrl,
                                     failureRedirect: '/login',
                                     failureFlash: true })(req, res, next);
  });

  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  app.get('/', function(req, res) {
    if (req.isAuthenticated()) {
      res.redirect('/welcome');
    } else {
      res.redirect('/login');
    }
  })

  app.get('/private/*', function(req, res) {
    if (req.isAuthenticated()) {
      res.render('private');
    } else {
      res.redirect('/login?returnUrl=' + req.originalUrl);
    }
  });

  app.get('/login', function(req, res) {
    if (req.isAuthenticated()) {
      if (req.query.returnUrl) {
        res.redirect(req.query.returnUrl);
      } else res.redirect('/welcome');
    } else {
      res.render('login', { error: req.flash('error') });
    }
  });

  app.get('/welcome', function(req, res) {
    if (req.isAuthenticated()) {
      res.render('welcome', { 'user': req.user });
    } else {
      res.redirect('/login');
    }
  })

  app.get('/chat', function(req, res, next) {
    if (req.isAuthenticated()) {
      // get all groups
      datastore.getAllGroups(function(err, reply) {
        if (err) {
          return next(err);
        }

        var groups = [];
        for (var gr in reply) groups.push({ 'id': gr, 'title': reply[gr] });

        res.render('simple_client', { 'groups': groups, 'user': req.user });  

      });
    } else {
      res.redirect('/login?returnUrl=/chat');
    }
  });
  
}