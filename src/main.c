#include <pebble.h>
#include "cache_direction_window.h"
#include "messaging.h"
#include "settings_window.h"

static void menu_window_init();


/*
TODO:
detect connection to phone going away
shrink message buffers and coords string array size (possibly?)
hide actionbar icons until phone connected
show time in status bar
make unusable unless credentials saved
display message if unable to log in
*/





typedef struct{
  char *geocode;
  char *name;
  char *distance;
} Geocache;
static Geocache s_geocaches[20];
static int numberOfGeocaches;

//Buffer for message recieved from javascript
static char s_message[1000];

//Buffer for coods recieved from JS
static char s_coords_msg[400];

//Main window
static Window *s_main_window;
static BitmapLayer *s_large_logo_layer;
static GBitmap *s_large_logo;
static ActionBarLayer *s_action_bar_layer;
static GBitmap *s_saved_icon;
static GBitmap *s_settings_icon;
static GBitmap *s_search_icon;
static TextLayer *s_status_layer;

//search results windw
static Window *s_menu_window;
static MenuLayer *s_menu_layer;






//------------------------------------------
//---------------Main Window----------------
//------------------------------------------

static void get_geocaches_click_handler(ClickRecognizerRef recognizer, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "I should get geocaches now...");
//   DictionaryIterator *iter;
//   app_message_outbox_begin(&iter);
//   const int dummy_val = 1;
//   dict_write_int(iter, AppKeyGetGeocaches, &dummy_val, sizeof(int), true);
//   dict_write_end(iter);
//   app_message_outbox_send();
  send_message(AppKeyGetGeocaches);
  text_layer_set_text(s_status_layer, "Getting geocaches...");
}

static void settings_click_handler() {
  send_message(AppKeyGetSettings);
}

static void main_window_click_config_provider(void *context) {
  // Register the ClickHandlers
  window_single_click_subscribe(BUTTON_ID_SELECT, get_geocaches_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, settings_click_handler);
}

static void main_window_load(Window *window) {
  
  // Get information about the Window
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  
  s_large_logo_layer = bitmap_layer_create(GRect(0, 0, bounds.size.w - ACTION_BAR_WIDTH, 104));
  s_large_logo = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_LARGE_LOGO);
  bitmap_layer_set_bitmap(s_large_logo_layer, s_large_logo);
  
  // Create the TextLayer with specific bounds
  s_status_layer = text_layer_create(
    GRect(0, 104, bounds.size.w - ACTION_BAR_WIDTH, bounds.size.h-104)
  );
  text_layer_set_text_alignment(s_status_layer, GTextAlignmentCenter);

  text_layer_set_text(s_status_layer, "Waiting for phone");
    
  // Add it as a child layer to the Window's root layer
  layer_add_child(window_layer, bitmap_layer_get_layer(s_large_logo_layer));
  layer_add_child(window_layer, text_layer_get_layer(s_status_layer));
  
  s_action_bar_layer = action_bar_layer_create();
  s_settings_icon = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_SETTINGS_ICON);
  s_search_icon = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_SEARCH_ICON);
  s_saved_icon = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_SAVED_ICON);
  action_bar_layer_set_icon(s_action_bar_layer, BUTTON_ID_UP, s_saved_icon);
  action_bar_layer_set_icon(s_action_bar_layer, BUTTON_ID_SELECT, s_search_icon);
  action_bar_layer_set_icon(s_action_bar_layer, BUTTON_ID_DOWN, s_settings_icon);
  action_bar_layer_add_to_window(s_action_bar_layer, s_main_window);
}

static void main_window_unload(Window *window) {
  // Destroy TextLayer
  gbitmap_destroy(s_large_logo);
  bitmap_layer_destroy(s_large_logo_layer);
  text_layer_destroy(s_status_layer);
  gbitmap_destroy(s_settings_icon);
  gbitmap_destroy(s_search_icon);
  gbitmap_destroy(s_saved_icon);
  action_bar_layer_remove_from_window(s_action_bar_layer);
  action_bar_layer_destroy(s_action_bar_layer);


}

static void main_window_init() {
  // Create main Window element and assign to pointer
  s_main_window = window_create();
  
  // Set handlers to manage the elements inside the Window
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = main_window_load,
    .unload = main_window_unload
  });

  // Show the Window on the watch, with animated=true
  window_stack_push(s_main_window, true);
}

static void main_window_deinit() {
  // Destroy Window
  window_destroy(s_main_window);
}





//------------------------------------------
//---------------Menu Window----------------
//------------------------------------------

static void menu_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  // Use the row to specify which item will receive the select action
  int row = cell_index->row;
  APP_LOG(APP_LOG_LEVEL_DEBUG, "%s selected", s_geocaches[row].geocode);
  show_cache_direction_window(s_geocaches[cell_index->row].geocode);
}

static uint16_t menu_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  //Return number of non-empty records
  for (int i = 0; i < 20; i++) {
    if (strcmp(s_geocaches[i].geocode, "empty") == 0) {
      return i;
    }
  }
  //If there are no "empty" records, there must be a full 20
  return numberOfGeocaches;
}

static void menu_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  int row = cell_index->row;
  char *title = s_geocaches[row].name;
  char subtitle[20];
  snprintf(subtitle, 20, "%s - %s", s_geocaches[row].geocode, s_geocaches[row].distance);
  menu_cell_basic_draw(ctx, cell_layer, title, subtitle, NULL);
}

static void menu_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  s_menu_layer = menu_layer_create(bounds);
  
  menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks){
    .get_num_rows = menu_get_num_rows_callback,
    .draw_row = menu_draw_row_callback,
    .select_click = menu_select_callback,
  });

  // Bind the menu layer's click config provider to the window for interactivity
  menu_layer_set_click_config_onto_window(s_menu_layer, window);
  layer_add_child(window_layer, menu_layer_get_layer(s_menu_layer));
}

static void menu_window_unload(Window *window) {
  // Destroy MenuLayer
  menu_layer_destroy(s_menu_layer);
  window_destroy(s_menu_window);

}

static void menu_window_init() {
  // Create menu Window element and assign to pointer
  s_menu_window = window_create();
  
  // Set handlers to manage the elements inside the Window
  window_set_window_handlers(s_menu_window, (WindowHandlers) {
    .load = menu_window_load,
    .unload = menu_window_unload
  });

  // Show the Window on the watch, with animated=true
  window_stack_push(s_menu_window, true);
  //Turn on light in case it too so long to get results that it had gone dark
  light_enable_interaction();
  //Vibrate to indicate that results are ready in case it took ages
  vibes_short_pulse();
  text_layer_set_text(s_status_layer, "");
}

//------------------------------------------
//----------------Messaging-----------------
//------------------------------------------

//splits a string at a delimiter. Returns first token and advances source pointer to start of next token
char * getToken(char **source, char delim) {
  //Set token to start of string
  char *token = *source;
  //Skip original string forwards to delim
  while (**source != delim && **source != 0) ++*source;
  //Replace delim with null so token stops there
  **source = '\0';
  //Advance original string past null to beginning of next token
  ++*source;
  //return token
  return token;
}

void geocacheListToArray(char * list) {
  
  for (int i = 0; i < 20; i++) {
    char * geocache = getToken(&list, (char)30);
    char *geocode = getToken(&geocache, (char)31);
    char *name = getToken(&geocache, (char)31);
    char *distance = geocache;    
    s_geocaches[i] = (Geocache){
      .geocode = geocode,
      .name = name,
      .distance = distance,
    };
  }
  
  numberOfGeocaches = 20;

}



static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Watch recieved a message");

  Tuple *ready_tuple = dict_find(iter, AppKeyReady);
  Tuple *geocache_list_tuple = dict_find(iter, AppKeyGeocacheList);
  Tuple *coords_tuple = dict_find(iter, AppKeyCoords);
  Tuple *username_tuple = dict_find(iter, AppKeyUsername);
  Tuple *show_premium_tuple = dict_find(iter, AppKeyShowPremium);
  Tuple *show_found_tuple = dict_find(iter, AppKeyShowFound);
  
  if(ready_tuple) {
    // PebbleKit JS is ready! Safe to send messages
    APP_LOG(APP_LOG_LEVEL_DEBUG, "...saying JS on phone is ready");
    text_layer_set_text(s_status_layer, "");
    //Make buttons on pebble do something now that it's ready
    //window_set_click_config_provider(s_main_window, main_window_click_config_provider);
    action_bar_layer_set_click_config_provider(s_action_bar_layer, main_window_click_config_provider);
    
  } else if(geocache_list_tuple) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "...containing a list of geocaches");
    strcpy(s_message, geocache_list_tuple->value->cstring);
    geocacheListToArray(s_message);
    //show menulist window
    menu_window_init();
    
  } else if(coords_tuple) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "...containing coords");
    strcpy(s_coords_msg, coords_tuple->value->cstring);
    show_geocache_coords(s_coords_msg);
    
  } else if(username_tuple) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "...containing settings");
    char* username = username_tuple->value->cstring;
    bool show_premium = *show_premium_tuple->value->data;
    bool show_found = *show_found_tuple->value->data;
    show_settings_window(username, show_premium, show_found);
  }
}





//------------------------------------------
//------------------Main--------------------
//------------------------------------------

int main(void) {
  // Register callback for app messaging
  app_message_register_inbox_received(inbox_received_handler);
  app_message_open(1000, 100);
  
  main_window_init();
  app_event_loop();
  main_window_deinit();
}
