/*globals require*/ //Stop complaining about require being undefined!
var gc = require("gc-connector");
var helper = require("helpers");

/*globals module*/ //Stop complaining about module being undefined!
module.exports.showConfigWindow = showConfigWindow;
module.exports.processConfig = processConfig;
module.exports.sendSettings = sendSettings;

function showConfigWindow() {
  //Suppress warnings about line continuations used in embedded config html
  /* jshint multistr: true */
  var configPage = "\
<html><head>\n\
<style>\n\
input[type=text], input[type=password] {\n\
  height: 44px;\n\
  font-size: 17px;\n\
}\n\
input[type=checkbox], input[type=radio] {\n\
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
      'show_found': document.getElementById(\"show_found\").checked,\n\
      'metric': document.getElementById(\"metric\").checked\n\
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
</tr><tr>\n\
<td>Metric</td>\n\
<td><input type=\"radio\" value=\"metric\" name=\"units\" id=\"metric\"" + (localStorage.getItem("metric") === "true" ? " checked" : "") + "></td>\n\
</tr><tr>\n\
<td>Imperial</td>\n\
<td><input type=\"radio\" value=\"imperial\" name=\"units\" id=\"imperial\"" + (localStorage.getItem("metric") === "false" ? " checked" : "") + "></td>\n\
</tr></table>\n\
<input type=\"button\" value=\"Save\" id=\"saveButton\">\n\
</body></html><!--\
"; // Comment at end removes cloudpebble's querystring from appearing in html if used in emulator.
  
  // Turn warnings back on
  /* jshint multistr: false */
  
  console.log("Loading configuration page");
  Pebble.openURL("data:text/html," + encodeURIComponent(configPage));
}

function processConfig(e) {  
  if (e.response === "") {
    console.log("Configuration cancelled");
  } else {
    // Decode and parse config data as JSON
    var config_data = JSON.parse(decodeURIComponent(e.response));
    if (config_data.update_login) {
      if (
        (localStorage.getItem("username") === null) ||
        !helper.caseInsensitiveCompare(localStorage.getItem("username"), config_data.username)
      ) {
        localStorage.setItem("username", config_data.username);
      }
      localStorage.setItem("username", config_data.username);
      localStorage.setItem("password", config_data.password);
    }
    //explicitly convert boolean to string before saving because that forces it to lower case. Otherwise
    //emulator will converts to "True"/"False" when saving, and phone will convert to "true"/"false".
    localStorage.setItem("show_premium", config_data.show_premium.toString());
    localStorage.setItem("show_found", config_data.show_found.toString());
    localStorage.setItem("metric", config_data.metric.toString());

    console.log("Config updated");
    gc.logInToGeocaching();
  }
}

function sendSettings() {
  Pebble.sendAppMessage({
    'AppKeyUsername': localStorage.getItem("username"),
    // Localstorage is always a string, so need to compate to string "true"
    'AppKeyShowPremium': (localStorage.getItem("show_premium") === "true"),
    'AppKeyShowFound': (localStorage.getItem("show_found") === "true"),
    'AppKeyMetric': (localStorage.getItem("metric") === "true")
  }, function(e) {
    console.log('Sent settings to watch');
  }, function(e) {
    console.log('Failed to send settings to watch.' +
                ' Error is: ' + e.data.error.message);
  });
}