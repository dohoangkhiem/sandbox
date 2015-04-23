module.exports = function(app, datastore) {
  var passport = require('passport');
  var LocalStrategy = require('passport-local').Strategy;
  var bodyParser = require('body-parser');
  //var cookieParser = require('cookie-parser');
  //var session = require('express-session');

  //app.use(cookieParser);
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  //app.use(session({
  //    secret: 'keyboard cat',
  //    resave: true,
  //    saveUninitialized: false
  //}));

  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/', function(req, res, next) {
    console.log(req.user);
    if (req.user) {
      res.redirect('/chat');
    } else {
      res.redirect('/login');
    }
  });

  app.get('/login', function(req, res) {
    res.render('login');
  });

  app.post('/login', 
    passport.authenticate('local', { successRedirect: '/chat', failureRedirect: '/login', failureFlash: true })
  );

  passport.use(new LocalStrategy(
    function(username, password, done) {

      datastore.getUserByName(username, function(err, user) {
        if (err) {
          console.log('Error: ' + err);
          return done(err);
        }

        console.log(user);

        if (!user) {
          console.log('Error: Incorrect username');
          return done(null, false, { error: 'Incorrect username' });
        }
        if (user.password != password) {
          console.log('Error: Incorrect password');
          return done(null, false, { error: 'Incorrect password' });
        }

        console.log('Authentication successful');
        return done(null, user);
      });

      /*
      User.findOne({ username: username }, function (err, user) {
        if (err) { return done(err); }
        if (!user) {
          return done(null, false, { message: 'Incorrect username.' });
        }
        if (!user.validPassword(password)) {
          return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
      });
      */
    }
  ));

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {

    datastore.getUser(id, function(err, user) {
      done(err, user);
    });

    //User.findById(id, function(err, user) {
    //  done(err, user);
    //});
  });
}