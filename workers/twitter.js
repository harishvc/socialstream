var http = require('http');
var twitter = require('ntwitter');
var redis = require('redis');
var credentials = require('./credentials.js');

// Debug
var DEBUG = false;

function TwitterWorker(terms) {
    var client = redis.createClient();
    
    //Get Twitter developer credentials
    var t = new twitter({
	consumer_key: credentials.consumer_key,
	consumer_secret: credentials.consumer_secret,
	access_token_key: credentials.access_token_key,
	access_token_secret: credentials.access_token_secret
    });

    // Reset key values before starting
    terms.forEach(function(term)  {
        resetkeys(term);
    });
    resetkeys("ttotal");
    resetkeys("geototal");
    
    
    //Streaming data from twitter for specific terms
    t.stream(
	'statuses/filter',
	{ track: terms },
	function(stream) {
        stream.on('data', function(tweet) {
		            	
        if (DEBUG) { 
    	    console.log(tweet.user.name ,tweet.user.screen_name, tweet.user.followers_count,tweet.geo);
    	    console.log(tweet.text);
           } 
       
		terms.forEach(function(term)  {
		    if(tweet.text.match(new RegExp(term,'i'))) {
		    	// Update
			    update(term,"update");
			    update("ttotal","stats");
		    }
		});
		
		 // Find geo tagged tweets
	     if ( tweet.geo != null)
	       {
	    	if (DEBUG) { console.log(tweet.geo.coordinates, tweet.text); }
	    	update("geototal","geo");
	        }
       
         });  // stream
	}
    );
    
    // Reset keys
    function resetkeys(something) {
     	if (DEBUG) { console.log("reset ...", something); }
		client.getset(something,0,function(err, result) {
		    if(err) {
		    	console.eror('ERROR initializing redis keys' + err);
		    }
	    });
    }    	
    		
    	
    // Redis update
    var update = function(key,channel) {
    client.incr(key, function(err, result) {
	    if(err) {
		console.error('ERROR from @twitter stream: ' + err);
	    } else {
	     // http://stackoverflow.com/questions/18679340/jquery-parsejson-returns-null
	     // key value pair NOT an arrays of key value pair	
	     //var message1 = [{key:key, count:result},{key:key, count:result}];
	     var message = {key:key, count:result};
	     client.publish(channel, JSON.stringify(message));
	    }
	});
    };

};

module.exports = TwitterWorker;
