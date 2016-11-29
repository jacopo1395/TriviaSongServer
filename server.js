var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var SpotifyWebApi = require('spotify-web-api-node');
var firebase = require("firebase");
var admin = require("firebase-admin");

var client_id = 'c561f5078f1f400f98e008f23e26684d'; // Your client id
var client_secret = 'fd67cd2602984213a46af856bca29541'; // Your secret
var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri

// credentials are optional
var spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUri: redirect_uri
});

var serviceAccount = require("./triviamusic-fd7d2-firebase-adminsdk-3ypir-3850f587fc.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://triviamusic-fd7d2.firebaseio.com"
});
//https://firebase.google.com/docs/database/admin/save-data

// Get a database reference to our blog
var db = admin.database();
var ref = db.ref("server/saving-data/fireblog");

var categories = {
    "items": [
        'rock',
        'metal',
        'pop',
        'indie_alt',
        'edm_dance',
        'rnb',
        'county',
        'folk_americana',
        'soul',
        'jazz',
        'blues',
        'hiphop'
    ],
    "status": "ok"
};

var playlists = {
    'items': {
        'rock': {'author': 'spotify', 'id': '2Qi8yAzfj1KavAhWz1gaem'},
        'metal': {'author': 'spotify', 'id': '2k2AuaynH7E2v8mwvhpeAO'},
        'pop': {'author': 'spotify', 'id': '5FJXhjdILmRA2z5bvz4nzf'}
    },
    'total': 3
};

var startTime = [-1, 0];
var diff = [-1, 0];

var app = express();

app.use(cookieParser());

var send_error = function (res) {
    var response = {};
    response.status = "error";
    res.setHeader('Content-Type', 'application/json');
    res.send(response);
    return;
};

var get_access_token = function (callback) {
    if (startTime[0] != -1) {
        diff = process.hrtime(startTime);
    }
    if (diff[0] == -1 || diff[0] > 3000) {
        refresh_access_token(callback);
    }
    else callback(false);
};

var refresh_access_token = function (callback) {
    // your application requests authorization
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        form: {
            grant_type: 'client_credentials'
        },
        json: true
    };
    startTime = process.hrtime();
    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {

            // use the access token to access the Spotify Web API
            var token = body.access_token;
            spotifyApi.setAccessToken(token);
            callback(error)
        }

    });
};


app.get('/', function (req, res) {
    // startTime=process.hrtime();
    get_access_token(function (err) {
        if (err) {
            send_error(res);
        }
        // var usersRef = ref.child("users");
        // usersRef.set({
        //   alanisawesome: {
        //     date_of_birth: "June 23, 1912",
        //     full_name: "Alan Turing"
        //   },
        //   gracehop: {
        //     date_of_birth: "December 9, 1906",
        //     full_name: "Grace Hopper"
        //   }
        // });
        var response = {};
        response.result = "welcome!";
        response.status = "ok";
        res.setHeader('Content-Type', 'application/json');
        res.send(response);
    });
});

app.get('/categories', function (req, res, next) {
    // res.setHeader('Content-Type', 'application/json');
    // res.send(categories);
    res.json(categories);
});

app.get('/songs/:category', function (req, res) {
    console.log('/songs');
    var item = playlists.items[req.params.category];
    if (item == null) {
        var response = {};
        response.result = "wrong category";
        response.status = "error";
        res.setHeader('Content-Type', 'application/json');
        res.send(response);
    }
    var author = item.author;
    var id = item.id;


    get_access_token(function (err) {
        if (err) {
            send_error(res);
        }
        // Get tracks in a playlist
        spotifyApi.getPlaylistTracks(author, id, {'offset': 0})
            .then(function (data) {
                var tot = data.body.total;
                if (tot > 100) tot = 100;
                if (tot < 5) //TODO: controllare che tutte abbiano il link
                    send_error(res);
                var items = data.body.items;
                var songs = {};
                var j = 0;
                var i = 0;
                var array = [];
                for (var n = 0; n < 5; n++) {
                    do {
                        i = Math.floor(Math.random() * (tot));
                    } while (contains.call(array, i));
                    array.push(i);
                    if (items[i].track.preview_url != null && items[i].track.track_number != null) {
                        songs['song' + j] = {
                            'author': items[i].track.artists[0].name,
                            'album': items[i].track.album.name,
                            'album_id': items[i].track.album.id,
                            'album_image': items[i].track.album.images[0].url,
                            'title': items[i].track.name.split('-')[0],
                            'link': items[i].track.preview_url,
                            'track_number': items[i].track.track_number
                        };
                        j++;
                    }
                    else n--;
                }
                songs.total = j;
                songs.status = "ok";
                res.setHeader('Content-Type', 'application/json');
                res.send(songs);
            }, function (err) {
                send_error(res);
            });
    });


});

app.get('/possibilities/:album_id/:track_number', function (req, res) {
    console.log('possibilities');
    get_access_token(function (err) {
        if (err) {
            send_error();
        }
        spotifyApi.getAlbumTracks(req.params.album_id, {limit: 30, offset: 0})
            .then(function (data) {
                var items = data.body.items;
                var tot = data.body.total;
                var result = {
                    'possibility1': 'What a Wonderful World',
                    'possibility2': 'Your Song',
                    'possibility3': 'All You Need Is Love',
                    'possibility4': 'Rolling In The Deep'
                };
                if (tot < 4) { //TODO: do better!
                    result.total = 4;
                    result.status = 'ok';
                    res.json(result);
                }
                var possibilities = {};
                var j = 1;
                var i;
                var array = [req.params.track_number];
                var name_array = [];
                for (var n = 0; n < tot; n++) {
                    if(items[n].name!=null) {
                        result.total = 4;
                        result.status = 'ok';
                        res.json(result);
                    }
                    var name = items[n].name.split('-')[0];
                    if (name_array.indexOf(name)<0)
                        name_array.push(name);

                }
                if (tot < 4) { //TODO: do better!
                    result.total = 4;
                    result.status = 'ok';
                    res.json(result);
                }
                for(var n=0; n<4 ;n++){
                    do {
                        i = Math.floor(Math.random() * (name_array.length));
                    } while (contains.call(array, i));
                    array.push(i);
                    possibilities['possibility' + j] = name_array[i];
                    j++;
                }

                possibilities.total = 4;
                possibilities.status = "ok";
                res.setHeader('Content-Type', 'application/json');
                res.send(possibilities);
            }, function (err) {
                console.log('Something went wrong!', err);
                send_error(res);
            });

    });
});

var contains = function (needle) {
    // Per spec, the way to identify NaN is that it is not equal to itself
    var findNaN = needle !== needle;
    var indexOf;

    if (!findNaN && typeof Array.prototype.indexOf === 'function') {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function (needle) {
            var i = -1, index = -1;

            for (i = 0; i < this.length; i++) {
                var item = this[i];

                if ((findNaN && item !== item) || item === needle) {
                    index = i;
                    break;
                }
            }

            return index;
        };
    }

    return indexOf.call(this, needle) > -1;
};
console.log('Listening on 3000');
app.listen(3000);
