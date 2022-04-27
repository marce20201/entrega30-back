
const express = require('express')


const cookieParser = require('cookie-parser')

const session = require('express-session')

const mongoose = require('mongoose')

const app = express()

const User = require('./models/User')


const numCPUs = require('os').cpus().length;

/* -------------- Datos por CL -------------- */

const portCL = process.argv[2] || 3040;
const clientIDCL = process.argv[3] || ' 879847922671296';
const secretCL = process.argv[4] || '51daa9ffa69aa8482c3ae9dda3b369f0';
const modoCluster = process.argv[5] == 'CLUSTER'

/* -------------- PASSPORT w FACEBOOK -------------- */
const passport = require('passport');
const facebookStrategy = require('passport-facebook').Strategy;

/* -------------- login FB -------------- */
const FACEBOOK_CLIENT_ID = clientIDCL;
const FACEBOOK_CLIENT_SECRET = secretCL;

app.set("view engine", "ejs")
app.use(session({ secret: 'secret' }));

app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser());


mongoose
    .connect(
        'mongodb+srv://alanshalem:contraseña12345@coderhouse.3wlof.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }
    )
    .then(() => console.log('***DB CONNECTED***'))
    .catch((error) => console.log(`***DB CONNECTION ERROR => ${error}***`));


/* -------------------------------------------- */
/* MASTER */

if (modoCluster && cluster.isMaster) {
    // if Master, crea workers

    console.log(`Master ${process.pid} is running`);

    // fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork()
    };

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
    });
} else {
    // if !Master, alta al servidor + resto funcionalidades


    passport.use(new facebookStrategy({
        // pull in our app id and secret from our auth.js file
        clientID: FACEBOOK_CLIENT_ID,
        clientSecret: FACEBOOK_CLIENT_SECRET,
        callbackURL: "http://localhost:5000/facebook/callback",
        profileFields: ['id', 'displayName', 'name', 'gender', 'picture.type(large)', 'email']

    },// facebook will send back the token and profile
        function (token, refreshToken, profile, done) {

            // asynchronous
            process.nextTick(function () {

                // find the user in the database based on their facebook id
                User.findOne({ 'uid': profile.id }, function (err, user) {

                    // if there is an error, stop everything and return that
                    // ie an error connecting to the database
                    if (err)
                        return done(err);

                    // if the user is found, then log them in
                    if (user) {
                        console.log("user found")
                        console.log(user)
                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user found with that facebook id, create them
                        var newUser = new User();

                        // set all of the facebook information in our user model
                        newUser.uid = profile.id; // set the users facebook id                   
                        newUser.name = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
                        newUser.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first
                        newUser.pic = profile.photos[0].value

                        newUser.save(function (err) {
                            if (err)
                                throw err;

                            // if successful, return the new user
                            return done(null, newUser);
                        });
                    }

                });

            })

        }));

    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

    app.get('/profile', isLoggedIn, function (req, res) {
        console.log(req.user)
        res.render('profile', {
            user: req.user // get the user out of session and pass to template
        });
    });

    // route middleware to make sure
    function isLoggedIn(req, res, next) {

        // if user is authenticated in the session, carry on
        if (req.isAuthenticated())
            return next();

        // if they aren't redirect them to the home page
        res.redirect('/');
    }

    app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email' }));

    app.get('/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    app.get('/', (req, res) => {
        res.render("index")
    })

    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/');
    });


    /* -------------- GLOBAL PROCESS & CHILD PROCESS -------------- */

    // PROCESS
    app.get('/info', (req, res) => {

        res.render("info", {
            argEntrada: process.argv,
            os: process.platform,
            nodeVs: process.version,
            memoryUsage: process.memoryUsage(),
            excPath: process.execPath,
            processID: process.pid,
            folder: process.cwd()
        });
    });

    // CHILD PROCESS
    const { fork } = require('child_process');

    // /randoms?cant=20000
    app.get('/randoms', (req, res) => {
        try {
            const randomNumber = fork('./child.js');
            randomNumber.send(req.query);
            randomNumber.on('message', numerosRandom => {
                res.end(`Numeros random ${JSON.stringify(numerosRandom)}`);
            });
        } catch (error) {
            console.log(error)
        }
    });

    app.listen(portCL, () => {
        console.log(`APP CORRIENDO EN EL PUERTO ${portCL}`)
    })

    console.log(`Worker ${process.pid} started`);
}