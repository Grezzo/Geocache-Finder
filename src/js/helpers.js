/*globals module*/ //Stop complaining about module being undefined!
module.exports.htmlUnescape = htmlUnescape;
module.exports.getDecimalDegrees = getDecimalDegrees;
module.exports.caseInsensitiveCompare = caseInsensitiveCompare;
module.exports.combineArrays = combineArrays;

function htmlUnescape(string) {
  console.log(string);
  string = string.replace("&amp;", "&");
  string = string.replace("&#39;", "'");
  //could do this better. especially with numbers! Maybe get a list of entities from a node.js library
  //TODO: is &#39; not escaped if it's at the beginning like 'Hampshire Hoggin'?
  //also "#" at the beginnign seems to be dropped, see "#2 Villager: John Edgar"
  console.log("...changed to" + string);
  return string;
}

function getDecimalDegrees(coords) {
  var latParts = coords.match(/(N|S) (\d+)° (\d+\.*\d*)/);
  var lonParts = coords.match(/(E|W) (\d+)° (\d+\.*\d*)/);
  var lat = (latParts[1] === "N" ? 1 : -1) * (parseInt(latParts[2], 10) + (parseFloat(latParts[3]) / 60));
  var lon = (lonParts[1] === "E" ? 1 : -1) * (parseInt(lonParts[2], 10) + (parseFloat(lonParts[3]) / 60));
  coords = {latitude: lat, longitude: + lon};
  return coords;
}

function caseInsensitiveCompare(str1, str2) {
  return (str1.toUpperCase() === str2.toUpperCase());
}

function combineArrays(array1, array2) {
  array2.forEach(function(geocache) {
    array1.push(geocache);
  });
  return array1;
}