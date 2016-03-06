/*
  TODO: Test on Android (cookies may not be passed on xmlHttpRequests, and config page may not load)
  currently tries to lo in as null is not configured
        Store credentials on watch (not phone)
detect no username/password
detect no config
        keep searching until 20 caches found AFTER filter applied
*/


//Patterns for parsing the result of a (detailed) search:
var PATTERN_LATLON = /<span id="uxLatLon"[^>]*>(.*?)<\/span>/;
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
    var accuracy = 100;
    //if (position.coords.accuracy <= 100) {
    
    if ((Pebble.getActiveWatchInfo().model.indexOf("qemu_platform_") != -1)) {
      console.log('Detected emulator in use, decreasing GPS accuracy');
      accuracy = 1000;
    }
    
    
    if (position.coords.accuracy <= accuracy) {
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
    //parse the returned html
    var page = req.responseText;
    
    //Get only rows of search results
    var startPos = page.substring(0, page.indexOf("Data BorderTop")).lastIndexOf("<tr");
    var endPos = page.indexOf("</table>", startPos);
    page = page.substring(startPos, endPos);
  
    //Split rows and parse them
    var rows = page.split("</tr>");
    // Remove last item in array because it's empty
    rows.pop();
    var geocacheList = [];
    rows.forEach(function(row, index) {
      //Filter out premium/found caches
      if (
        !(
          row.indexOf("Premium Member Only Cache") != -1 &&
          localStorage.getItem("show_premium") === "false"
        ) && !(
          row.indexOf("Found It") != -1 &&
          localStorage.getItem("show_found") === "false"
        )
      ) {
        var geocode = row.match(PATTERN_SEARCH_GEOCODE)[1];
        var name = htmlUnescape(row.match(PATTERN_SEARCH_NAME)[1]);
        var distance = row.match(PATTERN_SEARCH_DISTANCE)[1];
        var geocache = [geocode, name, distance];
        //Join with ASCII unit separator
        geocacheList.push(geocache.join(String.fromCharCode(31)));
      }
    });
    //Pad list to 20 records in case some were filtered
    while (geocacheList.length < 20) {
      geocacheList.push(["empty","empty","empty"].join(String.fromCharCode(31)));
    }
    
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

function getCacheDetails(geocode) {
  var URL = "https://www.geocaching.com/seek/cache_details.aspx?wp=" + geocode;
  var req = new XMLHttpRequest();
  req.open("GET", URL, false);
  req.send();
  if (req.status === 200) {
    //console.log(req.responseText);
    var coords = req.responseText.match(PATTERN_LATLON)[1];
    console.log(coords);
    // Send coords to watch
    Pebble.sendAppMessage({ 'AppKeyCoords': coords },
                        function(e) {
                          console.log('Successfully delivered message with transactionId=' + e.data.transactionId);
                        },
                        function(e) {
                          console.log('Unable to deliver message with transactionId=' + e.data.transactionId +
                                      ' Error is: ' + e.data.error.message);
                        });
  }
}



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
  //TODO: is &#39; not escaped if it's at the beginning like 'Hampshire Hoggin'?
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
  } else if (e.payload.AppKeyGetCacheDetails) {
    var geocode = e.payload.AppKeyGetCacheDetails;
    console.log("...and it says to get details on " + geocode);
    getCacheDetails(geocode);
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
  
  // Show config page (comment at end removes querystring if used in emulator)
  var configPage = "\
<html><head>\n\
<style>\n\
input[type=text], input[type=password] {\n\
  height: 44px;\n\
  font-size: 17px;\n\
}\n\
input[type=checkbox] {\n\
 width: 44px;\n\
 height: 44px;\n\
}\n\
input[type=button] {\n\
 font-size: 30px;\n\
 font-weight: bold;\n\
 height: 44px;\n\
 width: 100%;\n\
}\n\
</style>\n\
<script>\n\
// Get query variables\n\
function getQueryParam(variable, defaultValue) {\n\
  // Find all URL parameters\n\
  var query = location.search.substring(1);\n\
  var vars = query.split('&');\n\
  for (var i = 0; i < vars.length; i++) {\n\
    var pair = vars[i].split('=');\n\
    // If the query variable parameter is found, decode it to use and return it for use\n\
    if (pair[0] === variable) {\n\
      return decodeURIComponent(pair[1]);\n\
    }\n\
  }\n\
  return defaultValue || false;\n\
}\n\
\n\
window.addEventListener(\"DOMContentLoaded\", function() {\n\
  document.getElementById(\"saveButton\").addEventListener(\"click\", function () {\n\
    document.getElementById(\"saveButton\").disabled = true;\n\
    var config = {\n\
      'update_login': document.getElementById(\"update_login\").checked,\n\
      'username': document.getElementById(\"username\").value,\n\
      'password': document.getElementById(\"password\").value,\n\
      'show_premium': document.getElementById(\"show_premium\").checked,\n\
      'show_found': document.getElementById(\"show_found\").checked\n\
    };\n\
    // Set the return URL depending on the runtime environment\n\
    var return_to = getQueryParam('return_to', 'pebblejs://close#');\n\
    location.href = return_to + encodeURIComponent(JSON.stringify(config));\n\
  });\n\
  document.getElementById(\"update_login\").addEventListener(\"click\", function () {\n\
    var displayValue;\
    if (document.getElementById(\"update_login\").checked) {\n\
      displayValue = \"\";\n\
    } else {\n\
      displayValue = \"none\";\n\
    };\n\
    document.getElementById(\"username_row\").style.display = displayValue\n\
    document.getElementById(\"password_row\").style.display = displayValue\n\
  });\n\
});\n\
</script>\n\
<style>body {font-family: sans-serif;}</style>\n\
</head><body>\n\
You must enter your geocaching.com credentials in order to use this app.<br/><br/>\n\
Your credentials are only ever sent to geocaching.com over an encrypted (https) connection and are not sent anywhere else.<br/><br/>\n\
If you don't have a password (i.e. you normally log in using Facebook), you will need to get one from https://www.geocaching.com/account/identify<br/><br/>\n\
<table><tr>\n\
<td>Change Username and Password</td>\n\
<td><input type=\"checkbox\" id=\"update_login\"></td>\n\
</tr><tr id=\"username_row\" style=\"display: none\">\n\
<td>Geocaching.com Username</td>\n\
<td><input type=\"text\" id=\"username\" value=\"" + localStorage.getItem("username") + "\"></td>\n\
</tr><tr id=\"password_row\" style=\"display: none\">\n\
<td>Geocaching.com Password</td>\n\
<td><input type=\"password\" id=\"password\"></td>\n\
</tr><tr>\n\
<td>Show Premium Caches</td>\n\
<td><input type=\"checkbox\" id=\"show_premium\"" + (localStorage.getItem("show_premium") === "true" ? " checked" : "") + "></td>\n\
</tr><tr>\n\
<td>Show Found Caches</td>\n\
<td><input type=\"checkbox\" id=\"show_found\"" + (localStorage.getItem("show_found") === "true" ? " checked" : "") + "></td>\n\
</tr></table>\n\
<input type=\"button\" value=\"Save\" id=\"saveButton\">\n\
</body></html><!--\
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
    if (config_data.update_login) {
      localStorage.setItem("username", config_data.username);
      localStorage.setItem("password", config_data.password);
    }
    //explicitly convert boolean to string before saving because that forces it to lower case. Otherwise
    //emulator will converts to "True"/"False" when saving, and phone will convert to "true"/"false".
    localStorage.setItem("show_premium", config_data.show_premium.toString());
    localStorage.setItem("show_found", config_data.show_found.toString());
    
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