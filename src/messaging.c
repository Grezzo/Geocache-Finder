#include <pebble.h>
#include "messaging.h"
#include "windows/home.h"
#include "windows/cache_list.h"
#include "windows/settings.h"
#include "windows/cache_details.h"

//Buffer for message recieved from javascript
static char s_message[1000];


//----------------------------
//-----Recieving messages-----
//----------------------------

void inbox_received_handler(DictionaryIterator *iter, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Watch recieved a message");

  Tuple *ready_tuple = dict_find(iter, AppKeyReady);
  Tuple *geocache_list_tuple = dict_find(iter, AppKeyGeocacheList);
  Tuple *username_tuple = dict_find(iter, AppKeyUsername);
  Tuple *show_premium_tuple = dict_find(iter, AppKeyShowPremium);
  Tuple *show_found_tuple = dict_find(iter, AppKeyShowFound);
  Tuple *distance_tuple = dict_find(iter, AppKeyDistance);
  Tuple *bearing_tuple = dict_find(iter, AppKeyBearing);

  if(ready_tuple) {
    // PebbleKit JS is ready! Safe to send messages
    APP_LOG(APP_LOG_LEVEL_DEBUG, "...saying JS on phone is ready");
    update_home_status_text("");
    //Make buttons on pebble do something now that it's ready
    //window_set_click_config_provider(s_main_window, main_window_click_config_provider);
    enable_action_bar();
    
  } else if(geocache_list_tuple) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "...containing a list of geocaches");
    strcpy(s_message, geocache_list_tuple->value->cstring);
    geocacheListToArray(s_message);
    //show menulist window
    cache_list_init();
    
  } else if(username_tuple) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "...containing settings");
    char* username = username_tuple->value->cstring;
    bool show_premium = *show_premium_tuple->value->data;
    bool show_found = *show_found_tuple->value->data;
    show_settings_window(username, show_premium, show_found);
    
  } else if(distance_tuple) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "...containing distance, bearing & accuracy");
    update_location_details(
      distance_tuple->value->cstring,
      bearing_tuple->value->int32
    );
  } else {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "...but it's not recognised and will be ignored");
  }
}



//----------------------------
//------Sending messages------
//----------------------------

void send_message(const uint32_t key) {
  send_message_with_int(key, 1);
}

void send_message_with_int(const uint32_t key, int value) {
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  dict_write_int(iter, key, &value, sizeof(int), true);
  dict_write_end(iter);
  app_message_outbox_send();
}

void send_message_with_string(const uint32_t key, const char *const string) {
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  dict_write_cstring(iter, key, string);
  dict_write_end(iter);
  app_message_outbox_send();
}