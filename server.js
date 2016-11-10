var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var SpotifyWebApi = require('spotify-web-api-node');
var firebase = require("firebase");

var client_id = 'c561f5078f1f400f98e008f23e26684d'; // Your client id
var client_secret = 'fd67cd2602984213a46af856bca29541'; // Your secret
var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri

// credentials are optional
var spotifyApi = new SpotifyWebApi({
  clientId : client_id,
  clientSecret : client_secret,
  redirectUri : redirect_uri
});

// firebase.initializeApp({
//   serviceAccount: "path/to/serviceAccountCredentials.json",
//   databaseURL: "https://triviamusic.firebaseio.com"
// });

var categories =['rock',
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
                ];

var playlists = {'items':{
                          'rock':
                              {'author': 'spotify', 'id': '2Qi8yAzfj1KavAhWz1gaem'},
                          'metal':
                              {'author': 'spotify', 'id': '2k2AuaynH7E2v8mwvhpeAO'},
                          'pop':
                              {'author': 'spotify', 'id': '5FJXhjdILmRA2z5bvz4nzf'}
                        },
                'total': 3
                };


var app = express();

app.use(cookieParser());

var get_access_token = function(callback){
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

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {

      // use the access token to access the Spotify Web API
      var token = body.access_token;
      console.log(body);
      spotifyApi.setAccessToken(token);
      callback(error)
    }

  });
};

var refresh_access_token = function(){
  // TODO: ....
  var i;
};



app.get('/', function(req, res){
  get_access_token(function(err){
    var response;
    response.result="welcome!";
    response.status = "ok";
    res.setHeader('Content-Type', 'application/json');
    res.send(response);
  });
});

app.get('/categories',function(req, res){
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(categories));
});

app.get('/songs/:category', function(req, res){
  var author = playlists.items[req.params.category].author;
  var id = playlists.items[req.params.category].id;
  get_access_token(function(err){
    if(err){
      var response;
      response.status = "error";
      res.setHeader('Content-Type', 'application/json');
      res.send(response);
      return;
    }
    // Get tracks in a playlist
    spotifyApi.getPlaylistTracks(author, id, { 'offset' : 0, 'limit' : 10, 'fields' : 'items' })
      .then(function(data) {
        console.log('The playlist contains these tracks', data.body);
        var items =data.body.items;
        var songs = {};
        var j=0;
        for (var i in items){
          if (items[i].track.preview_url!=null){
            songs['song'+j]={'author':items[i].track.artists[0].name,
                              'album': items[i].track.album.name,
                              'album_id': items[i].track.album.id,
                              'title': items[i].track.name,
                              'link':items[i].track.preview_url};
            j++;
          }
        }
        songs.total = j;
        songs.status = "ok";
        res.setHeader('Content-Type', 'application/json');
        res.send(songs);
      }, function(err) {
        console.log('Something went wrong!', err);
        var response;
        response.status = "error";
        res.setHeader('Content-Type', 'application/json');
        res.send(response);
      });
  });


});

app.get('/possibilities/:album_id', function(req,res){
    get_access_token(function(err){
      if(err){
        var response;
        response.status = "error";
        res.setHeader('Content-Type', 'application/json');
        res.send(response);
        return;
      }
      spotifyApi.getAlbumTracks(req.params.album_id, { limit : 10 })
          .then(function(data) {
            console.log(data.body);
            var items =data.body.items;
            var possibilities = {};
            var j=1;
            for (var i in items){
              var name = items[i].name.split("-")[0];
              possibilities['possibility'+j]=name;
              j++;
            }
            possibilities.total=j-1;
            possibilities.status = "ok";
            res.setHeader('Content-Type', 'application/json');
            res.send(possibilities);
          }, function(err) {
            console.log('Something went wrong!', err);
            var response;
            response.status = "error";
            res.setHeader('Content-Type', 'application/json');
            res.send(response);
          });

    });
});


// spotifyApi
// app.get('/categories_spotify',function(req, res){
//   get_access_token(function(err){
//     if(err){
//       res.send('error');
//       return;
//     }
//     spotifyApi.getCategories({
//           limit : 20,
//           offset: 0,
//           country: 'IT',
//           locale: 'it_IT'
//       })
//       .then(function(data) {
//         console.log('/categories: ok');
//         var result = [];
//         var items = data.body['categories']['items'];
//         for (var i in items){
//           result = result.concat(items[i]['id']);
//         }
//         res.send(result);
//
//       }, function(err) {
//         console.log("Something went wrong!", err);
//         res.send('error');
//       });
//   });
// });
//
// app.get('/playlists/:category',function(req, res){
//   // Get Playlists for a Category
//   spotifyApi.getPlaylistsForCategory(req.params.category, {
//         country: 'IT',
//         limit : 5,
//         offset : 0
//       })
//     .then(function(data) {
//       console.log(data.body);
//       res.send(data.body);
//     }, function(err) {
//       console.log("Something went wrong!", err);
//       res.send('error');
//     });
// });
//
// app.get('/songs/:owner/:playlist', function(req, res){
//   // Get tracks in a playlist
//   spotifyApi.getPlaylistTracks(req.params.owner, req.params.playlist, { 'offset' : 0, 'limit' : 5, 'fields' : 'items' })
//     .then(function(data) {
//       console.log('The playlist contains these tracks', data.body);
//       res.send(data.body);
//     }, function(err) {
//       console.log('Something went wrong!', err);
//       res.send('error');
//     });
// });


console.log('Listening on 3000');
app.listen(3000);
