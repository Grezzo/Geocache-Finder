/*
  TODO: Test on Android (cookies may not be passed on xmlHttpRequests, and config page may not load)
  currently tries to lo in as null is not configured
        Store credentials on watch (not phone)
        choose whether to display premium caches
        decide whether to filter found caches
        detect no config
        pad geocaches to 20 and detect padded ones in c
*/


//Patterns for parsing the result of a (detailed) search:
//PATTERN_LATLON = Pattern.compile("<span id=\"uxLatLon\"[^>]*>(.*?)</span>");
//PATTERN_NAME = Pattern.compile("<span id=\"ctl00_ContentBody_CacheName\">(.*?)</span>");

//Pattern for parsing the logged in user:
var PATTERN_LOGIN_NAME = /class="li-user-info"[^>]*>\W*?<span>(.*?)<\/span>/;

//Patterns for parsing the result of a search:
var PATTERN_SEARCH_GEOCODE = /\|\W*(GC[0-9A-Z]+)[^\|]*\|/;
var PATTERN_SEARCH_DISTANCE = /<span class="small NoWrap"><img[^>]+>[NSEW]+<br \/>\W*([^<]+)\W*<\/span>/;
var PATTERN_SEARCH_NAME = /<span>\W*([^<]+)\W*<\/span><\/a>/;





function getNearbyGeocaches() {
  console.log("Getting location...");
  var locationWatcher = navigator.geolocation.watchPosition( function(position) {
    if (position.coords.accuracy <= 100) {
    //if (position.coords.accuracy <= 1000) {
      console.log("Location accuracy (" + position.coords.accuracy + "m) is good");
      navigator.geolocation.clearWatch(locationWatcher);
      getCachesNearCoords(position.coords);
    } else {
      console.log("Location accuracy (" + position.coords.accuracy + "m) not good enough yet");
    }
  });
}

function getCachesNearCoords(coords) {
  var searchURL = "https://www.geocaching.com/seek/nearest.aspx?lat=" + coords.latitude + "&lng=" + coords.longitude;
  console.log("Getting list of geocaches from " + searchURL);  
  var req = new XMLHttpRequest();
  req.open("GET", searchURL, false);
  req.send();
  if (req.status === 200) {
    //parse returned html
    var page = req.responseText;
    
    //Get only rows of search results
    var startPos = page.substring(0, page.indexOf("Data BorderTop")).lastIndexOf("<tr");
    var endPos = page.indexOf("</table>", startPos);
    page = page.substring(startPos, endPos);
  
    //Split rows and parse them
    var rows = page.split("</tr>");
    // Remove last item in array because it's empty
    rows.pop();
    //var nearbyGeocaches = [];
    var geocacheList = [];
    rows.forEach(function(row, index) {
      //Filter out premium caches
      if (row.indexOf("Premium Member Only Cache") === -1) {
        var geocode = row.match(PATTERN_SEARCH_GEOCODE)[1];
        var name = htmlUnescape(row.match(PATTERN_SEARCH_NAME)[1]);
        var distance = row.match(PATTERN_SEARCH_DISTANCE)[1];
        var geocache = [geocode, name, distance];
        //Join with ASCII unit separator
        geocacheList.push(geocache.join(String.fromCharCode(31)));
      }
    });
    //Join with ASCII record separator
    var geocacheListAsString = geocacheList.join(String.fromCharCode(30));
    console.log("Got a list of Geocaches:");
    console.log(geocacheListAsString);

    //Tell pebble that I've got a bunch of nearby geocaches
    console.log("Telling Pebble");
    Pebble.sendAppMessage({ 'AppKeyGeocacheList': geocacheListAsString },
                          function(e) {
                            console.log('Successfully delivered message with transactionId=' + e.data.transactionId);
                          },
                          function(e) {
                            console.log('Unable to deliver message with transactionId=' + e.data.transactionId +
                                        ' Error is: ' + e.data.error.message);
                          });
  }
}

/*function getCacheDetails(cacheID) {
  var URL = "https://www.geocaching.com/seek/cache_details.aspx?wp=" + cacheID;
  var req = new XMLHttpRequest();
  req.open("GET", URL, false);
  if (req.status === 200) {
    console.log(this.responseText);
  }
  req.send();
}*/



//------------------------------------------
//-----------------Helpers------------------
//------------------------------------------

function caseInsensitiveCompare(str1, str2) {
  return (str1.toUpperCase() === str2.toUpperCase());
}

function htmlUnescape(string) {
  string = string.replace("&amp;", "&");
  string = string.replace("&#39;", "'");
  console.log(string);
  //could do this better. especially with numbers! Maybe get a list of entities from a node.js library
  return string;
}

// Calculate distance between two coords.
// Code taken from http://www.htmlgoodies.com/beyond/javascript/calculate-the-distance-between-two-points-in-your-web-apps.html
/*function distance(lat1, lon1, lat2, lon2) {
        var radlat1 = Math.PI * lat1/180;
        var radlat2 = Math.PI * lat2/180;
        var theta = lon1-lon2;
        var radtheta = Math.PI * theta/180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(dist);
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515;
        dist = dist * 1609.344;
        return dist;
}*/






//------------------------------------------
//---------------Login/Logout---------------
//------------------------------------------

function getLoggedInUser() {
  var req = new XMLHttpRequest();
  req.open("POST", "https://www.geocaching.com/", false);
  req.send();
  if (req.status === 200) {
    var match = req.responseText.match(PATTERN_LOGIN_NAME);
    if (match === null) {
      return null;
    } else {
      return match[1];
    }
  }
}

function logOutOfGeocaching() {
  var req = new XMLHttpRequest();
  req.open("GET", "https://www.geocaching.com/login/default.aspx?RESET=Y", false);
  console.log("Logging out");
  req.send();
  if (req.status === 200) {
    var loggedInUser = getLoggedInUser();
    if (loggedInUser === null) {
      console.log("Logged out");
    } else {
      console.log("Failed to log out. Still logged in as " + loggedInUser);
    }
  }
}

function logInToGeocaching() {
  //
  //TODO: Check to see whether username and password have been configured
  //
  var username = localStorage.getItem("username");
  var loggedInUser = getLoggedInUser();
  if (loggedInUser) {
    console.log(loggedInUser + " is already logged in");
    if (caseInsensitiveCompare(loggedInUser, username)) {
      console.log("...so don't need to log in");
      return;
    } else {
      console.log("...so will log out first");
      logOutOfGeocaching();
    }
  }
  console.log("Logging in as " + username);
  var req = new XMLHttpRequest();

  var params = "&__EVENTTARGET=&__EVENTARGUMENT=" + 
      "&ctl00$ContentBody$tbUsername=" + username +
      "&ctl00$ContentBody$tbPassword=" + localStorage.getItem("password") +
      "&ctl00$ContentBody$cbRememberMe=on&ctl00$ContentBody$btnSignIn=Login";
  req.open("POST", "https://www.geocaching.com/login/default.aspx", false);
  //Send the proper header information along with the request
  req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  req.setRequestHeader("Content-length", params.length);
  req.setRequestHeader("Connection", "close");
  req.send(params);
  loggedInUser = getLoggedInUser();
  if (loggedInUser) {
    console.log("Logged in as " + loggedInUser);
    return true;
  } else {
    console.log("Failed to log in");
    return false;
  }
}





//------------------------------------------
//----------------Messaging-----------------
//------------------------------------------

// Set callback for appmessage events
Pebble.addEventListener('appmessage', function(e) {
  console.log('JS received message from pebble');
  if (e.payload.AppKeyGetGeocaches) {
    console.log("...and it says to get geocaches!");
    logInToGeocaching();
    getNearbyGeocaches();
    //fetchStockQuote(symbol, true);
  //} else if (e.payload.QuoteKeyFetch) {
    //fetchStockQuote(symbol, false);
  //} else if (e.payload.QuoteKeySymbol) {
    //symbol = e.payload.QuoteKeySymbol;
    //localStorage.setItem('symbol', symbol);
    //fetchStockQuote(symbol, false);
  }
});







//------------------------------------------
//-------------------Main-------------------
//------------------------------------------

Pebble.addEventListener("ready", function(e) {
  console.log("JavaScript app ready and running!");

  // Notify the watchapp that it is now safe to send messages
  Pebble.sendAppMessage({ 'AppKeyReady': true },
                        function(e) {
                          console.log('Successfully delivered message with transactionId=' + e.data.transactionId);
                        },
                        function(e) {
                          console.log('Unable to deliver message with transactionId=' + e.data.transactionId +
                                      ' Error is: ' + e.data.error.message);
                        });
});








//------------------------------------------
//------------------Config------------------
//------------------------------------------

Pebble.addEventListener('showConfiguration', function(e) {
  
  //Suppress warnings about line continuations used in embedded config html
  /* jshint multistr: true */
  
  // Show config page
  var configPage = "\
<html><head>\
<script>\
window.addEventListener(\"DOMContentLoaded\", function() {\
  document.getElementById(\"saveButton\").addEventListener(\"click\", function () {\
    var config = {\
      'username': document.getElementById(\"username\").value,\
      'password': document.getElementById(\"password\").value,\
    };\
    location.href = 'pebblejs://close#' + encodeURIComponent(JSON.stringify(config));\
  });\
});\
</script>\
<style>body {font-family: sans-serif;}</style>\
</head><body>\
You must enter your geocaching.com credentials in order to use this app.<br/><br/>\
Your credentials are not sent anywhere (except over an encrypted connection to geocaching.com), and are only stored on your watch.<br/><br/>\
<table><tr>\
<td>Geocaching.com Username</td>\
<td><input id=\"username\"></td>\
</tr><tr>\
<td>Geocaching.com Password</td>\
<td><input type=\"password\" id=\"password\"></td>\
</tr><tr>\
<td>Show Premium Caches</td>\
<td><input type=\"checkbox\" id=\"premium\"></td>\
</tr></table>\
<input type=\"button\" value=\"Save\" id=\"saveButton\">\
</body></html>\
";
  
  // Turn warnings back on
  /* jshint multistr: false */
  
  console.log("Loading configuration page");
  Pebble.openURL("data:text/html," + encodeURIComponent(configPage));
});

Pebble.addEventListener('webviewclosed', function(e) {
  
  if (e.response === "") {
    console.log("Configuration cancelled");
  } else {
    // Decode and parse config data as JSON
    var config_data = JSON.parse(decodeURIComponent(e.response));

    localStorage.setItem("username", config_data.username);
    localStorage.setItem("password", config_data.password);
    
    console.log("Config updated");
    
    logInToGeocaching();
  }
});

    
    /*
    //Prepare AppMessage payload
    var dict = {
      'USERNAME': config_data.username,
      'PASSWORD': config_data.password,
    };

    // Send settings to Pebble watchapp
    Pebble.sendAppMessage(dict, function(){
      console.log('Sent config data to Pebble');  
    }, function() {
      console.log('Failed to send config data');
    });
    */