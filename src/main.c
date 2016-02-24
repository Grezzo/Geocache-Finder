#include <pebble.h>

/*
TODO:
detect connection to phone going away
change text before screen changes to menu
*/

typedef enum {
  AppKeyReady = 0,
  AppKeyGetGeocaches,
  AppKeyGeocacheList
} AppKey;

static Window *s_main_window;
static TextLayer *s_title_layer;
static TextLayer *s_message_layer;
static TextLayer *s_status_layer;

static Window *s_menu_window;
static MenuLayer *s_menu_layer;
static char s_message[1000];



//------------------------------------------
//---------------Main Window----------------
//------------------------------------------

static void get_geocaches_click_handler(ClickRecognizerRef recognizer, void *context) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "I should get geocaches now...");
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  const int dummy_val = 1;
  dict_write_int(iter, AppKeyGetGeocaches, &dummy_val, sizeof(int), true);
  dict_write_end(iter);
  app_message_outbox_send();
  text_layer_set_text(s_status_layer, "Getting nearest geocaches...");
}

static void main_window_click_config_provider(void *context) {
  // Register the ClickHandlers
  window_single_click_subscribe(BUTTON_ID_DOWN, get_geocaches_click_handler);
}

static void main_window_load(Window *window) {
  
  // Get information about the Window
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  
  // Create the TextLayer with specific bounds
  s_title_layer = text_layer_create(
    GRect(0, 0, bounds.size.w, 50)
  );
  s_message_layer = text_layer_create(
    GRect(0, 50, bounds.size.w, 50)
  );
  s_status_layer = text_layer_create(
    GRect(0, 100, bounds.size.w, 50)
  );
  
  //text_layer_set_background_color(s_time_layer, GColorClear);
  //text_layer_set_text_color(s_time_layer, GColorBlack);
  text_layer_set_text(s_title_layer, "Geocache Finder");
  text_layer_set_text(s_message_layer, "Please wait");
  text_layer_set_text(s_status_layer, "Waiting for phone connection");
  //text_layer_set_text_alignment(s_time_layer, GTextAlignmentCenter);
  
  // Add it as a child layer to the Window's root layer
  layer_add_child(window_layer, text_layer_get_layer(s_title_layer));
  layer_add_child(window_layer, text_layer_get_layer(s_message_layer));
  layer_add_child(window_layer, text_layer_get_layer(s_status_layer));
}

static void main_window_unload(Window *window) {
  // Destroy TextLayer
  text_layer_destroy(s_title_layer);
  text_layer_destroy(s_message_layer);
  text_layer_destroy(s_status_layer);

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

static uint16_t menu_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  return 3;
}

static void menu_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {

  // Use the row to specify which item we'll draw
  switch (cell_index->row) {
    case 0:
    // This is a basic menu item with a title and subtitle
    menu_cell_basic_draw(ctx, cell_layer, "Basic Item", "With a subtitle", NULL);
    break;
    case 1:
    // This is a basic menu item with a title and subtitle
    menu_cell_basic_draw(ctx, cell_layer, "Icon Item", "Select to cycle", NULL);
    break;
    case 2:
    // Here we use the graphics context to draw something different
    // In this case, we show a strip of a watchface's background
    menu_cell_basic_draw(ctx, cell_layer, "Icon Item", "Select to run", NULL);
    break;
  }
}

static void menu_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  s_menu_layer = menu_layer_create(bounds);
  
  menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks){
    .get_num_rows = menu_get_num_rows_callback,
    .draw_row = menu_draw_row_callback, //must implement
    //.select_click = menu_select_callback,  //Selects will be ignored
  });

  // Bind the menu layer's click config provider to the window for interactivity
  menu_layer_set_click_config_onto_window(s_menu_layer, window);
  layer_add_child(window_layer, menu_layer_get_layer(s_menu_layer));
}

static void menu_window_unload(Window *window) {
  // Destroy MenuLayer
  menu_layer_destroy(s_menu_layer);
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
}

static void menu_window_deinit() {
  // Destroy Window
  window_destroy(s_menu_window);
}






//------------------------------------------
//----------------Messaging-----------------
//------------------------------------------

static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *ready_tuple = dict_find(iter, AppKeyReady);
  Tuple *geocache_list_tuple = dict_find(iter, AppKeyGeocacheList);
  
  
  
  if(ready_tuple) {
    // PebbleKit JS is ready! Safe to send messages
    APP_LOG(APP_LOG_LEVEL_DEBUG, "PebbleKit JS is ready!");
    text_layer_set_text(s_status_layer, "Connected to Phone");
    //Make buttons on pebble do something now that it's ready
    window_set_click_config_provider(s_main_window, main_window_click_config_provider);
  } else if(geocache_list_tuple) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Got a list of geocaches");
    strcpy(s_message, geocache_list_tuple->value->cstring);
    APP_LOG(APP_LOG_LEVEL_DEBUG, s_message);
    //show menulist window here
    menu_window_init();
  }
}





//------------------------------------------
//------------------Main--------------------
//------------------------------------------

int main(void) {
  // Register callback for app messaging
  app_message_register_inbox_received(inbox_received_handler);
  //app_message_open(app_message_inbox_size_maximum(), APP_MESSAGE_OUTBOX_SIZE_MINIMUM);
  //app_message_open(APP_MESSAGE_INBOX_SIZE_MINIMUM, APP_MESSAGE_OUTBOX_SIZE_MINIMUM);
  app_message_open(1000, 1000);
  char buffer [50];
  snprintf(buffer, 50, "buffer is %lu", (unsigned long)app_message_inbox_size_maximum());
  APP_LOG(APP_LOG_LEVEL_DEBUG, buffer);
  snprintf(buffer, 50, "buffer is %d", APP_MESSAGE_INBOX_SIZE_MINIMUM);
  APP_LOG(APP_LOG_LEVEL_DEBUG, buffer);
  main_window_init();
  app_event_loop();
  main_window_deinit();
}
