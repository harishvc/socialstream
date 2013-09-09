var express = require('express');
var io = require('socket.io');
var redis = require('redis');
var TwitterWorker = require('./workers/twitter.js');
var moment = require('moment');

//var terms = ['awesome','cool','rad','gnarly','groovy'];
var terms = ['pepsi','coke','sprite','fanta','redbull'];
var t = new TwitterWorker(terms);
var listener = redis.createClient();
var client = redis.createClient();

var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res) {
    res.render('index.ejs', { terms: terms });
});

app.post('/restart', function(req, res) {
    client.flushall();
});

// Debug
var DEBUG = false;

//$>export NODE_ENV=production  // run node.js in production mode
app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

// Disable socket debug messages
var sockets = io.listen(app, {'log level': 1});

sockets.on('connection', function (socket) {
	
    // Subscribe to multiple channels
	listener.subscribe('update');
    listener.subscribe('stats');
    listener.subscribe('geo');
    listener.subscribe('time');

    // Set start and end time
    var start = moment().zone(+8).format("YYYY-MM-DD HH:mm:ss [PDT]");
    socket.emit('time', { key:'start', count: start});
    socket.emit('time', { key:'now', count: start});
    // Update running time 
    var t=setInterval( function() {
    	var now = moment().zone(+8).format("YYYY-MM-DD HH:mm:ss [PDT]");
    	socket.emit('time', { key:'now', count: now});
    	socket.emit('time', { key:'runningtime', count: moment(start).from(now)});
    }, 1000);
       
   
    // Process messages from twitter stream
    listener.on('message', function(channel, msg) {
	var message = JSON.parse(msg);
	if (DEBUG) { console.log("server received ....", message); }
	socket.emit(channel, { key:message.key, count: message.count });
	if (DEBUG) { console.log("server sent ..... ", message); }
    }); 
    
});
