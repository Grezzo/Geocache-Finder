/*Portions of this app have borrowed logic from c:geo's
  gc connector, so credit for some of it goes to them*/

//Suppress warnings about line continuations used in embedded config html
/* jshint multistr: true */

/*
  TODO: Test on Android (cookies may not be passed on xmlHttpRequests)
        Store credentials on watch
*/


//Patterns for parsing the result of a (detailed) search:
//PATTERN_LATLON = Pattern.compile("<span id=\"uxLatLon\"[^>]*>(.*?)</span>");
//PATTERN_NAME = Pattern.compile("<span id=\"ctl00_ContentBody_CacheName\">(.*?)</span>");

//PATTERN_PREMIUMMEMBERS = Pattern.compile("<p class=\"Warning NoBottomSpacing\"");

var PATTERN_LOGIN_NAME = /class="li-user-info"[^>]*>\W*?<span>(.*?)<\/span>/;

//Patterns for parsing the result of a search (next):
var PATTERN_SEARCH_GEOCODE = /\|\W*(GC[0-9A-Z]+)[^\|]*\|/;

//STRING_PREMIUMONLY_2 = "Sorry, the owner of this listing has made it viewable to Premium Members only.";
//STRING_PREMIUMONLY_1 = "has chosen to make this cache listing visible to Premium Members only.";

function getNearbyGeocaches() {
  console.log("Getting location...");
  navigator.geolocation.getCurrentPosition(
    function(position) {
      console.log("Your current position is:");
      console.log("Latitude : " + position.coords.latitude);
      console.log("Longitude: " + position.coords.longitude);
      console.log("More or less " + position.coords.accuracy + " meters.");
      getCachesNearCoords(position.coords);
    },
    function(error) {
      console.log("Error getting location");
      console.log("Error was: " + error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 10000
    }
  );
}

function getCachesNearCoords(coords) {
  
  var searchURL = "https://www.geocaching.com/seek/nearest.aspx?lat=" + coords.latitude + "&lng=" + coords.longitude;
  var req = new XMLHttpRequest();
  req.open("GET", searchURL, false);
  
  req.addEventListener("error", function(error) {
    console.log("There was an error fetching " + searchURL);
    console.log("Error was: " + error.message);
  });

  req.addEventListener("load", function() {
    //parse geocaches from geocaching.com using some
    //of the same logic as c:geo's GCParser.java
    var page = this.responseText;
    var startPos = page.indexOf("<div id=\"ctl00_ContentBody_ResultsPanel\"");
    startPos = page.indexOf("<table", startPos); //Start cut at <table> after div
    var endPos = page.indexOf("ctl00_ContentBody_UnitTxt") -1; //end cut after </table>
    page = page.substring(startPos, endPos);
    var rows = page.split("<tr class=");
    rows.forEach(function(row) {
      var match = row.match(PATTERN_SEARCH_GEOCODE);
      if (match !== null) {
        console.log(match[1]);
      }
    });
  });
  
  console.log("Getting list of geocaches from " + searchURL);  
  req.send();
}

function getCacheLocation(cacheID) {
  var URL = "https://www.geocaching.com/seek/cache_details.aspx?wp=" + cacheID;
  var req = new XMLHttpRequest();
  req.open("GET", URL, false);
  req.addEventListener("load", function() {
    console.log(this.responseText);
  });
  req.send();
}


//------------------------------------------
//-----------------Helpers------------------
//------------------------------------------

function caseInsensitiveCompare(str1, str2) {
  return (str1.toUpperCase() === str2.toUpperCase());
}








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
  }
);

  //console.log("loaded: " + localStorage.getItem("username") + " and password from storage");
  //logInToGeocaching();
  //getCacheLocation("GC1GZ1B");
  //getNearbyGeocaches();
});








//------------------------------------------
//------------------Config------------------
//------------------------------------------

Pebble.addEventListener('showConfiguration', function(e) {
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
<td>Username</td>\
<td><input id=\"username\"></td>\
</tr><tr>\
<td>Password</td>\
<td><input type=\"password\" id=\"password\"></td>\
</tr></table>\
<input type=\"button\" value=\"Save\" id=\"saveButton\">\
</body></html>\
";
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
    
    logInToGeocaching();
  }
});