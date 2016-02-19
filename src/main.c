#include <pebble.h>

typedef enum {
  AppKeyReady = 0
} AppKey;

static Window *s_main_window;
static TextLayer *s_title_layer;
static TextLayer *s_message_layer;
static TextLayer *s_status_layer;

static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *ready_tuple = dict_find(iter, AppKeyReady);
  if(ready_tuple) {
    // PebbleKit JS is ready! Safe to send messages
    APP_LOG(APP_LOG_LEVEL_DEBUG, "PebbleKit JS is ready!");
    text_layer_set_text(s_status_layer, "Connected to Phone");
    
  }
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
  
  // Improve the layout to be more like a watchface
  //text_layer_set_background_color(s_time_layer, GColorClear);
  //text_layer_set_text_color(s_time_layer, GColorBlack);
  text_layer_set_text(s_title_layer, "GC Finder");
  text_layer_set_text(s_message_layer, "Please wait");
  text_layer_set_text(s_status_layer, "Connecting to Phone");
  //text_layer_set_text(s_status_layer, "");
  //text_layer_set_font(s_time_layer, fonts_get_system_font(FONT_KEY_BITHAM_42_BOLD));
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

static void init() {
  // Create main Window element and assign to pointer
  s_main_window = window_create();
  
  // Set handlers to manage the elements inside the Window
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = main_window_load,
    .unload = main_window_unload
  });
  
  // Show the Window on the watch, with animated=true
  window_stack_push(s_main_window, true);
  
  // Register callback for app messaging
  app_message_register_inbox_received(inbox_received_handler);
  app_message_open(APP_MESSAGE_INBOX_SIZE_MINIMUM, APP_MESSAGE_OUTBOX_SIZE_MINIMUM);
}

static void deinit() {
  // Destroy Window
  window_destroy(s_main_window);
}


int main(void) {
  init();
  app_event_loop();
  deinit();
}
